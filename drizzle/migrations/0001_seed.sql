-- Dados iniciais obrigatórios: configurações (linha única), horário de
-- funcionamento, integração WhatsApp e catálogo base de serviços.
INSERT INTO `shop_settings` (`id`, `shop_name`, `address`, `updated_at`)
VALUES (1, 'Barbearia do Moura', 'Mauá/SP', 0);
--> statement-breakpoint
INSERT INTO `whatsapp_config` (`id`, `status`, `updated_at`)
VALUES (1, 'not_configured', 0);
--> statement-breakpoint
INSERT INTO `business_hours` (`weekday`, `open_time`, `close_time`, `is_closed`) VALUES
  (0, '09:00', '19:00', 1),
  (1, '09:00', '19:00', 0),
  (2, '09:00', '19:00', 0),
  (3, '09:00', '19:00', 0),
  (4, '09:00', '19:00', 0),
  (5, '09:00', '19:00', 0),
  (6, '09:00', '13:00', 0);
--> statement-breakpoint
INSERT INTO `services` (`id`, `name`, `description`, `duration_minutes`, `price_cents`, `active`, `sort_order`, `created_at`) VALUES
  ('svc-corte', 'Corte', 'Corte na tesoura ou máquina, com acabamento.', 30, 4500, 1, 0, 0),
  ('svc-barba', 'Barba', 'Barba com toalha quente e navalha.', 30, 3500, 1, 1, 0),
  ('svc-combo', 'Corte + Barba', 'O combo completo.', 60, 7500, 1, 2, 0);
