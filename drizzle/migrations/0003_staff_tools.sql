CREATE TABLE `barber_hours` (
	`barber_id` text NOT NULL,
	`weekday` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`is_off` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`barber_id`, `weekday`),
	FOREIGN KEY (`barber_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "barber_hours_weekday_range" CHECK("barber_hours"."weekday" between 0 and 6),
	CONSTRAINT "barber_hours_end_after_start" CHECK("barber_hours"."is_off" = 1 or "barber_hours"."end_time" > "barber_hours"."start_time")
);
--> statement-breakpoint
CREATE TABLE `commission_payouts` (
	`id` text PRIMARY KEY NOT NULL,
	`barber_id` text NOT NULL,
	`period_from` text NOT NULL,
	`period_to` text NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`entries_count` integer DEFAULT 0 NOT NULL,
	`method` text NOT NULL,
	`note` text,
	`paid_at` integer NOT NULL,
	`recorded_by_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`barber_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`recorded_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `commission_payouts_barber_idx` ON `commission_payouts` (`barber_id`,`paid_at`);--> statement-breakpoint
CREATE TABLE `shop_closures` (
	`date_key` text PRIMARY KEY NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_invites` (
	`phone_number` text PRIMARY KEY NOT NULL,
	`is_barber` integer DEFAULT true NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`invited_by_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`invited_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `schedule_entries` ADD `payout_id` text;--> statement-breakpoint
ALTER TABLE `user` ADD `is_walk_in` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `whatsapp_config` ADD `reminder_hour` integer DEFAULT 8 NOT NULL;