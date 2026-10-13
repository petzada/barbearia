# platform

Infraestrutura transversal: `db`, `context`, `auth`, `authz`, `errors`, `money`, `time`, `ids`, `audit`, `logging`, `jobs`, `outbox`, `inbox`, `external-ops`, `recovery`, `observability`.

- Dono: T02 (contratos e núcleo) e T03 (durabilidade). T01 só cria `db` (cliente e trava de banco descartável) e `logging`.
- Não contém regra de negócio. Módulos dependem de `platform`; `platform` nunca depende de `modules`.
