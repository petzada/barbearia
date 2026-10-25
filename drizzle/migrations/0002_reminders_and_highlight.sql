ALTER TABLE `plans` ADD `highlighted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `whatsapp_reminders` integer DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE `shop_settings` SET `address` = 'Av. Queiroz Pedroso, 433 - Jd. Pedroso - Mauá/SP', `instagram` = 'barbeariadomoura' WHERE `id` = 1 AND (`address` IS NULL OR `address` = 'Mauá/SP');
