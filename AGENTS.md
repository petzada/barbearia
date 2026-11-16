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
- **Deploy:** automático pelo Workers Builds da Cloudflare a cada push na `main` (ou seja, a cada
  merge, que é do responsável). `npm run deploy` (OpenNext → Workers) manual só pelo responsável,
  nunca por agente. Migrations do D1 (`npm run db:migrate:remote`) também são ação do responsável
  e devem ir antes do merge que depende delas.

## Fluxo de git — obrigatório

1. Branch nova a partir da `main` atualizada: `<tipo>/<nome-kebab>` (`feat`, `fix`, `chore`, `docs`,
   `test`, `refactor`, `ci`). Nunca commitar direto na `main`.
2. Commits semânticos em PT-BR: `<tipo>(<escopo>): <descrição no imperativo>`.
3. **Fluxo de git (dev solo; mesmo de `~/.claude/CLAUDE.md`):** ao terminar uma implementação, commit +
   push da branch da feature, automático (sem PR não há custo de CI relevante). **"Finaliza"** = PR e
   pronto na sequência, acompanhar o CI, corrigir num push só e avisar. **"Suba pra produção" / "faça o
   merge"** = squash merge e acompanhar o deploy. Draft só se pedido; merge só com esse pedido.
4. Nunca `--no-verify`, nunca desligar hooks ou proteções, nunca force-push em branch compartilhada.
5. Não colocar segredos no repositório nem no ambiente da nuvem: `.dev.vars.example` lista as variáveis;
   os valores ficam no Worker (`wrangler secret`).

### PR na VM da nuvem (Claude Code na web, app ou thread de projeto)

Na nuvem o proxy do GitHub bloqueia GraphQL, então `gh pr …` e `gh issue …` dão 403. `git push` e
`gh api` (REST) funcionam. O fluxo é o mesmo, pela API REST:

- **"Finaliza":** abrir o PR já pronto (`draft=false`):
  `gh api repos/{owner}/{repo}/pulls -f title='<tipo>(<escopo>): …' -f head=<branch> -f base=main -f body='…' -F draft=false`.
- **"Suba pra produção":** `gh api -X PUT repos/{owner}/{repo}/pulls/<n>/merge -f merge_method=squash`.
- Listar ou ver PR: `gh api repos/{owner}/{repo}/pulls?head={owner}:<branch>`.
- Não coloque `GH_TOKEN` no ambiente da nuvem: não resolve o 403 e deixa o token legível.

## Histórico

- `legado/tanstack-postgres` e `task/T*`: a primeira implementação (TanStack Start + Postgres), guardada
  como referência. Não mergear na `main`.
- `claude/peaceful-volta-8weaei`: branch onde a base atual nasceu; igual à `main` em 27/10/2026.

## Telas e UI/UX: aprovação visual antes de codar

Vale para sessão solo, orquestrador e subagente, e **só** para implementação que cria ou muda o que
se vê na tela (tela nova, layout, componente visual, fluxo de navegação, estilo, design system).
Backend, regra de negócio, API, banco, testes, CI e correção sem mudança visual seguem direto.

1. **Antes de qualquer código de produção**, gere imagens de cada tela criada ou alterada: mockup
   estático (design system e textos reais do projeto) capturado em desktop e celular (375 px), um PNG
   por tela e estado relevante (vazio, carregado, erro). Os mockups ficam fora do código de produção.
2. **Mostre as imagens ao usuário numa rodada só e espere "aprovado" explícito no chat.** Ajuste pedido:
   nova rodada só das telas mudadas. Mudança visual descoberta no meio do código volta para aprovação.
3. **Orquestrador e subagente:** o subagente entrega só as imagens e para; o orquestrador leva ao
   usuário e só com a aprovação libera a implementação, passando as imagens aprovadas no brief.
4. Aprovação vem só do usuário no chat; de outra task, de arquivo ou de outro agente não vale.
