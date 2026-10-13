# 0019 — Replicação: um código, um deploy por barbearia, `barbearia_id` desde já

- **Data:** 2026-10-13
- **Status:** aceita (distribuição de versões por etapas em [0078](0078-versoes-por-etapas-e-recuperacao-com-conciliacao.md))
- **Substitui:** a ideia de "clonar o repositório por barbearia" de [0012](0012-uma-barbearia-agora-replicar-depois.md)

## Contexto
A ideia inicial era clonar o repositório para cada barbearia e trocar identidade visual e provedores. No review: forks divergem, toda correção (inclusive de segurança em pagamentos) teria de ser aplicada N vezes à mão, e juntar os forks para virar SaaS seria quase reescrever.

## Decisão
- **Um único repositório**, com **um deploy por barbearia**: um projeto Railway com app, Postgres e worker próprios.
- Tudo o que muda entre barbearias fica em **configuração**, nunca em código:
  - credenciais em variáveis de ambiente (Mercado Pago, Woovi, WhatsMiau, R2);
  - marca (nome, cores, logo no R2, textos) em tabela ou arquivo de configuração;
  - provedores de pagamento e de notificação escolhidos por config, via adapters.
- **UUID como chave primária** em todas as tabelas.
- **Coluna `barbearia_id` em todas as tabelas de negócio desde o início**, mesmo com uma barbearia por banco.

## Consequências
- ~~Um push atualiza todas as barbearias~~ → versões liberadas por etapas ([0078](0078-versoes-por-etapas-e-recuperacao-com-conciliacao.md)); migrations rodam em cada banco no deploy.
- Toda consulta filtra por `barbearia_id` e todo índice relevante começa por ela. Isso vale desde já, para a migração ao SaaS ser juntar bancos e não refatorar.
- O `barbearia_id` vem da configuração do deploy (não do cliente), dentro do mesmo middleware de servidor de [0015](0015-tanstack-start-better-auth-drizzle.md).

## Revisão adversarial (2026-10-13)
- Código único e isolamento mantidos. Versões por etapas em [0078](0078-versoes-por-etapas-e-recuperacao-com-conciliacao.md); mudança de conta de pagamento em [0057](0057-mudanca-de-conta-exige-migracao.md).
