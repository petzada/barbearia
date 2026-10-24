# Scaffold inicial — Barbearia do Moura

**Data:** 2026-05-21
**Status:** Aprovado para implementação
**Escopo desta fase:** Subir o scaffold da stack e provar que Banco de Dados + Auth (+ RLS) funcionam ponta a ponta. Funcionalidades de negócio (agendamentos, agenda do barbeiro, métricas admin) ficam para fases seguintes, cada uma com seu próprio ciclo de spec → plano → implementação.

## Contexto

Web app mobile-first para uma única barbearia ("Barbearia do Moura"). O cliente faz agendamentos, o barbeiro acompanha a agenda diária e há um painel admin de métricas. Esta fase entrega apenas a fundação técnica funcional.

### Decisões tomadas no brainstorming

- **Estrutura:** app Next.js único. Não há Worker Node.js separado. Lembretes via WhatsApp (futura integração com a API WhatsMiau.dev) serão disparados por um Route Handler agendado via cron (Railway cron ou Supabase `pg_cron`), pois o envio é só uma chamada HTTP — não requer processo contínuo.
- **Supabase:** projeto na nuvem (cloud). Usar Supabase Auth, Postgres e RLS. Chaves fornecidas pelo usuário via `.env.local`.
- **Storage:** Cloudflare R2 só quando necessário (não nesta fase).
- **Prova de stack funcional:** conexão DB + Auth (com RLS). Storage fora de escopo agora.
- **Deploy:** Railway, em fase posterior. Validar localmente primeiro.
- **Método de Auth:** e-mail + senha para o scaffold (determinístico, sem provider de SMS). Login por telefone/OTP fica como decisão futura.

## Stack

- **Full stack:** Next.js (App Router) com Server Actions e Route Handlers, TypeScript.
- **UI:** Tailwind CSS, shadcn/ui, Lucide Icons, React Hook Form, Zod.
- **Banco/Auth:** Supabase Auth, Postgres, RLS (`@supabase/ssr` + `@supabase/supabase-js`).
- **Storage (futuro):** Cloudflare R2.
- **Rotinas (futuro):** Route Handler `/api/cron/lembretes` disparado por cron, integrando WhatsMiau.dev.
- **Deploy (futuro):** Railway.

## Estrutura do projeto

```
mourabarber/
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/page.tsx          # tela de login/signup (pública)
│  │  ├─ (app)/
│  │  │  ├─ conta/page.tsx               # smoke test: lê/escreve o próprio profile (prova RLS)
│  │  │  └─ layout.tsx                   # valida sessão server-side, senão redireciona p/ login
│  │  ├─ auth/callback/route.ts          # callback do Supabase (troca code→session)
│  │  ├─ api/cron/lembretes/route.ts     # STUB protegido por CRON_SECRET (futuro WhatsMiau)
│  │  ├─ layout.tsx                       # root layout (mobile-first, fontes, Toaster)
│  │  └─ page.tsx                         # raiz: redireciona p/ /conta ou /login
│  ├─ components/ui/                      # shadcn/ui (button, input, form, card, label, etc.)
│  ├─ lib/
│  │  ├─ supabase/client.ts               # client browser (@supabase/ssr)
│  │  ├─ supabase/server.ts               # client server (cookies)
│  │  └─ validations/auth.ts              # schemas Zod
│  └─ middleware.ts                       # refresh de sessão Supabase em toda request
├─ supabase/migrations/                   # SQL versionado (profiles, RLS, trigger)
├─ docs/superpowers/specs/                # specs de design
├─ .env.local (gitignored) / .env.example
└─ components.json, tailwind, tsconfig, package.json, etc.
```

Mobile-first: root layout com container de largura máxima estreita, foco em toque.

## Modelo de dados

### Enum `user_role`
`cliente` | `barbeiro` | `admin`

### Tabela `profiles`

| coluna | tipo | nota |
|---|---|---|
| `id` | uuid PK | = `auth.users.id` (FK, on delete cascade) |
| `full_name` | text | editável pelo dono |
| `phone` | text null | futuro: chave para lembretes WhatsApp |
| `role` | `user_role` | default `cliente` |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()`, atualizado via trigger |

### Trigger de criação de profile
Ao inserir em `auth.users`, uma função `security definer` cria a linha correspondente em `profiles` com `role = cliente`. O usuário Moura é promovido a `admin`/`barbeiro` manualmente via SQL nesta fase.

## RLS (Row Level Security)

RLS habilitado em `profiles`. Políticas:

- **SELECT:** `auth.uid() = id` — usuário só enxerga a própria linha.
- **UPDATE:** `auth.uid() = id` — usuário só edita a própria linha.
- **INSERT:** apenas pelo trigger (`security definer`); clientes não inserem diretamente.
- **DELETE:** nenhuma política (proibido pelo cliente).

A página `/conta` exercita SELECT e UPDATE sob RLS, provando o isolamento por usuário.

## Fluxo de autenticação e sessão

1. `middleware.ts` roda em toda request e renova a sessão Supabase via cookies (`@supabase/ssr`).
2. `(app)/layout.tsx` valida a sessão no server; sem sessão → redireciona para `/login`.
3. `/login` faz signup/login com e-mail + senha (React Hook Form + Zod).
4. `auth/callback/route.ts` troca o `code` pela sessão e redireciona para `/conta`.
5. Logout encerra a sessão; rotas autenticadas voltam a redirecionar para `/login`.

## Variáveis de ambiente

`.env.example` versionado; `.env.local` ignorado pelo git.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `CRON_SECRET` (protege `/api/cron/lembretes` desde já)

Placeholders comentados para referência futura (não usados nesta fase): credenciais Cloudflare R2 e chaves da WhatsMiau.dev.

## Critério de pronto (prova da stack funcional)

Checklist verificável manualmente:

1. `npm run dev` sobe sem erros e `/login` renderiza (mobile-first, shadcn).
2. Signup cria usuário no Supabase **e** o trigger cria a linha em `profiles`.
3. Login autentica e redireciona para `/conta`.
4. `/conta` lê o profile do usuário logado (prova SELECT sob RLS).
5. Editar `full_name` em `/conta` persiste (prova UPDATE sob RLS).
6. Logout encerra a sessão e `/conta` passa a redirecionar para `/login`.
7. Não é possível ler o profile de outro usuário (prova de isolamento RLS).

## Fora de escopo (fases futuras)

- Modelagem de serviços, agendamentos e horários.
- Áreas de cliente (booking), barbeiro (agenda diária) e admin (métricas) além de stubs.
- Cloudflare R2 (storage de imagens).
- Integração WhatsMiau.dev e cron de lembretes (apenas stub protegido nesta fase).
- Deploy no Railway.
- Auth por telefone/OTP.
