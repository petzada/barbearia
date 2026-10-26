# Barbearia do Moura

App de agendamento, gestão e assinaturas da Barbearia do Moura (Mauá/SP).
Unifica `barbeariadomoura` e `mourabarber`; as decisões de produto e de cada
tela estão em [`docs/DECISOES.md`](docs/DECISOES.md).

## Stack

- Next.js 16 (App Router, Server Actions) + React 19 + Tailwind 4 + shadcn (Base UI)
- Cloudflare: Workers via OpenNext, **D1** (Drizzle ORM), **R2** (fotos), Cron Trigger (lembretes e cobranças do clube)
- Login: código no WhatsApp (WhatsMiau) e Google, com Better Auth
- Pagamentos: AbacatePay — Pix avulso e Clube Moura com cartão (checkout
  transparente, `abacatepay.js`) ou Pix. As assinaturas e recobranças são
  gerenciadas pelo nosso servidor (sem produtos/assinaturas no AbacatePay)

## Rodando localmente

```bash
npm install
cp .dev.vars.example .dev.vars       # preencha o que for usar
npm run db:migrate:local             # cria o D1 local com dados iniciais
npm run dev                          # http://localhost:3000
```

Com `AUTH_DEV_OTP=123456` no `.dev.vars`, o código de login sai no log do
servidor e `123456` também é aceito (ignorado em produção). Telefones em
`ADMIN_PHONE_NUMBERS` viram admin + barbeiro no primeiro login.

## Testes

| Comando | O que roda |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` (rode `npx next typegen` antes se mudou rotas) |
| `npm test` | Vitest: unidade, integração com D1 real (Miniflare) e componentes (jsdom) |
| `npm run test:e2e` | Playwright contra `next dev` com um D1 descartável em `.wrangler/e2e` |
| `npm run check` | lint + typecheck + testes + build |

O E2E precisa da porta 3000 livre e do `.dev.vars` com `AUTH_DEV_OTP=123456`
e `ADMIN_PHONE_NUMBERS=5511999999999`.

## Deploy (Cloudflare)

```bash
npm run db:migrate:remote            # aplica as migrações no D1 de produção
wrangler secret put BETTER_AUTH_SECRET   # e os demais segredos do .dev.vars.example
npm run deploy                       # build OpenNext + deploy do Worker
```

Segredos do AbacatePay: `ABACATEPAY_API_KEY`, `ABACATEPAY_PUBLIC_KEY` (a `pk_…`
do formulário de cartão — **mesmo modo**, teste ou produção, da chave da API) e
`ABACATEPAY_WEBHOOK_SECRET`. Cadastre o webhook
`<APP_BASE_URL>/api/webhooks/abacatepay?webhookSecret=<segredo>` com os eventos
`transparent.completed`, `transparent.refunded`, `transparent.disputed` e
`transparent.lost`. `npm run setup` pergunta e grava tudo isso.

## Clube: cobranças

O Cron Trigger (de hora em hora) chama `/api/cron/lembretes` e
`/api/cron/assinaturas`. As regras ficam em `src/lib/club-billing.ts` e
`src/server/payments/subscriptions.ts`:

- **Cartão**: cobrado no fim do ciclo com o cartão salvo. Recusou → "pagamento
  pendente", nova tentativa a cada 24 h (3 no total), aviso no WhatsApp com o
  link para trocar o cartão e acesso mantido por 3 dias de carência.
- **Pix**: o Pix da renovação é gerado e enviado no WhatsApp 3 dias antes do fim;
  pago, estende a partir do fim do período; sem pagamento, encerra 3 dias depois.
- **Cancelar** (cliente): sem novas cobranças, acesso até o fim do período pago.
  A gestão pode encerrar na hora, cobrar agora e estornar o último pagamento.
- Cada tentativa grava antes uma linha em `payments` com chave de idempotência;
  resposta perdida (timeout) é conciliada pela listagem de cobranças, nunca
  recobrada às cegas.

Migrações novas: altere `src/server/db/schema.ts` e rode `npm run db:generate`
(nunca edite migrações já aplicadas).
