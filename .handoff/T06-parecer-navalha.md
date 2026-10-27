# PARECER T06 — REVIEWER (Navalha)

Classificação: **REPROVADA**

Base revisada: `f24d7b8..b74658a` (`06ec2c0` allowlist pública, `b74658a` catálogo). Worktree T06, branch `task/T06-catalogo-servicos-equipe`. Nenhum arquivo de código foi editado.

Devolver ao BUILDER os itens 1–4 e 7–10. Itens 5 e 6 estão em arquivo compartilhado: o 5 o BUILDER já alterou (`vite.config.ts`, `playwright.config.ts` e o helper de e2e); o 6 é uma linha no índice do Drizzle, cujo escritor único é o orquestrador na integração.

## Verificações executadas

- Leitura da task T06, README das tasks, AGENTS.md, `src/contracts/README.md`, PRD RN02 e telas P03, P04, D04, D05, decisões D0023, D0033, D0037, D0049, D0065, D0066, D0069, D0075, D0083, D0088.
- Diff e leitura do módulo `catalog`, migração t06, allowlist, sessão falsa, testes e rotas.
- Confirmei só o nome dos bancos, sem imprimir URL: `DATABASE_URL_TEST` é `barbearia_t06_test`; `DATABASE_URL` termina em `_dev`; são bancos distintos.
- `pnpm verify` no worktree: **verde**. ESLint, tsc, Vitest 31 arquivos / 319 testes, build de produção, `check:start` (GET `/` e 20 assets em 200, porta efêmera). Durante o Vitest apareceu `DeprecationWarning` do `pg`: query concorrente no mesmo client.
- Depois do build, busquei em `dist` (client e server) `catalog-dev-session-server-only-marker`, `E2E_FAKE_SESSION`, `dev_sessao` e `createDevSessionResolver`: nenhuma ocorrência.
- `pnpm test:e2e` com `E2E_FAKE_SESSION=1` e `E2E_PORT=3106`: **falhou**. 162 testes, 124 passaram, 37 skipped, 1 falha. Falha: `[mobile] tests/e2e/boas-vindas.spec.ts` — deep link em `/servicos`. O snapshot ficou em "Carregando serviços…" (`role=status`) por 5s, sem o `h1`. Os 4 testes novos de `tests/e2e/catalogo-pages.spec.ts` passaram (admin só no desktop; no mobile foram skip).
- Repeti só o deep link e `catalogo-pages` (mobile e desktop): 8 passaram, 2 skip. O deep link mobile passou em 5,7s, no limite do timeout de 5s. A falha da suíte completa é real e reproduz o skeleton; a repetição isolada passa apertada.
- Executei `formatPercentualBasisPoints(3500)` → `"35%"` e `parsePercentual("35%")` → `null`. `parsePercentual("35")` → `3500`.

## Acordos do orquestrador — cumpridos

- Allowlist: só `catalog.listPublicCatalog` e `catalog.listPublicBarbers` (`public-allowlist.ts`). Nenhuma outra policy `public` no módulo.
- DTO público (`repository.ts`, `ServicoPublico` / `BarbeiroPublico`): nome, bio, preço, duração, componentes pelo nome, `fotoUrl`. Sem `usuario_id`, `foto_key`, telefone ou percentual. O teste de integração cobre o JSON.
- `deps.ts`: `FakeOutbox` + `FakeStorageProvider(systemClock)`, com o comentário de T03/T08.
- `barbeiros.usuario_id` text, sem FK, com TODO T04 no `schema.ts`.
- Sessão falsa: `dev-session.server.ts` só chama `setSessionResolver` se `import.meta.env.MODE === 'development'` e `process.env.E2E_FAKE_SESSION === '1'`. `createDevSessionResolver` devolve a sessão real antes do cookie. Teste de segurança cobre produção, flag desligada e preservação da sessão real. Ausente do `dist` de client e de server (conferi no artefato; o teste `skipIf(!dist/client)` não roda no verify porque os testes vêm antes do build).
- Sem tabela de preços/comissões comerciais fixa no módulo. Percentual ausente fica `null`. Preços dos testes são fixture.
- Migração `drizzle/t06_catalogo_servicos_equipe.sql`, tag `t06` no journal. A suíte de integração aplicou e o `EXCLUDE` de vigência segurou a sobreposição.

