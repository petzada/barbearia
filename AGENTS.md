# AGENTS.md

Guia para qualquer agente (ou pessoa) que escreva código neste repositório. O `CLAUDE.md` apenas aponta para este arquivo.

Fontes de verdade: [PRD](docs/produto/PRD-MVP.md) → [tasks](docs/produto/tasks/README.md) → [decisões](docs/decisoes). Este arquivo não cria regra de negócio; resume como trabalhar.

## Stack

TypeScript estrito (`strict` + `noUncheckedIndexedAccess`), TanStack Start (Router + server functions), React, Tailwind 4, Drizzle + `pg`, Postgres, Zod, pino. Testes: Vitest (projetos `unit` e `integration`) e Playwright (`mobile` e `desktop`). Lint: **ESLint (flat config) + typescript-eslint**; formatação: **Prettier**. Escolha registrada em T01: ESLint permite regras de fronteira por pasta (`domain` puro, sem `console`) com `no-restricted-imports`, sem plugin extra.

Todas as versões estão fixadas (exatas) em `package.json`; o `pnpm-lock.yaml` é versionado. Node ≥ 22.12 e pnpm 10.

## Comandos

| Comando                       | O que faz                                                                  |
| ----------------------------- | -------------------------------------------------------------------------- |
| `pnpm install`                | instala dependências                                                       |
| `pnpm dev` / `dev:worker`     | servidor web (porta 3000) / processo worker                                |
| `pnpm build`                  | build de produção                                                          |
| `pnpm start` / `start:worker` | roda o build / o worker                                                    |
| `pnpm lint`                   | ESLint                                                                     |
| `pnpm format`                 | Prettier (escreve); `pnpm format:check` só confere                         |
| `pnpm typecheck`              | `tsc --noEmit`                                                             |
| `pnpm test:unit`              | Vitest, projeto `unit` (sem rede)                                          |
| `pnpm test:integration`       | Vitest, projeto `integration` (Postgres `barbearia_test`, precisa de rede) |
| `pnpm test`                   | unit + integration                                                         |
| `pnpm test:e2e`               | Playwright, viewports mobile e desktop (sobe o `vite dev` sozinho na 3100) |
| `pnpm db:check`               | confere conectividade (`select 1`) e `btree_gist` em `_dev` e `_test`      |
| `pnpm db:bootstrap`           | cria, se faltar, `barbearia_dev` e `barbearia_test`; grava `.env.local`    |
| `pnpm db:generate`            | `drizzle-kit generate` (gera migração a partir do schema)                  |
| `pnpm db:migrate`             | aplica migrações em `DATABASE_URL` (`--test` para o banco de teste)        |
| `pnpm db:reset`               | zera os schemas do banco e reaplica migrações (`--test` para o de teste)   |
| `pnpm verify`                 | lint + typecheck + test + build (rodar antes de entregar)                  |

## Banco de dados: sem Docker (D0082)

Não existe Docker neste projeto. O Postgres é o serviço **Postgres** do projeto Railway `barbearia-staging` (ambiente Railway `production`), acessado pelo proxy TCP público do serviço. Dentro do mesmo servidor há três bancos:

- `railway` — banco padrão, **usado pelo deploy. Nunca tocar** com `db:reset`, testes ou scripts.
- `barbearia_dev` — desenvolvimento (`DATABASE_URL`).
- `barbearia_test` — testes de integração, pode ser zerado (`DATABASE_URL_TEST`).

Configuração numa máquina nova:

