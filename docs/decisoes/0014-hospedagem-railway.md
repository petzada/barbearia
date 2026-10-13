# 0014 — Hospedagem tudo no Railway; Supabase fora

- **Data:** 2026-10-13
- **Status:** aceita
- **Detalha:** [0006](0006-monolito-typescript-tailwind-postgres.md)

## Contexto
As opções eram Railway ou Cloudflare Workers/Pages com Supabase. O WhatsMiau é serviço gerenciado (WhatsMiau Cloud, https://whatsmiau.dev/docs/getting-started), então não precisa ser hospedado por nós.

## Decisão
- **Railway** hospeda tudo do monolito: **aplicação**, **Postgres** e **worker de jobs** (renovação, lembretes, reprocessamento de webhooks).
- **Auth roda dentro do monolito**, com as tabelas no mesmo Postgres do Railway.
- **Supabase não será usado.**
- Arquivos continuam no **Cloudflare R2** ([0007](0007-storage-cloudflare-r2.md)).

## Consequências
- Por barbearia: um projeto Railway, um bucket R2, a(s) instância(s) WhatsMiau ([0031](0031-whatsmiau-planos-e-numeros-por-fase.md)) e as contas de pagamento definidas em [0030](0030-contas-dos-provedores-de-pagamento-por-fase.md).
- Backup do Postgres é responsabilidade nossa: configurar os backups do Railway e testar a restauração antes de ter dinheiro de cliente no banco.

## Revisão adversarial (2026-10-13)
- Railway mantido. O teste de recuperação passa a incluir a conciliação com os provedores ([0078](0078-versoes-por-etapas-e-recuperacao-com-conciliacao.md)).