## O que a entrega acerta (não reescrever)

- Combo canônico: `canonicalServiceSet` ordena ids; índice único parcial `servicos_combo_ativo_componentes_uidx` onde `tipo = combo` e `ativo`; `createCombo` recusa conjunto duplicado em outra ordem, componente que não é simples ativo, e combo dentro de combo. Check de autorreferência na tabela. Advisory lock por barbearia na criação.
- `findEquivalentCombo`: conjunto exato (qualquer ordem) acha; subconjunto, superconjunto e combo inativo não acham. Teste unitário.
- `expandCombo` mantém o combo e acrescenta os componentes. `isEnabledForAll` exige todos, inclusive combo e componentes; seleção vazia é `false`. Barbeiro sem linha nasce desabilitado.
- Vigência: `scheduleCommission` fecha a anterior com `addDays(inicio, -1)`; `percentAt` trata fim inclusivo. Teste de integração: 14/10 fica no percentual antigo, 15/10 no novo, fim gravado `2027-10-14`, insert em `2027-10-14` estoura o `EXCLUDE` gist.
- Preço/duração: update só mexe na linha do serviço, com revisão otimista, e publica `ServicePriceChanged` / `ServiceDurationChanged` só quando o valor muda, com a revisão nova. UI avisa que vale para novas reservas (e2e desktop viu o texto e o toast). Desativar não apaga; simples usado por combo ativo devolve `CATALOG.SERVICE_IN_USE`.
- Mutações: `policies.anyRole('admin')` e `requireRecentAuth`. Visitante nas listas admin: `AUTH.REQUIRED`. Barbeiro em `listAdminCatalog`: `AUTH.FORBIDDEN`.
- Auditoria na mesma transação em criar, atualizar preço/duração, desativar, habilitação e comissão. O defeito é o conteúdo do `before` da comissão, não a ausência do registro.
- Rotas `/servicos`, `/barbeiros`, `/admin/servicos`, `/admin/equipe/matriz`. P03/P04 sem horário, telefone ou percentual (e2e).

## Correções obrigatórias

### 1. Percentual exibido não volta a pontos-base

- **Arquivo:** `src/modules/catalog/ui/format.ts` (`parsePercentual`) e `src/modules/catalog/ui/AdminMatriz.tsx` (valor inicial do input).
- **Problema:** a matriz preenche o campo com `formatPercentualBasisPoints`, que devolve `"35%"` (e `"25,50%"` quando há fração). `parsePercentual` só aceita `"35"` ou `"35,50"`, sem o sufixo `%`. O e2e confere `toHaveValue('35%')` e não submete. Provado no Node: `parsePercentual("35%") === null`.
- **Impacto:** agendar vigência com o percentual já exibido falha com "Informe percentuais de 0% a 100%". É o fluxo da D04.
- **Correção:** o parse deve aceitar um `%` final opcional, ou o input deve guardar o texto sem `%` (o rótulo já diz percentual). Teste unitário format → parse para 0, 3500, 2550 e 10000.

### 2. Editar o avulso apaga o percentual de assinante

- **Arquivo:** `src/modules/catalog/ui/AdminMatriz.tsx`, estado `assinanteEditado` e o `onChange` do percentual avulso (por volta das linhas 122–131 e 220–224).
- **Problema:** enquanto `assinanteEditado` é `false`, cada alteração do avulso copia o texto para o assinante. O flag começa `false` mesmo quando os percentuais gravados são diferentes (ex.: 40% e 25%).
- **Impacto:** D0023 pede dois percentuais; a igualdade é só o padrão no cadastro. O primeiro ajuste do avulso apaga o % assinante distinto.
- **Correção:** espelhar só quando o assinante ainda está vazio ou os dois valores armazenados são iguais. Se diferem, iniciar com `assinanteEditado` true. Teste cobrindo os dois casos.

