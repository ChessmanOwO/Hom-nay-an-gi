CREATE TABLE `app_sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `app_session_expiry` ON `app_sessions` (`expires`);--> statement-breakpoint
CREATE INDEX `app_session_user` ON `app_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `app_users` (
	`id` text PRIMARY KEY NOT NULL,
	`google_uid` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`created` integer NOT NULL,
	`last_login` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_google_uid` ON `app_users` (`google_uid`);