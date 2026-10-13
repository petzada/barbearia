# 0006 — Monolito em TypeScript + Tailwind + Postgres

- **Data:** 2026-10-13
- **Status:** aceita

## Decisão
- A aplicação é um **monolito**: front, back, webhooks e jobs no **mesmo repositório e no mesmo projeto Railway**, rodando como processo web e processo worker ([0016](0016-fila-de-jobs-pg-boss.md)).
- **TypeScript** em tudo, **Tailwind** na interface e **Postgres** como banco.
- Auth feito com framework/biblioteca dentro do próprio monolito (não um serviço separado): Better Auth ([0015](0015-tanstack-start-better-auth-drizzle.md)).

## Consequências
- Hospedagem: Railway ([0014](0014-hospedagem-railway.md)). Framework, auth e ORM: TanStack Start, Better Auth e Drizzle ([0015](0015-tanstack-start-better-auth-drizzle.md)). Fila de jobs: pg-boss ([0016](0016-fila-de-jobs-pg-boss.md)).

## Revisão adversarial (2026-10-13)
- Texto harmonizado com a [0016](0016-fila-de-jobs-pg-boss.md): mesmo repositório e mesmo projeto Railway, com processo web e processo worker. Sem mudança de arquitetura.
