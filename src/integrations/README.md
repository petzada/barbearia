# integrations

Adapters dos ports publicados por T02: `mercado-pago`, `woovi`, `whatsmiau`, `web-push`, `r2`.

- Implementam ports; nunca são importados por `domain`.
- Cada adapter tem testes de contrato contra fixtures sanitizadas e contra o fake do mesmo port.
- O worker importa `integrations/*/jobs.ts` no boot pelo scanner de `loadModuleJobs`; adapters registram ali seus handlers de inbox, operações externas e filas compartilhadas.
- Segredos só por variáveis de ambiente; nada de credencial no repositório.
