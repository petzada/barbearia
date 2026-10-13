# contracts e plataforma núcleo (T02)

Dona: **T02**. Mudança nestes contratos passa pelo orquestrador. Consumidores: todas as tasks de módulo (T03 em diante).

- `src/contracts` — só tipos, ports e fakes de teste (sem regra de negócio). Importe de `~/contracts` (tipos) ou `~/contracts/fakes`.
- `src/platform/*` — implementação: `db`, `context`, `authz`, `errors`, `money`, `time`, `ids`, `validation`, `audit`, `logging`, `idempotency`.

Os exemplos de código deste arquivo existem **compilados e executados**: `tests/integration/exemplo-comando.test.ts` (comando completo), `tests/unit/tipos-cliente.test.ts` (tipos do cliente) e `tests/integration/dispatcher.test.ts`.

## 1. Como uma operação existe (leia primeiro)

Toda ação que o navegador pode chamar é uma **operação**, criada por `defineQuery` (leitura) ou `defineCommand` (escrita) em `modules/<m>/server.ts`. Elas **não** usam `createServerFn`.

**Por quê:** o compilador do TanStack Start só remove o handler do bundle do navegador quando o `createServerFn(...).handler(...)` está escrito direto no módulo. Dentro de uma função fábrica o handler (e `pg`, segredos, regras) iria para o cliente. Por isso existe **um único** `createServerFn` no sistema, o dispatcher (`src/platform/context/dispatcher.ts`): ele recebe o _nome_ da operação, acha a definição registrada, resolve barbearia do deploy e sessão **no servidor** e roda o pipeline. `tests/security/server-functions.test.ts` falha se `createServerFn` aparecer em qualquer outro arquivo, e `defineQuery`/`defineCommand` recusam operação sem schema, sem política ou `public` fora da allowlist. Isso foi verificado com build de produção: o bundle do cliente não contém código de servidor.

```
navegador ──remoteOperation('mod.op')──▶ dispatcher (server fn única)
                                           │ barbearia do deploy + SessionResolver (servidor)
                                           ▼
   política → validação Zod → auth recente → authorize → handler
                               (comando: dentro de withIdempotency = 1 transação)
                                           ▼
                                  Result JSON (ok | pending | error)
```

**Pipeline** (`src/platform/context/operation.ts`), nesta ordem — anônimo nunca vê o schema nem mensagens de validação:

1. **Política** (`policies.public()` só com nome em `src/platform/authz/public-allowlist.ts`; `policies.authenticated()`; `policies.anyRole('admin','barbeiro')`). Sem sessão → `AUTH.REQUIRED` (401); sem papel → `AUTH.FORBIDDEN` (403).
2. **Validação** Zod (comando: separa e valida o envelope `{ idempotencyKey, expectedRevision? }` e os dados). Falha → `VALIDATION.FAILED` (422) com `fields` e **sem eco do valor recebido**.
3. **`requireRecentAuth`** opcional (`true` = 1 h, D0071/D0081; ou `{ windowMs }`) → `AUTH.RECENT_REQUIRED` (401). A janela vence **exatamente** em `windowMs`.
4. **`authorize`** opcional (recurso: dono, vínculo) com `requireOwnership`.
5. **Handler.** Consulta: `({ ctx, input, db })`. Comando: `({ ctx, input, tx, expectedRevision, idempotencyKey })` dentro de `withIdempotency`.
6. Resultado vira **JSON puro** (Date → ISO). Qualquer exceção que não seja `AppError` vira `SYSTEM.INTERNAL` com mensagem genérica; o detalhe vai só ao log, com o `correlationId`.

```ts
// modules/scheduling/server.ts — só roda no servidor
import { z } from 'zod'
import { ok } from '~/contracts'
import { policies, requireOwnership } from '~/platform/authz'
import { defineCommand } from '~/platform/context'
import { assertRevision } from '~/platform/db'
import { auditWriter } from '~/platform/audit'
import { uuidSchema } from '~/platform/validation'

export const cancelarReserva = defineCommand({
  name: 'scheduling.cancelarReserva', // modulo.operacao; é também o escopo da idempotência
  input: z.object({ reservaId: uuidSchema }), // schema Zod só dos dados
  policy: policies.anyRole('cliente', 'admin'),
  revision: 'required', // exige expectedRevision (padrão: 'optional')
  handler: async ({ ctx, input, tx, expectedRevision }) => {
    // ... selecione FOR UPDATE, requireOwnership(ctx, dono, { orRoles: ['admin'] }),
    // assertRevision(expectedRevision, atual.revisao), altere, grave auditoria e outbox na MESMA tx
    await auditWriter.record(tx, ctx, {
      action: 'scheduling.cancelarReserva',
      resource: { type: 'reserva', id: input.reservaId },
      before: { estado: 'confirmada' },
      after: { estado: 'cancelada' },
    })
    return ok({ reservaId: input.reservaId }, novaRevisao) // ok(dado, revisão)
  },
})
```

