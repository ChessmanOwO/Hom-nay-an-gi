CREATE TABLE `place_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant` text NOT NULL,
	`owner` text NOT NULL,
	`author` text NOT NULL,
	`date` text NOT NULL,
	`rating` integer NOT NULL,
	`content` text NOT NULL,
	`media` text NOT NULL,
	`photo_count` integer NOT NULL,
	`video_count` integer NOT NULL,
	`sponsored` integer NOT NULL,
	`status` text NOT NULL,
	`reason` text NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_place_review` ON `place_reviews` (`owner`,`restaurant`);