1. Instale o [Railway CLI](https://docs.railway.com/guides/cli) e faça `railway login`.
2. `railway link --project barbearia-staging --environment production --service Postgres`.
3. `pnpm install && pnpm db:bootstrap` — cria os bancos (idempotente), habilita `btree_gist` e escreve `DATABASE_URL`/`DATABASE_URL_TEST` em `.env.local`.
4. `pnpm db:check` para validar.

Regras de segurança:

- `.env.local` e qualquer `.env*` (exceto `.env.example`) **não são versionados**. Nunca imprima, cole em chat/relatório ou commite uma URL de banco; `.env.example` só tem nomes e descrições.
- `db:reset`, `db:migrate` e a suíte de integração **recusam** rodar se o nome do banco não terminar em `_dev` ou `_test` (`src/platform/db/safety.ts`). Não contorne a trava.
- Os testes de integração dependem de rede e do `railway login` apenas no `db:bootstrap`; depois disso só precisam do `.env.local`.
- Banco de produção real (T40/H05) será outro projeto/ambiente e nunca recebe testes.
- A conexão usa TLS (`sslmode=no-verify`: o certificado do Railway é autoassinado).

## Estrutura (PRD §7.2)

```
src/
  contracts/      tipos compartilhados, envelope de comando/resultado, eventos base, ports (T02)
  platform/       db, logging e, depois, context, auth, authz, errors, money, time, ids, audit, jobs, outbox...
  modules/<m>/    domain/ (puro) · application/ · infra/ · schema.ts · events.ts · errors.ts · server.ts · ui/ · index.ts
  integrations/   adapters dos ports (mercado-pago, woovi, whatsmiau, web-push, r2)
  routes/         rotas TanStack: (publico)/, app/, equipe/, admin/, api/webhooks/
  ui/             design system e layouts (T05)
  worker.ts       entrada do processo worker
tests/{unit,integration,contract,e2e,security}/
scripts/          utilitários de banco (db:*)
```

Alias de import: `~/` = `src/`. Dentro de um módulo use import relativo.

## Regras de código (PRD §7.9, aplicadas pelo lint)

- `domain` é puro: sem `any` explícito, sem importar `infra`, `integrations`, UI, rotas, acesso a banco nem SDK (`pg`, `pino`, `react`).
- Módulos só se comunicam por `modules/<m>/index.ts` ou por eventos; nunca importam `infra` de outro módulo.
- `console.*` é proibido em `src/` e `tests/`: use `logger` de `~/platform/logging`. (`scripts/` pode usar `console`.)
- Funções pequenas e de propósito único; erros tipados; nada de `catch` silencioso; sem booleanos ambíguos em assinatura (use objeto/enum).
- Uma regra de negócio mora em um só lugar (domínio); UI, job e webhook a reutilizam. Componente de UI não recalcula regra.
- Comentários explicam o **porquê** e citam a decisão: `// D0058: prazo congelado na reserva`.
- Migrações são incrementais. **Nunca edite uma migração já aplicada**; crie outra.
- Sem float para dinheiro: `Money` em centavos (T02).

## Convenção de idioma

- **Domínio em português**, alinhado ao glossário do PRD §13: entidades, regras, tipos, funções e variáveis de negócio (`Assinatura`, `calcularCobertura`, `prazoDeCancelamento`).
- **Código técnico em inglês**: infraestrutura, plataforma, ports e padrões (`Clock`, `JobQueue`, `idempotencyKey`, `correlationId`, `repository`).
- **Contratos fixados pelo PRD ficam como escritos nele** (nomes de eventos `ReservationConfirmed`, códigos de erro `SCHEDULING.SLOT_UNAVAILABLE`, ports).
- Não misture idiomas para o mesmo conceito. Comentários, mensagens ao usuário, commits e documentação em português (pt-BR, com acentuação).

## Área de escrita e arquivos compartilhados

- Cada task escreve **só** na sua área de escrita (veja o arquivo da task). Precisa mudar algo fora dela? Pare e relate ao orquestrador com a proposta.
- Não altere `docs/decisoes`, `docs/pesquisas` nem o PRD.
- Arquivos compartilhados têm um escritor por vez (o orquestrador integra): `package.json`/lockfile, `src/platform/db/schema/index.ts` (só acrescentar export), `routeTree.gen.ts` (gerado), migrações, `.env.example` (só acrescentar), `src/contracts`.
- Não invente regra de negócio; lacuna vira pendência no relatório (`blocked_human`).
- Segredos só em variáveis de ambiente; nunca em arquivo versionado, log ou relatório.

## Definição de pronto (resumo, PRD §8.3)

`pnpm verify` verde (lint, typecheck, testes, build), critérios de aceite provados por teste, relatório de entrega do PRD §11.5.
