# 0082 — Ambiente de desenvolvimento sem Docker: Postgres no Railway

- **Data:** 2026-10-13
- **Status:** aceita
- **Origem:** resposta ao handoff H00 ("Não utilizamos Docker local para nada. Tudo no banco de produção.")
- **Altera:** T01 (itens 4 e 8: `docker-compose.yml`, `db:up`/`db:down`), H00 (Docker deixa de ser requisito)

## Contexto
O plano previa Postgres 17 local via Docker para desenvolvimento e testes de integração. O dono do produto não usa Docker; o banco disponível é o Postgres do projeto Railway `barbearia-staging` (ambiente Railway chamado `production`, serviços `web`, `worker`, `Postgres`).

## Decisão
Desenvolvimento e testes de integração usam o Postgres do Railway, sem Docker. Para não sujar o banco que o app implantado usa, o código usa **bancos separados no mesmo servidor**: `barbearia_dev` (desenvolvimento) e `barbearia_test` (testes de integração, pode ser zerado). O banco padrão do serviço (`railway`) fica para o deploy. As URLs vêm do Railway CLI para `.env.local` (não versionado); nunca vão para o chat nem para o git.

## Acesso (complemento, 2026-10-13)
O Postgres do Railway só tinha endereço interno. O dono do produto escolheu criar um **proxy TCP público** (`railway tcp-proxy create 5432`), gerando `DATABASE_PUBLIC_URL` (protegido por senha + TLS; reversível com `railway tcp-proxy delete`). Alternativa descartada: túnel SSH do CLI.

## Consequências
- Não há `docker-compose.yml`; `db:up`/`db:down` não existem (ou apenas verificam conectividade).
- `db:reset` e os testes só podem rodar contra um banco cujo nome termina em `_test` ou `_dev` (trava de segurança no código).
- Testes de integração dependem de rede; a máquina precisa estar logada no Railway CLI.
- Quando houver banco de produção real (T40/H05), ele será outro projeto/ambiente e jamais recebe testes.
