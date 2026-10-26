ALTER TABLE `plans` ADD `covered_service_ids` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `allowed_weekdays` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `visits_per_cycle` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `terms_accepted_at` integer;--> statement-breakpoint
ALTER TABLE `user` ADD `terms_version` text;--> statement-breakpoint
INSERT OR IGNORE INTO `plans` (`id`, `slug`, `name`, `description`, `price_cents`, `cycle`, `benefits`, `active`, `highlighted`, `covered_service_ids`, `allowed_weekdays`, `visits_per_cycle`, `sort_order`, `created_at`, `updated_at`) VALUES
  ('plan-black', 'black', 'Black', 'Só corte de cabelo, qualquer dia da semana.', 12990, 'MONTHLY', '["4 cortes por mês","Qualquer dia da semana"]', 1, 0, '["svc-corte"]', '[]', 4, 0, 0, 0),
  ('plan-gold-limitado', 'gold-limitado', 'Gold Limitado', 'Corte e barba às terças e quartas.', 17990, 'MONTHLY', '["4 atendimentos de corte e barba por mês","Somente às terças e quartas"]', 1, 0, '["svc-corte","svc-barba","svc-combo"]', '[2,3]', 4, 1, 0, 0),
  ('plan-premium', 'premium', 'Premium', 'Corte e barba em qualquer dia da semana.', 19990, 'MONTHLY', '["4 atendimentos de corte e barba por mês","Qualquer dia da semana"]', 1, 1, '["svc-corte","svc-barba","svc-combo"]', '[]', 4, 2, 0, 0);