```ts
// modules/scheduling/client.ts — pode ser importado pelo navegador (só tipos + remoteOperation)
import { remoteOperation } from '~/platform/context/client'
import type { cancelarReserva } from './server' // import de TIPO: nada de servidor no bundle

export const cancelarReservaRemoto = remoteOperation<typeof cancelarReserva>(
  'scheduling.cancelarReserva', // o nome é checado contra o `name` literal da operação
)
// const r = await cancelarReservaRemoto({ reservaId, idempotencyKey: newIdempotencyKey(), expectedRevision: 3 })
// r.status: 'ok' (r.data, r.revision) | 'pending' (operationId, protocol) | 'error' (code, message, fields, retryable, httpStatus)
```

- `modules/<m>/server.ts` é carregado pelo dispatcher por `import.meta.glob`; importar o arquivo basta para registrar. Nunca importe `server.ts` em código de UI (use `client.ts` com `import type`).
- Operação pública: acrescente o nome à allowlist (revisão do orquestrador) e use DTO sem PII.
- O servidor responde sempre 200 ao navegador com o `Result`; o status HTTP está em `result.httpStatus`. Rotas (`api/`, webhooks) convertem com `httpStatusOf(result)`.
- **Pendências para outras tasks:** verificação de `Origin`/CSRF e cookies (T04/T37); rate limit (T04 e seguintes; o código `RATE.LIMITED` já existe).

## 2. Contexto da requisição (`RequestContext`)

`{ barbeariaId, actorId, roles, sessionId, authTime, correlationId, clock }` (`~/contracts`). `barbeariaId` vem do deploy (`getDeployBarbearia()`, a partir de `BARBEARIA_SLUG`), **nunca** do navegador. Papéis são combináveis (`cliente`, `barbeiro`, `admin`). Para handlers de política não pública o contexto é `AuthenticatedContext` (ator e sessão não nulos). Jobs usam `createSystemContext({ barbeariaId, clock })` (sem ator). `correlationId` aceita o header `x-correlation-id` só com formato seguro; senão gera um UUID v7.

`SessionResolver` (`resolve(request) → ResolvedSession | null`): T04 implementa e chama `setSessionResolver(...)` ao carregar `modules/identity/server.ts`. Sem resolvedor registrado, ninguém tem sessão (falha fechada). Testes usam `FakeSessionResolver` (header `x-test-session`).

## 3. Autorização (`~/platform/authz`)

`requireAuthenticated`, `requireRole(ctx, 'admin', 'barbeiro')` (qualquer um), `requireOwnership(ctx, donoId, { orRoles: ['admin'] })`, `requireRecentAuth(ctx, { windowMs? })`, `hasAnyRole`. Erros: `AUTH.REQUIRED`, `AUTH.FORBIDDEN`, `AUTH.RECENT_REQUIRED`.

## 4. Erros e resultados (`~/platform/errors`, `~/contracts`)

`Result<T> = OkResult | PendingResult | ErrorResult`. Helpers `ok(data, revision?)` e `pending({ operationId, protocol?, nextUpdateAt? })`. `ErrorResult` traz `code`, `message` segura, `fields`, `retryable`, `correlationId`, `httpStatus` (e `retryAfterSeconds` no 429).

Cada módulo declara os seus códigos em `modules/<m>/errors.ts`:

```ts
import { defineErrors } from '~/platform/errors'
export const SchedulingErrors = defineErrors('SCHEDULING', {
  SLOT_UNAVAILABLE: { httpStatus: 409, message: 'Este horário não está mais disponível.' },
})
throw SchedulingErrors.SLOT_UNAVAILABLE({ fields: [{ path: 'inicio', message: 'Indisponível.' }] })
SchedulingErrors.codes.SLOT_UNAVAILABLE // 'SCHEDULING.SLOT_UNAVAILABLE'
```

Genéricos (`~/platform/errors`): `AuthErrors` (`AUTH.REQUIRED` 401, `FORBIDDEN` 403, `RECENT_REQUIRED` 401), `ValidationErrors.FAILED` 422, `ConcurrencyErrors.REVISION_CONFLICT` 409, `IdempotencyErrors.KEY_REUSED` 422, `RateErrors.LIMITED` 429, `DependencyErrors.UNAVAILABLE` 503, `SystemErrors` (`RECOVERY_MODE` 503, `INTERNAL` 500, `OPERATION_NOT_FOUND` 404). Lance `AppError` para recusar; **a transação é desfeita** e a chave de idempotência não é consumida. Mensagens nunca expõem stack, SQL nem dado pessoal.

