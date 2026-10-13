# platform

Infraestrutura transversal: `db`, `context`, `auth`, `authz`, `errors`, `money`, `time`, `ids`, `validation`, `audit`, `logging`, `idempotency`, `jobs`, `outbox`, `inbox`, `external-ops`, `recovery`, `observability`.

- Dono: **T02** (contratos e núcleo: `db`, `context`, `authz`, `errors`, `money`, `time`, `ids`, `validation`, `audit`, `logging`, `idempotency`) e T03 (durabilidade: `jobs`, `outbox`, `inbox`, `external-ops`, `recovery`). `auth` é de T04.
- Não contém regra de negócio. Módulos dependem de `platform`; `platform` nunca depende de `modules`.
- **Documentação e API pública: [`src/contracts/README.md`](../contracts/README.md).**

| Pasta                  | Responsabilidade                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `db`                   | pool, `withTransaction`, tipos `Db`/`Tx`, colunas padrão, `barbearias`, seed, `assertRevision`, trava de banco (D0082) |
| `context`              | `RequestContext`, `defineQuery`/`defineCommand`, registro, dispatcher (único `createServerFn`), `defineEvent`          |
| `authz`                | política, `requireRole`/`requireOwnership`/`requireRecentAuth`, allowlist pública                                      |
| `errors`               | `AppError`, `defineErrors`, erros genéricos, `Result` → HTTP                                                           |
| `idempotency`          | `chaves_idempotencia`, `withIdempotency`, `hashPayload`                                                                |
| `audit`                | `auditoria` (append-only), `auditWriter`                                                                               |
| `money`, `time`, `ids` | `Money`/basis points/BRL; `Clock`, fuso (Luxon), `addMonthsAnchored`, `cycleRange`; UUID v7                            |
| `validation`           | ambiente (`loadEnv`), mensagens e schemas Zod                                                                          |
| `logging`              | pino com redaction central                                                                                             |
