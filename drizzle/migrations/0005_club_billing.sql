CREATE TABLE `payment_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text DEFAULT 'abacatepay' NOT NULL,
	`card_token` text NOT NULL,
	`brand` text,
	`last_four` text,
	`consent_at` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`dev_mode` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `payment_methods_user_idx` ON `payment_methods` (`user_id`,`active`);--> statement-breakpoint
ALTER TABLE `payments` ADD `idempotency_key` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `cycle_start` integer;--> statement-breakpoint
ALTER TABLE `payments` ADD `attempt` integer;--> statement-breakpoint
ALTER TABLE `payments` ADD `failure_reason` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `card_brand` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `card_last_four` text;--> statement-breakpoint
CREATE UNIQUE INDEX `payments_idempotency_key_unique` ON `payments` (`idempotency_key`);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `payment_method` text;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `payment_method_id` text REFERENCES payment_methods(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `price_cents` integer;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `current_period_start` integer;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `cancel_at_period_end` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `next_charge_at` integer;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `retry_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `last_charge_error` text;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `past_due_since` integer;--> statement-breakpoint
CREATE INDEX `subscriptions_next_charge_idx` ON `subscriptions` (`status`,`next_charge_at`);--> statement-breakpoint
ALTER TABLE `user` ADD `tax_id` text;--> statement-breakpoint
ALTER TABLE `user` ADD `billing_email` text;--> statement-breakpoint
-- Assinaturas existentes: forma de cobrança explícita e valor fixado (o servidor passa a gerenciar as renovações).
UPDATE `subscriptions` SET `payment_method` = CASE WHEN `provider` = 'manual' THEN 'MANUAL' WHEN `method` = 'PIX' THEN 'PIX' ELSE 'CARD' END WHERE `payment_method` IS NULL;--> statement-breakpoint
UPDATE `subscriptions` SET `price_cents` = (SELECT `price_cents` FROM `plans` WHERE `plans`.`id` = `subscriptions`.`plan_id`) WHERE `price_cents` IS NULL;--> statement-breakpoint
-- Cartão sem token salvo: a 1ª tentativa falha e o cliente recebe o link para cadastrar o cartão. Pix: gerado 3 dias antes.
UPDATE `subscriptions` SET `next_charge_at` = CASE WHEN `payment_method` = 'PIX' THEN `current_period_end` - 259200000 ELSE `current_period_end` END WHERE `status` = 'active' AND `payment_method` IN ('CARD', 'PIX') AND `current_period_end` IS NOT NULL;
