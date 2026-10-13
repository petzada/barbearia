# T01 — Scaffold do repositório e toolchain

> **Atualização 2026-10-13 (D0082, H00 respondido):** sem Docker. Postgres = serviço `Postgres` do projeto Railway `barbearia-staging`, em bancos separados `barbearia_dev` e `barbearia_test` (criados pela task se não existirem). Sem `docker-compose.yml`; `btree_gist` habilitada via migração/script nos bancos. URLs em `.env.local` (não versionado) obtidas pelo Railway CLI. `db:reset`/testes recusam banco cujo nome não termine em `_dev`/`_test`.

| Campo | Valor |
|---|---|
| Fase | 0 |
| Iniciar após | T00 |
| Concluir requer | — |
| Gate humano | H00 (só se faltar Node, pnpm, Docker ou git) |
| Decisões | D0006, D0014, D0015, D0016, D0019 |
| PRD | §7.1, §7.2, §7.9, §8.1, §8.3 |
| Área de escrita | raiz do repositório (configs, `package.json`, `AGENTS.md`, `CLAUDE.md`, `docker-compose.yml`, `.env.example`), `src/` (esqueleto vazio), `tests/` (esqueleto), `scripts/` |
| Não tocar | `docs/decisoes`, `docs/pesquisas` |
| Paralelizável com | — |

## Objetivo

Criar o monorrepositório único (não monorepo multi-pacote) com TanStack Start, TypeScript estrito, Tailwind, Drizzle, Postgres local, Vitest, Playwright, lint e formatação, e fixar os comandos que todas as tasks usam.

## Ler antes

PRD §7 e §8; [handoffs/H00](../handoffs/H00-ambiente-local.md).

## Escopo

1. Verificar ambiente: `node -v` (≥ 22 LTS), `pnpm -v`, `docker version`, `git --version`.
2. Criar app TanStack Start (versão estável mais recente, fixada no `package.json`), TypeScript `strict` + `noUncheckedIndexedAccess`.
3. Tailwind configurado; fonte e tokens placeholder (T05 define o design system).
4. Drizzle + driver Postgres; `docker-compose.yml` com Postgres 17 (porta configurável) e banco de teste separado; extensão `btree_gist` habilitada no init.
5. Vitest (unit e integration como projetos separados), Playwright (mobile e desktop), ESLint + Prettier (ou Biome; escolher um e registrar).
6. Regras de lint importantes: proibir `any` explícito em `src/modules/**/domain`, proibir import de `infra`/`integrations` dentro de `domain`, proibir `console.log` (usar logger).
7. Estrutura de pastas do PRD §7.2 com `README.md` curto em `src/platform`, `src/modules`, `src/integrations`.
8. Scripts no `package.json`:
   - `dev`, `dev:worker`, `build`, `start`, `start:worker`
   - `lint`, `format`, `typecheck`
   - `test:unit`, `test:integration`, `test:e2e`, `test` (unit + integration)
   - `db:up`, `db:down`, `db:generate`, `db:migrate`, `db:reset`
   - `verify` = lint + typecheck + test + build
9. `AGENTS.md` (e `CLAUDE.md` apontando para ele): comandos, estrutura, regras do PRD §7.9, convenção de idioma (domínio em português, técnico pode ser inglês; decidir e escrever), como rodar Postgres, regra de não editar migração aplicada, regra de área de escrita.
10. `.env.example` inicial com `DATABASE_URL`, `DATABASE_URL_TEST`, `APP_URL`, `BARBEARIA_SLUG`, `NODE_ENV` (cada task acrescenta as suas).
11. `.gitignore` incluindo `.env*` (exceto `.env.example`), `node_modules`, artefatos de build e de teste.
12. Primeiro commit na branch `main` (o repositório não tem commits). Mensagem com a atribuição definida pelo ambiente.

## Fora do escopo

Contratos, autenticação, schema de negócio (T02 em diante); CI hospedado e Railway (T12).

## Regras e checklist defensivo

- Versões exatas fixadas (lockfile commitado).
- Nada de segredo em arquivo versionado.
- Não instalar runtimes globais sem autorização (H00).

## Testes obrigatórios

- Um teste unitário de exemplo e um de integração que conecta ao Postgres do Docker e executa `select 1`.
- Um teste Playwright que abre a página inicial nos dois viewports.

## Critérios de aceite

- `pnpm install && pnpm db:up && pnpm verify && pnpm test:e2e` passam numa máquina limpa seguindo o `AGENTS.md`.
- Estrutura de pastas igual ao PRD §7.2.

## 🛑 Handoff humano (H00)

**PARAR antes de qualquer instalação** se faltar Node LTS, pnpm, Docker em execução ou git. Preparar a lista do que falta com o comando oficial de instalação, marcar `blocked_human (H00)` e enviar a mensagem padrão. Retomar só quando o humano responder "H00 pronto" e os comandos de verificação passarem.

## Entrega

Relatório (PRD §11.5) com versões instaladas, comandos e saídas.