## 5. Comandos, idempotência e concorrência

Envelope: `{ idempotencyKey, expectedRevision?, ...dados }`. O navegador gera uma chave por intenção (`newIdempotencyKey()`) e a reaproveita nas retentativas.

`withIdempotency(ctx, operation, key, payloadHash, fn)` (`~/platform/idempotency`; `defineCommand` já o chama): uma transação reserva a chave (`chaves_idempotencia`, único por barbearia+ator+operação+chave), executa `fn(tx)` e grava o resultado. Mesma chave + mesmo payload → o resultado da 1ª execução, sem reexecutar; payload diferente → `IDEMPOTENCY.KEY_REUSED`; duas chamadas simultâneas → a 2ª espera no índice único e repete o resultado da 1ª; `fn` lançando desfaz tudo e a chave volta a ficar livre. `hashPayload(valor)` é SHA-256 do JSON canônico.

Concorrência otimista: toda tabela mutável tem `revisao` (`mutableColumns()`); `assertRevision(expected, atual)` ou `requireUpdatedRow(linhasDoUpdateCondicionado)` → `CONCURRENCY.REVISION_CONFLICT` (409). Transações: `withTransaction(ctx, fn)` (`READ COMMITTED`, repete até 3× em deadlock/serialização; `fn` pode rodar mais de uma vez, sem efeitos externos dentro). Ordem de locks: cliente → assinatura/ciclo → plano → barbeiro → período.

## 6. Banco (`~/platform/db`)

- `getDatabase()` (pool lazy do `DATABASE_URL`; sob teste só aceita `*_test`), `setDatabase(db)` (testes), tipos `Db`, `Tx`, `Executor`.
- Convenção de schema: cada módulo tem `modules/<m>/schema.ts` e acrescenta **uma linha** de export em `src/platform/db/schema/index.ts` (imports **relativos** nesse arquivo, o drizzle-kit não resolve `~/`).
- Colunas padrão (`~/platform/db`): `mutableColumns()` (`id` UUID v7, `barbearia_id` FK, `criado_em`, `atualizado_em`, `revisao`), `baseColumns()` (históricos append-only), `centavos(nome)` (`bigint`), `basisPoints(nome)`, `instant(nome)` (`timestamptz`), `localDateColumn(nome)`, `anchorDayColumn()`. Relação entre agregados: `unique(...).on(t.barbeariaId, t.id)` na tabela de destino e FK composta `(barbearia_id, id)`; `barbearia_id` é o primeiro campo dos índices.
- Tabelas da plataforma: `barbearias` (id, slug único, nome, fuso), `auditoria` (append-only por trigger), `chaves_idempotencia`.
- Seed: `pnpm db:seed` cria a barbearia de `BARBEARIA_SLUG` (opcional `BARBEARIA_NOME`, `BARBEARIA_FUSO`; padrão `America/Sao_Paulo`). Idempotente; não sobrescreve configuração.
- Migrações: `pnpm db:generate` + `pnpm db:migrate`. O trigger `auditoria_append_only` está escrito à mão no fim de `0000_t02_plataforma_base.sql`; o drizzle-kit não o modela, então ele fica ao regenerar migrações **novas** (nunca edite migração aplicada).

## 7. Auditoria (`~/platform/audit`)

`auditWriter.record(tx, ctx, { action, resource: { type, id }, before?, after?, reason? })` na **mesma transação** do efeito: rollback não deixa linha. Guarda ator (nulo para sistema), papéis, `correlation_id`. `before`/`after` são **reduzidos** (só campos relevantes), passam pela redaction (segredos removidos, telefone mascarado) e acima de 16 KB a gravação falha fechada. `UPDATE`/`DELETE` na tabela são recusados pelo banco.

## 8. Dinheiro (`~/platform/money`)

`Money` = inteiro seguro em centavos (nunca float). `money(n)`, `addMoney`, `subtractMoney`, `sumMoney`, `multiplyMoney(m, quantidadeInteira)`, `applyBasisPoints(base, bp)` (meio para cima; `5000 bp` de 1 centavo = 1; `3333 bp` de R$ 129,90 = R$ 43,30; só aceita base e bp não negativos), `formatBRL` (`R$ 1.299,90`), `parseBRL('1.299,90')`. Colunas: `centavos()`. `tests/security/dominio.test.ts` proíbe `parseFloat`/`toFixed` em `src/modules`.

## 9. Tempo (`~/platform/time`)

Biblioteca de fuso: **Luxon**, encapsulada em `time/zone.ts` (o resto só vê `LocalDate`, `LocalTime`, `TimeZone`, `Date`). `Clock` (`systemClock`, `createManualClock` com `set`/`advance` nos testes; **nenhum `Date.now()`/`new Date()` em `src/modules`**, vigiado por teste). `localDate(instante, fuso)`, `localTime`, `zonedInstant(data, hora, fuso)` (hora inexistente avança pelo salto; repetida usa a primeira ocorrência), `localDayRange`, `addDays`, `containsInstant(range, instante)` (intervalo **`[início, fim)`**).