### 3. Auditoria da vigência grava o fim errado

- **Arquivo:** `src/modules/catalog/application/catalogo.ts`, `scheduleCommission`, `auditWriter` `before` (por volta das linhas 411–416). O `UPDATE` do fim (393–397) está certo: `addDays(input.inicio, -1)`.
- **Problema:** `before.fim` grava `input.inicio`, o dia em que a vigência nova começa, e não o fim efetivo (dia anterior) nem o fim anterior (`null`). Também omite o percentual assinante anterior.
- **Impacto:** a auditoria append-only mente sobre a fronteira e sugere sobreposição que o banco não tem. D0066/RN02 usam essa trilha como evidência.
- **Correção:** `before` com os bp e o fim anteriores; `after` com o fim fechado de fato (dia anterior) e o início novo. Teste de integração lendo a tabela `auditoria`.

### 4. Catálogo público só aparece depois do fetch, e a suíte e2e ficou vermelha

- **Arquivos:** `src/modules/catalog/ui/ServicosPublicos.tsx` e `src/modules/catalog/ui/BarbeirosPublicos.tsx` (`useEffect` + fetch; sem `catch`).
- **Problema:** o `h1` só existe depois que a operação pública resolve no cliente. O SSR/primeiro paint é o skeleton "Carregando serviços…". Se a promise rejeitar, o `then` não tem `catch` e a tela fica no skeleton. Na suíte e2e completa o deep link do T05 (`boas-vindas.spec.ts:88`, mobile) estourou 5s nesse skeleton. Repetição isolada passou em 5,7s.
- **Impacto:** `pnpm test:e2e` ficou vermelho; deep link público depende do round-trip ao Postgres antes de mostrar a tela que o T05 tratava como pronta.
- **Correção:** carregar `listPublicCatalog` e `listPublicBarbers` no loader da rota, com o título e os dados na primeira resposta, e tratar falha com `ErrorState`. Não aumentar o timeout do teste do T05 para esconder o skeleton.

### 5. Nome do banco da worktree fixado em arquivo compartilhado

- **Arquivos:** `vite.config.ts`, `playwright.config.ts`, `tests/e2e/helpers/catalogo.ts`.
- **Problema:** os três exigem o nome literal `barbearia_t06_test`. A trava do projeto (`src/platform/db/safety.ts`, `exigirBancoDescartavel`) já recusa o que não termina em `_dev` ou `_test`.
- **Impacto:** na main o banco de teste é `barbearia_test`. Com `E2E_FAKE_SESSION=1` o Vite e o Playwright recusam subir, e o seed do catálogo também. Não integra.
- **Correção:** exigir sufixo `_test` via a trava existente, sem fixar o nome da worktree. Manter a recusa de `railway` e de `_dev`.

### 6. Schema do catálogo fora do índice do Drizzle

- **Arquivo:** `src/platform/db/schema/index.ts` (não exporta o catálogo). `drizzle/meta` só tem `0000_snapshot.json`; a t06 entrou no journal sem snapshot.
- **Problema:** `drizzle.config.ts` lê só esse índice. O runtime importa o schema pelo módulo, então a suíte passou e a SQL aplicou. `db:generate` não vê `servicos`, `combo_componentes`, `barbeiros`, `habilitacoes` nem `comissao_vigencias`.
- **Impacto:** a próxima migração nasce cega em relação ao catálogo.
- **Correção:** uma linha de export relativo do schema do catálogo no índice (orquestrador, na integração) e snapshot compatível com a SQL já escrita. Não editar `t06_catalogo_servicos_equipe.sql` se ela já foi aplicada.

### 7. Revisão dos eventos de habilitação e comissão sempre 1

- **Arquivo:** `src/modules/catalog/application/catalogo.ts`, `EnablementChanged` e `CommissionRateScheduled` (`aggregateRevision: 1` fixo, por volta das linhas 322 e 429). `ServicePriceChanged` e `ServiceDurationChanged` usam a revisão nova do serviço, certo.
- **Problema:** a segunda habilitação ou a segunda vigência do mesmo agregado republica revisão 1.
- **Impacto:** consumidor que descarta revisão menor ou igual à última perde a mudança que vale.
- **Correção:** revisão monotônica. Habilitação é mutável e hoje usa `baseColumns` sem `revisao`; incrementar um contador. Comissão: número da vigência do par barbeiro × serviço. Teste lendo `catalogDependencies.outbox.events` (o fake guarda a lista).

