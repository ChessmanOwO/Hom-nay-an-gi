CREATE TABLE `abuse_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `review_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`network` text NOT NULL,
	`restaurant` text NOT NULL,
	`target` text NOT NULL,
	`flags` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `abuse_account_window` ON `review_events` (`owner`,`created`);--> statement-breakpoint
CREATE INDEX `abuse_network_window` ON `review_events` (`network`,`restaurant`,`created`);--> statement-breakpoint
CREATE INDEX `abuse_review_flags` ON `review_events` (`target`,`created`);