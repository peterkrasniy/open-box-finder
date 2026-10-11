CREATE TABLE `acquisition_control` (
	`id` integer PRIMARY KEY NOT NULL,
	`lease_token` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`next_due_at` integer DEFAULT 0 NOT NULL,
	`quota_day` text DEFAULT '' NOT NULL,
	`daily_attempts` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `acquisition_events` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`acquired_at` integer NOT NULL,
	`outcome` text NOT NULL,
	`generation` text NOT NULL,
	`added` integer DEFAULT 0 NOT NULL,
	`changed` integer DEFAULT 0 NOT NULL,
	`removed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalog_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`revision` text NOT NULL,
	`updated_at` integer NOT NULL
);