### 8. Queries paralelas no mesmo client da transação

- **Arquivo:** o mesmo `catalogo.ts`, `Promise.all` no `tx` em `changeEnablement` (linha 264) e `scheduleCommission` (linha 350). `listMatrix` faz `Promise.all` no pool; isso pode ficar.
- **Problema:** um client `pg` não executa queries em paralelo. O Vitest desta revisão emitiu o `DeprecationWarning` de que isso sai no pg 9.
- **Impacto:** hoje é aviso; o `FOR UPDATE` no meio do lote não tem ordem garantida com os outros selects.
- **Correção:** `await` em sequência no mesmo `tx`. O lock da vigência/habilitação antes do insert.

### 9. Corrida entre desativar componente e criar combo

- **Arquivo:** `src/modules/catalog/application/catalogo.ts`, `createCombo` (advisory lock `catalog.combo`) versus `deactivateService` (não toma esse lock).
- **Problema:** entre o `SELECT` dos componentes ativos e o `INSERT` do combo, outra transação desativa o componente (ainda não há combo ativo). O inverso também: a desativação lê zero combos e o combo é criado em seguida.
- **Impacto:** RN02 (componente inativo rejeitado; não desativar simples usado por combo ativo) quebra com duas abas de admin. O índice único não cobre esse caso.
- **Correção:** as duas operações tomam o mesmo `pg_advisory_xact_lock` por barbearia antes de ler e escrever. Teste de concorrência não é obrigatório se o lock for o mesmo já usado no combo.

### 10. Testes obrigatórios de autorização e habilitação não provam o comando

- **Arquivo:** `tests/integration/catalogo.test.ts`.
- **Problema:** o teste obrigatório "barbeiro não edita catálogo" só chama `listAdminCatalog`. Os comandos têm a política admin, mas isso não está executado. O teste de habilitação monta o array `Habilitacao` na memória e não lê a tabela `habilitacoes` nem exige `status === 'ok'` do comando; um `Result` de erro passaria.
- **Impacto:** a prova exigida pela task está incompleta.
- **Correção:** barbeiro em `createService`, `updateService` e `scheduleCommission` → `AUTH.FORBIDDEN`; visitante permanece no DTO público. Depois de `changeEnablement`, ler `habilitacoes` e exigir `status === 'ok'`.

## Observações (não bloqueiam sozinhas)

- Não há comando de perfil do barbeiro (nome, bio, foto, ordem, ativo). O critério da task admite seed fictício e o vínculo de usuário ficou para T04. A página pública mostra a foto quando `fotoUrl` é `https`; a de serviços ignora `fotoUrl`. Upload real depende do `StorageProvider` (fake até T08, como combinado).
- O item Equipe do menu continua o esqueleto `/admin/equipe` (T04 e T06). A matriz está em `/admin/equipe/matriz` e no link "Abrir matriz da equipe" em Serviços.
- Copy: preço público diz "A partir de" para preço fechado. A faixa da matriz diz "pontos-base" enquanto o campo é percentual (35, não 3500).
- `usuario_id` está como `text`. A FK composta do T04 fica mais simples se a coluna já for `uuid`, ainda sem FK.
- Eventos saem pelo `FakeOutbox` (acordo). Não entram na outbox durável e o fake não desfaz se a transação cair. Na integração do T03, trocar `deps.ts` pelo adapter real.
- Não há relatório §11.5 no diff. Se ele ficou só na conversa, ok; o estado proposto não pode ser `done` com os itens acima.

## Resultado dos comandos

- `pnpm verify`: exit 0.
- `pnpm test:e2e` (`E2E_FAKE_SESSION=1`, `E2E_PORT=3106`): exit 1. Uma falha, citada no item 4. Repetição focada: exit 0.
