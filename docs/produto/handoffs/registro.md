# Registro de handoffs

Uma linha por pedido e uma por resposta. Nunca registrar segredos.

| Data | Gate | Task | Tipo (pedido/resposta) | Resumo | Responsável | Evidência / critério de saída | Tasks desbloqueadas |
|---|---|---|---|---|---|---|---|
| 2026-10-13 | H01 | T00 | pedido | Responder H01-Q1…Q6 e confirmar INT-01…13 | Dono do produto | Cada Q respondida e cada INT confirmada/rejeitada; decisões 0082+ | Ramos de T15, T16, T19, T20, T21, T23, T24, T26, T28, T29 |
| 2026-10-13 | H02 | T00 | pedido | Começar a criar contas de teste (Railway staging, Mercado Pago, Woovi, WhatsMiau, Google OAuth, R2) | Dono do produto | Roteiro de T38 executado | T38 → T39 → T40 |
| 2026-10-13 | H03 | T00 | pedido | Aviso antecipado: pensar em retenção e em quem revisa Termos/Política; rascunhos virão de T33/T35 | Dono do produto (+ jurídico opcional) | Textos versionados, procedimento aprovado, matriz de retenção completa | Ativação em T33, T35; T40 |
| 2026-10-13 | H04 | T00 | pedido | Começar a juntar marca, serviços, preços, durações, equipe, matriz e jornadas | Dono da barbearia | `pnpm config:validate` sem erros + "prévia conferida" | T40 |
| 2026-10-13 | H00 | T01 | pedido | Instalar e iniciar Docker Desktop (Node 22.14.0, pnpm 10.32.1, git 2.52.0 já ok) | Dono do produto | `docker run --rm postgres:17 postgres --version` com sucesso | T01 e todo o plano de código |
| 2026-10-13 | H00 | T01 | resposta | "Não utilizamos Docker local; tudo no banco do Railway." Node 22.14.0, pnpm 10.32.1, git 2.52.0 ok; Railway CLI 5.41.2 logado | Dono do produto | D0082 | T01 |
| 2026-10-13 | H01 | T00 | resposta | Q1 texto próprio (preço avulso; combo só explícito) → D0083; Q2 A/A → D0084; Q3 B → D0085; Q4 C → D0086; Q5 A, Q6 A → D0087; INT-01…13 confirmadas → D0088 | Dono do produto | Decisões criadas, PRD §5.15 e tasks anotadas | Ramos de T15, T16, T19, T20, T21, T23, T24, T26, T28, T29 |
| 2026-10-13 | H02 | T00 | resposta parcial | Railway `barbearia-staging` criado (serviços web, worker, Postgres; ambiente Railway "production"); usar Railway CLI; domínio HTTPS em criação; demais contas sob demanda | Dono do produto | — | parcial para T12/T38 |
| 2026-10-13 | H03, H04 | T00 | resposta | Humano pediu para ignorar por enquanto | Dono do produto | — | — |
| 2026-10-13 | H00 | T01 | resposta | Postgres sem acesso externo; humano escolheu proxy TCP público (opção A) em vez de túnel SSH | Dono do produto | D0082 (complemento) | T01 |
| 2026-10-13 | H02 | — | resposta parcial | Humano entregou credenciais de teste (Better Auth, Google, Mercado Pago, Woovi, WhatsMiau, R2) no .env.local (não versionado). Orquestrador gravou 23 variáveis nos serviços web e worker do Railway barbearia-staging via CLI (--stdin, --skip-deploys): DATABASE_URL=${{Postgres.DATABASE_URL}} (banco interno do deploy), APP_URL=https://web-production-f0db.up.railway.app, NODE_ENV=production; sem DATABASE_URL_TEST | Dono do produto / Orquestrador | `railway variable list` sem falhas | T04, T08–T12, T38 (parcial) |
