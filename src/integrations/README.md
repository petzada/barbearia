# integrations

Adapters dos ports publicados por T02: `mercado-pago`, `woovi`, `whatsmiau`, `web-push`, `r2`.

- Implementam ports; nunca são importados por `domain`.
- Cada adapter tem testes de contrato contra fixtures sanitizadas e contra o fake do mesmo port.
- Segredos só por variáveis de ambiente; nada de credencial no repositório.