- `addMonthsAnchored(data, n, diaAncora)` (D0080): mesmo dia do mês; se não existir, último dia; o dia original volta (31/01 → 28/02 → 31/03; 29/02/2028 → 29/03; âncora 30 em fev. → 28 ou 29).
- `cycleRange(inicio: Date, diaAncora, fuso) → { start, end }`: o fim é o **mesmo horário de relógio da barbearia** no mês seguinte, ancorado; o ciclo seguinte começa em `end` com a mesma âncora; pagamento atrasado começa no instante de aprovação com a âncora nova (`anchorDayOf(localDate(aprovacao, fuso))`).

## 10. IDs (`~/platform/ids`)

`newId(clock?)` UUID v7 (ordenável, monotônico no processo), `isUuid`, `isUuidV7`, `uuidV7Timestamp`. É o `$defaultFn` de `idColumn()`.

## 11. Logging (`~/platform/logging`)

`logger` (pino) e `createLogger({ level, destination })`. Todo argumento passa por `redactSensitive`: chaves com `otp`, `token`, `password`, `senha`, `secret`, `authorization`, `cookie`, `cartao`, `cvv`, `signature`… viram `[redigido]`; telefone (por chave ou em texto) sai `+55*******4321`. `logger.child({ correlationId })` propaga o id. Erros viram `{ err: { name, message, stack } }`. Em testes `LOG_LEVEL=silent`.

## 12. Ports e fakes (`~/contracts`, `~/contracts/fakes`)

Interfaces: `JobQueue` (`enqueueInTx`, `enqueue`, `cancelByKey`), `Outbox` (`publishInTx`), `PaymentProvider` (com `capabilities`: `provado | nao_suportado | nao_verificado` por chave), `NotificationProvider` (canais `otp`/`avisos`), `PushProvider`, `StorageProvider`, `MetricsSink`, `AuditWriter`, `Clock`, `SessionResolver`. Fakes em memória: `FakeJobQueue`, `FakeOutbox`, `FakePaymentProvider`, `FakeNotificationProvider`, `FakePushProvider`, `FakeStorageProvider`, `FakeMetricsSink`, `FakeAuditWriter`, `FakeSessionResolver`. Os fakes não simulam rollback de transação; para isso use Postgres real. Implementações reais: T03 (jobs/outbox), T09–T11 (adapters), T08 (R2), T30 (push), T36 (métricas).

## 13. Eventos de domínio

`DomainEvent = { id, type, version, barbeariaId, aggregateId, aggregateRevision, occurredAt, correlationId, payload }`. Cada módulo declara em `events.ts`:

```ts
import { defineEvent } from '~/platform/context'
export const ReservationConfirmed = defineEvent<'ReservationConfirmed', { reservaId: string }>(
  'ReservationConfirmed',
  1,
)
// na transação: await outbox.publishInTx(tx, ReservationConfirmed.create(ctx, { aggregateId, aggregateRevision, payload }))
```

## 14. Validação (`~/platform/validation`)

- **Ambiente no boot:** `loadEnv()` valida `process.env` com Zod e falha listando só os **nomes** das variáveis (nunca valores). Exige hoje `DATABASE_URL` e `BARBEARIA_SLUG`; as variáveis de integração (`MERCADO_PAGO_*`, `WOOVI_*`, `WHATSAPP_*`, `R2_*`, `VAPID_*`, `BETTER_AUTH_SECRET`, `GOOGLE_*`, `APP_URL`) são **opcionais** até a task dona exigi-las. Chame `loadEnv()` na primeira linha de cada processo (web e worker; T03 no `worker.ts`). O dispatcher e `getDatabase()` já o chamam. `pnpm env:check` confere o `.env.local`.
- Em dev, o `vite.config.ts` carrega o `.env.local` no `process.env` do servidor (o Vite só expõe `VITE_*` ao cliente).
- Mensagens de validação em pt-BR sem eco do valor (`mensagemSegura`). Schemas prontos: `uuidSchema`, `centavosSchema`, `pontosBaseSchema`, `idempotencyKeySchema`, `dataLocalSchema`, `horaLocalSchema`, `diaAncoraSchema`, `revisaoSchema`.

## 15. Testes e comandos

`pnpm test:unit` (inclui `tests/unit`, `tests/security`, `tests/contract`), `pnpm test:integration` (Postgres `barbearia_test`; o `global-setup` aplica migrações e zera os dados; use `abrirBancoDeTeste()` de `tests/integration/helpers/banco.ts`), `pnpm verify`.
