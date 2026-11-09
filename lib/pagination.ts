export function pageOptions(params: URLSearchParams) {
  const integer = (key: string, fallback: number, max: number) => {
    const value = Number(params.get(key) || fallback);
    return Number.isFinite(value) ? Math.min(max, Math.max(1, Math.floor(value))) : fallback;
  };
  const page = integer('page', 1, 1_000_000), limit = integer('limit', 24, 50);
  return { page, limit, offset: (page - 1) * limit };
}
export function paginate<T>(rows: T[], params: URLSearchParams) {
  const { page, limit, offset } = pageOptions(params);
  return { items: rows.slice(offset, offset + limit), total: rows.length, page, limit, hasMore: offset + limit < rows.length };
}
