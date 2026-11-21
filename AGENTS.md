<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Barbearia do Moura — regras para agentes

App Next.js 16 em Cloudflare Workers (OpenNext) com D1, R2 e Cron Trigger (`wrangler.jsonc`).
Produção é o Worker `barbearia-do-moura`. A `main` é o que está em produção.

## Onde cada coisa roda

- **Local ou VM da nuvem:** pnpm 12 (`packageManager`), Node do `.nvmrc`. Hooks do lefthook (instalados
  no `pnpm install`): pre-commit roda Prettier + ESLint só nos arquivos em stage; pre-push roda só o
  `pnpm typecheck` incremental. Não aumente os hooks.
- **CI (`.github/workflows/ci.yml`):** lint, typecheck, build e testes completos em todo PR e push na
  `main`. O check obrigatório da `main` é o job `check` (agrega os outros): não renomear.
- **Deploy:** Workers Builds da Cloudflare a cada push na `main`. `pnpm run deploy` manual só pelo
  responsável. Migrations do D1 remoto (`pnpm db:migrate:remote`) vão antes do merge que depende delas.
  Não há workflow que aplique migration remota: até existir, `db:migrate:remote` é do responsável
  (agente prepara a migration e pede).
- Segredos só no Worker (`wrangler secret`); `.dev.vars.example` lista as variáveis. Nada de segredo no
  repositório nem no ambiente da nuvem.
- Atenção no pnpm: `setup` e `deploy` são comandos do próprio pnpm; use `pnpm run setup` e `pnpm run deploy`.

## Fluxo autônomo

1. Branch de feature a partir de `origin/main` atualizada: `<tipo>/<nome-kebab>`. Commits semânticos em
   PT-BR (`<tipo>(<escopo>): <descrição no imperativo>`); commit + push a cada parte pronta.
2. Ao terminar: `pnpm test:related`, `pnpm lint` e `pnpm build`; abrir o PR pronto (não draft), acompanhar
   o CI e corrigir tudo num push só.
3. CI verde e baixo risco: squash merge sem perguntar. Risco (auth, pagamento, dados de usuário, infra/CI,
   deleção): perguntar antes do merge.
4. Migrations: expand entra automático; contract em dois tempos (PR posterior, depois do deploy sem uso do
   que sai e smoke verde; snapshot do D1 antes de qualquer drop).
5. Smoke falhou: corrigir pra frente ou rollback do app (versão anterior do Worker), nunca do banco.
6. Nunca `--no-verify`, push direto na `main`, deploy do notebook, banco ou Docker local, force-push em
   branch compartilhada.

### PR na VM da nuvem (Claude Code na web, app ou thread de projeto)

Na nuvem o proxy do GitHub bloqueia GraphQL, então `gh pr …` e `gh issue …` dão 403. `git push` e
`gh api` (REST) funcionam:

- Abrir PR pronto: `gh api repos/{owner}/{repo}/pulls -f title='<tipo>(<escopo>): …' -f head=<branch> -f base=main -f body='…' -F draft=false`.
- Squash merge: `gh api -X PUT repos/{owner}/{repo}/pulls/<n>/merge -f merge_method=squash`.
- Ver PR da branch: `gh api repos/{owner}/{repo}/pulls?head={owner}:<branch>`.
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
