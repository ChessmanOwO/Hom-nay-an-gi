CREATE TABLE IF NOT EXISTS "blocked_ips" (
 "ip" text PRIMARY KEY NOT NULL,
 "reason" text,
 "created" bigint NOT NULL
);
