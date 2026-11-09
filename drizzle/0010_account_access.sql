CREATE TABLE account_access (
 google_uid text PRIMARY KEY NOT NULL,
 disabled integer NOT NULL DEFAULT 0,
 revoked_before integer NOT NULL DEFAULT 0
);
