CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `business_hours` (
	`weekday` integer PRIMARY KEY NOT NULL,
	`open_time` text NOT NULL,
	`close_time` text NOT NULL,
	`is_closed` integer DEFAULT false NOT NULL,
	CONSTRAINT "business_hours_weekday_range" CHECK("business_hours"."weekday" between 0 and 6),
	CONSTRAINT "business_hours_close_after_open" CHECK("business_hours"."is_closed" = 1 or "business_hours"."close_time" > "business_hours"."open_time")
);
--> statement-breakpoint
CREATE TABLE `feedbacks` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`client_id` text NOT NULL,
	`barber_id` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `schedule_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`barber_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "feedbacks_rating_range" CHECK("feedbacks"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feedbacks_entry_id_unique` ON `feedbacks` (`entry_id`);--> statement-breakpoint
CREATE INDEX `feedbacks_barber_idx` ON `feedbacks` (`barber_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`kind` text NOT NULL,
	`entry_id` text,
	`subscription_id` text,
	`provider` text NOT NULL,
	`method` text NOT NULL,
	`provider_id` text,
	`amount_cents` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`br_code` text,
	`br_code_base64` text,
	`expires_at` integer,
	`paid_at` integer,
	`recorded_by_id` text,
	`dev_mode` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`entry_id`) REFERENCES `schedule_entries`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`recorded_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "payments_amount_non_negative" CHECK("payments"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_provider_id_unique` ON `payments` (`provider_id`);--> statement-breakpoint
CREATE INDEX `payments_entry_idx` ON `payments` (`entry_id`);--> statement-breakpoint
CREATE INDEX `payments_subscription_idx` ON `payments` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `payments_paid_at_idx` ON `payments` (`status`,`paid_at`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price_cents` integer NOT NULL,
	`cycle` text DEFAULT 'MONTHLY' NOT NULL,
	`benefits` text DEFAULT '[]' NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`provider_product_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plans_slug_unique` ON `plans` (`slug`);--> statement-breakpoint
CREATE TABLE `rate_limit` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`count` integer NOT NULL,
	`last_request` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rate_limit_key_unique` ON `rate_limit` (`key`);--> statement-breakpoint
CREATE TABLE `schedule_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`barber_id` text NOT NULL,
	`type` text NOT NULL,
	`client_id` text,
	`service_id` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`status` text DEFAULT 'booked' NOT NULL,
	`note` text,
	`price_cents` integer,
	`payment_method` text,
	`payment_status` text,
	`commission_percent` integer,
	`commission_cents` integer,
	`completed_at` integer,
	`completed_by_id` text,
	`cancelled_at` integer,
	`cancelled_by_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`barber_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`client_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`completed_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`cancelled_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "schedule_entries_ends_after_start" CHECK("schedule_entries"."ends_at" > "schedule_entries"."starts_at"),
	CONSTRAINT "schedule_entries_appointment_has_service" CHECK("schedule_entries"."type" = 'block' or ("schedule_entries"."service_id" is not null and "schedule_entries"."client_id" is not null))
);
--> statement-breakpoint
CREATE INDEX `schedule_entries_barber_start_idx` ON `schedule_entries` (`barber_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `schedule_entries_client_start_idx` ON `schedule_entries` (`client_id`,`starts_at`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`duration_minutes` integer NOT NULL,
	`price_cents` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "services_duration_positive" CHECK("services"."duration_minutes" > 0),
	CONSTRAINT "services_price_non_negative" CHECK("services"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `shop_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`shop_name` text DEFAULT 'Barbearia do Moura' NOT NULL,
	`phone` text,
	`address` text,
	`instagram` text,
	`slot_interval_minutes` integer DEFAULT 30 NOT NULL,
	`min_lead_minutes` integer DEFAULT 30 NOT NULL,
	`booking_window_days` integer DEFAULT 30 NOT NULL,
	`cancel_until_minutes` integer DEFAULT 120 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`provider` text NOT NULL,
	`method` text,
	`provider_checkout_id` text,
	`provider_checkout_url` text,
	`provider_subscription_id` text,
	`started_at` integer,
	`current_period_end` integer,
	`cancelled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_provider_checkout_id_unique` ON `subscriptions` (`provider_checkout_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_provider_subscription_id_unique` ON `subscriptions` (`provider_subscription_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_user_idx` ON `subscriptions` (`user_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_one_active_per_user` ON `subscriptions` (`user_id`) WHERE "subscriptions"."status" = 'active';--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`phone_number` text,
	`phone_number_verified` integer,
	`profile_completed` integer DEFAULT false NOT NULL,
	`is_barber` integer DEFAULT false NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`accepting_bookings` integer DEFAULT true NOT NULL,
	`commission_percent` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_phone_number_unique` ON `user` (`phone_number`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`event` text NOT NULL,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `whatsapp_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`instance_id` text,
	`instance_name` text,
	`status` text DEFAULT 'not_configured' NOT NULL,
	`phone_connected` text,
	`qr_code` text,
	`last_sync_at` integer,
	`reminders_enabled` integer DEFAULT true NOT NULL,
	`reminder_template` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `whatsapp_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`entry_id` text,
	`to_phone` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`message` text,
	`error` text,
	`provider_message_id` text,
	`dedupe_key` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `schedule_entries`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `whatsapp_logs_dedupe_key_unique` ON `whatsapp_logs` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `whatsapp_logs_created_idx` ON `whatsapp_logs` (`created_at`);