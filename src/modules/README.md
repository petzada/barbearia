# modules

Um diretório por módulo de negócio: `modules/<modulo>/`.

```
domain/        puro: sem infra, UI, SDK nem `any` (lint falha)
application/   casos de uso e transações; chama ports
infra/         repositórios (Drizzle)
schema.ts      tabelas do módulo
events.ts      eventos de domínio do módulo
errors.ts      códigos de erro com prefixo (ex.: SCHEDULING.SLOT_UNAVAILABLE)
server.ts      server functions (sempre via defineCommand/defineQuery, T02)
ui/            componentes do módulo
index.ts       API pública; é a única porta de entrada para outros módulos
```

Regras: módulos se falam por `index.ts` ou por eventos; nunca importam `infra` de outro módulo (lint). Dentro do próprio módulo, use import relativo.
