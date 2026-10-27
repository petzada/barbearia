<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Barbearia do Moura — regras para agentes

App Next.js 16 em Cloudflare Workers (OpenNext) com D1, R2 e Cron Trigger (`wrangler.jsonc`).
Produção é o Worker `barbearia-do-moura`. A `main` é o que está em produção.

## Onde cada coisa roda

- **Local ou VM da nuvem (Claude Code):** só o escopo do diff, pelo lefthook (instalado no `npm ci`):
  pre-commit roda o eslint nos arquivos em stage; pre-push roda `npm run typecheck` e `npm run test:related`
  (vitest nos testes ligados ao diff). Não aumente o pre-push. Nada de banco local, Docker local ou `wrangler dev` com dados reais.
- **CI (GitHub Actions, `.github/workflows/ci.yml`):** lint, typecheck, testes e build completos,
  em todo PR e em push na `main`. Repositório público: minutos sem custo.
- **Deploy:** `npm run deploy` (OpenNext → Workers) só pelo responsável, nunca por agente. Migrations
  do D1 (`npm run db:migrate:remote`) também são ação do responsável.

## Fluxo de git — obrigatório

1. Branch nova a partir da `main` atualizada: `<tipo>/<nome-kebab>` (`feat`, `fix`, `chore`, `docs`,
   `test`, `refactor`, `ci`). Nunca commitar direto na `main`.
2. Commits semânticos em PT-BR: `<tipo>(<escopo>): <descrição no imperativo>`.
3. PR **sempre em draft** (`gh pr create --draft`). O agente marca como pronto (`gh pr ready`) só com
   lint, typecheck e testes verdes no diff. **O agente nunca faz merge**: merge e deploy são do responsável.
4. Nunca `--no-verify`, nunca desligar hooks ou proteções, nunca force-push em branch compartilhada.
5. Não colocar segredos no repositório nem no ambiente da nuvem: `.dev.vars.example` lista as variáveis;
   os valores ficam no Worker (`wrangler secret`).

## Histórico

- `legado/tanstack-postgres` e `task/T*`: a primeira implementação (TanStack Start + Postgres), guardada
  como referência. Não mergear na `main`.
- `claude/peaceful-volta-8weaei`: branch onde a base atual nasceu; igual à `main` em 27/10/2026.
