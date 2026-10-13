# 0015 — TanStack Start + Better Auth + Drizzle

- **Data:** 2026-10-13
- **Status:** aceita
- **Detalha:** [0006](0006-monolito-typescript-tailwind-postgres.md)

## Contexto
Foram avaliados Next.js (mais documentado, mas com Server Components e cache que um app 100% logado e sem SEO não precisa), TanStack Start e Vite SPA + Hono.

## Decisão
- **Framework:** TanStack Start (com TanStack Router).
- **Auth:** Better Auth, com as tabelas no Postgres do Railway.
  - Login principal: código por WhatsApp, usando o plugin de telefone do Better Auth com `sendOTP` customizado que chama o WhatsMiau.
  - Login secundário: Google.
- **ORM:** Drizzle.
- Fila de jobs: ver [0016](0016-fila-de-jobs-pg-boss.md).

## Requisito obrigatório: segurança no servidor
Pagamentos e dados pessoais exigem que estas regras valham desde o primeiro commit:
- Toda regra de negócio, chamada a gateway, cálculo de valor e decisão de permissão roda **só no servidor** (server functions / server routes). O cliente nunca envia preço, status de pagamento ou papel do usuário como fonte da verdade.
- **Toda server function** passa por um middleware de autenticação e autorização por papel (cliente, barbeiro, admin) e valida a entrada com schema (ex.: Zod). Nenhuma server function fica pública por esquecimento.
- Segredos (tokens do Mercado Pago, Woovi, WhatsMiau, R2) existem só em variáveis de ambiente do servidor. O build é conferido para garantir que nenhum segredo vaza no bundle do cliente.
- Webhooks de pagamento: verificação de assinatura/origem (`x-signature` do Mercado Pago, mecanismo equivalente da Woovi), processamento idempotente pelo id do evento, e status sempre consultado na API do gateway, nunca lido do corpo do webhook nem do `back_url`.
- Cookies de sessão `httpOnly`, `secure` e `sameSite`, além de proteção contra CSRF nas mutações.
- Rate limit no envio e na verificação do código de login.

## Revisão adversarial (2026-10-13)
- Stack e regras de segurança mantidas. Autenticação recente para ações sensíveis em [0071](0071-autenticacao-recente-para-acoes-sensiveis.md); identificador interno em [0070](0070-identificador-interno-e-troca-de-whatsapp.md).
