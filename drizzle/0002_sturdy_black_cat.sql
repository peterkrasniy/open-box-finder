CREATE TABLE `source_preflight` (
	`source_id` text PRIMARY KEY NOT NULL,
	`checked_at` integer NOT NULL,
	`payload` text NOT NULL,
	`expires_at` integer NOT NULL
);
