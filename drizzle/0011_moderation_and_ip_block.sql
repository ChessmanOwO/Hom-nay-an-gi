CREATE TABLE IF NOT EXISTS blocked_ips (
  ip text PRIMARY KEY NOT NULL,
  reason text,
  created bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS account_access (
  google_uid text PRIMARY KEY NOT NULL,
  disabled integer NOT NULL DEFAULT 0,
  revoked_before bigint NOT NULL DEFAULT 0
);
