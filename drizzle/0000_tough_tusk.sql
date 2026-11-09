CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`reason` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`review` text NOT NULL,
	`date` text NOT NULL,
	`total` integer NOT NULL,
	`portions` integer NOT NULL,
	`people` integer NOT NULL,
	`unit` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `offerings` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`meal` text NOT NULL,
	`vegetarian` integer NOT NULL,
	`status` text NOT NULL,
	`owner` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `offering_identity` ON `offerings` (`restaurant`,`type`,`name`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`mime` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`target` text NOT NULL,
	`reason` text NOT NULL,
	`status` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`city` text NOT NULL,
	`district` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`hours` text NOT NULL,
	`front` text NOT NULL,
	`status` text NOT NULL,
	`owner` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`offering` text NOT NULL,
	`owner` text NOT NULL,
	`author` text NOT NULL,
	`date` text NOT NULL,
	`total` integer NOT NULL,
	`portions` integer NOT NULL,
	`people` integer NOT NULL,
	`unit` text NOT NULL,
	`rating` integer NOT NULL,
	`taste` text NOT NULL,
	`portion` text NOT NULL,
	`value` text NOT NULL,
	`photos` text NOT NULL,
	`sponsored` integer NOT NULL,
	`status` text NOT NULL,
	`reason` text NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_review` ON `reviews` (`owner`,`offering`);--> statement-breakpoint
CREATE TABLE `saves` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`target` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_save` ON `saves` (`owner`,`kind`,`target`);--> statement-breakpoint
CREATE TABLE `food_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`status` text NOT NULL,
	`owner` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `types_key` ON `food_types` (`key`);--> statement-breakpoint
CREATE TABLE `votes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`review` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_vote` ON `votes` (`owner`,`review`);