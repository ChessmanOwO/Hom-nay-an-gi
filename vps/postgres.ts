import {Pool, types, type PoolClient} from 'pg';
import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {DatabaseBinding, PreparedQuery} from '../lib/runtime';

types.setTypeParser(20, value => {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error('Database integer exceeds supported range');
  return number;
});

// Keep the shared API's bound parameters compatible with the D1 branch.
export function postgresSql(source: string): string {
  let index = 0;
  let quoted = false;
  let output = '';
  for (let i = 0; i < source.length; i++) {
    const character = source[i];
    if (character === "'") {
      output += character;
      if (quoted && source[i + 1] === "'") { output += source[++i]; continue; }
      quoted = !quoted;
    } else if (!quoted && /^LIKE\b/.test(source.slice(i)) && (i===0 || !/[a-zA-Z0-9_]/.test(source[i-1]))) {
      output += 'ILIKE'; i += 3;
    } else output += !quoted && character === '?' ? '$' + (++index) : character;
  }
  const ignored = /^INSERT OR IGNORE /i.test(output);
  output = output.replace(/^INSERT OR IGNORE /i, 'INSERT ');
  return ignored ? output + ' ON CONFLICT DO NOTHING' : output;
}

export class PostgresDatabase implements DatabaseBinding {
  readonly pool: Pool;
  constructor(url: string, max = 10) {
    if (!url) throw new Error('DATABASE_URL is required');
    if (!Number.isInteger(max) || max < 1 || max > 100) throw new Error('Invalid PG_POOL_MAX');
    this.pool = new Pool({connectionString:url, max, connectionTimeoutMillis:5000, idleTimeoutMillis:30000, statement_timeout:15000});
    this.pool.on('error', () => console.error('PostgreSQL idle connection failed'));
  }
  prepare(sql: string): PreparedQuery { return new PgQuery(this, sql); }
  async transaction<T>(operation: (client: PoolClient) => Promise<T>, write = true): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      // Shared write operations rely on conditional counts for anti-spam admission.
      // READ COMMITTED after the lock ensures the admitted writer sees the last commit.
      if (write) {
        await client.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
        await client.query('SELECT pg_advisory_xact_lock(180511)');
      }
      const value = await operation(client);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  async batch(queries: PreparedQuery[]) {
    const prepared = queries.map(query => {
      if (!(query instanceof PgQuery) || query.database !== this) throw new Error('Invalid database batch');
      return query;
    });
    return this.transaction(async client => {
      const results = [];
      for (const query of prepared) results.push(await query.execute(client));
      return results;
    }, prepared.some(query => query.write));
  }
  async migrate(directory: string) {
    await this.transaction(async client => {
      await client.query('CREATE TABLE IF NOT EXISTS _pg_migrations(name text PRIMARY KEY)');
      for (const name of (await readdir(directory)).filter(n => /^\d.*\.sql$/.test(n)).sort()) {
        if ((await client.query('SELECT name FROM _pg_migrations WHERE name=$1', [name])).rowCount) continue;
        await client.query(await readFile(join(directory, name), 'utf8'));
        await client.query('INSERT INTO _pg_migrations VALUES($1)', [name]);
      }
    });
  }
  close() { return this.pool.end(); }
}
class PgQuery implements PreparedQuery {
  constructor(readonly database: PostgresDatabase, readonly sql: string, readonly values: any[] = []) {}
  get write() { return !/^\s*SELECT\b/i.test(this.sql); }
  bind(...values: any[]) { return new PgQuery(this.database, this.sql, values); }
  async execute(client: Pick<PoolClient,'query'>) {
    const result = await client.query(postgresSql(this.sql), this.values);
    return {results:result.rows, meta:{changes:result.rowCount || 0}};
  }
  async all() { return this.write ? this.database.transaction(client => this.execute(client)) : this.execute(this.database.pool); }
  async first<T = any>(): Promise<T|null> { return (await this.all()).results[0] as T || null; }
  run() { return this.all(); }
}
