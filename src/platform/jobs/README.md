# Durabilidade: jobs, outbox, inbox, operações externas e recuperação (T03)

Dona: **T03**. Consumidoras: T09–T11 (adapters), T13+ (módulos), T30 (pendências/push), T36 (métricas), T39/T40 (recuperação).
Pastas: `src/platform/{jobs,outbox,inbox,external-ops,recovery}` e `src/worker.ts`. Contratos (`JobQueue`, `Outbox`, `DomainEvent`) continuam em `~/contracts`.

Os exemplos abaixo existem **executados**: `tests/integration/{jobs-transacao,outbox,inbox,operacoes-externas,recuperacao,worker}.test.ts` e `tests/unit/{jobs-retry,jobs-execucao,inbox-e-adaptador}.test.ts`.

## 0. Decisão: pg-boss na transação × outbox (PRD §7.5, D0016)

**O pg-boss 12.38.0 consegue enfileirar na transação do Drizzle.** Cada chamada (`send`, `cancel`, `findJobs`) aceita `db: { executeSql(texto, valores) }`; `drizzleExecutorAsBossDb(tx)` (`jobs/tx-adapter.ts`) adapta um `Tx` do Drizzle a essa interface, trocando os `$n` do pg-boss por parâmetros do Drizzle (o lexer ignora `$n` em literais, comentários e blocos `$tag$`). Resultado:

- `enqueueInTx(tx, job)` grava a linha em `pgboss.job` **dentro** da transação do dado: commit confirma dado + auditoria + job; rollback desfaz os três.
- **Evidência:** `tests/integration/jobs-transacao.test.ts` ("rollback da transação não deixa job nem auditoria": o job existe dentro da transação, o `jobId` é devolvido e, depois do rollback, `pgboss.job` não tem a linha; "commit confirma o dado, a auditoria e o job juntos").
- Por isso **jobs não precisam de outbox**. A tabela `outbox` existe para **eventos de domínio** (§2): entrega a vários handlers por tipo, com idempotência `(handler, eventId)`, e não é um desvio para o pg-boss.
- Ressalva: o pg-boss grava no mesmo Postgres do app (schema `pgboss`). Se um dia a fila migrar para Redis (D0016), `enqueueInTx` passa a exigir o outbox de jobs; a interface `JobQueue` não muda.

## 1. Jobs (`~/platform/jobs`)

```ts
// modules/agenda/jobs.ts — o worker importa todo modules/*/jobs.ts no boot
import { defineQueue, registerJobHandler, PermanentJobError } from '~/platform/jobs'

export const LembreteQueue = defineQueue({
  name: 'agenda.lembrete', // modulo.acao
  dedupe: 'by-key', // no máximo UM job aguardando por singletonKey (obrigatória nesta fila)
  externalEffect: true, // envia WhatsApp: pausada em modo recuperação
  retry: { delaysMs: [0, 60_000, 300_000] }, // opcional; padrão: imediato, 1, 5, 15, 60 min (±20% de jitter)
})

registerJobHandler<{ reservaId: string }>(LembreteQueue, async ({ payload, ctx, attempt }) => {
  // idempotente: pode rodar mais de uma vez. ctx = contexto de sistema com o correlationId de quem enfileirou.
  // lançar PermanentJobError (ou AppError não retentável) = pendência imediata, sem retentativa.
})
```

```ts
// dentro de um comando (defineCommand): o job nasce na transação do dado
import { getJobQueue } from '~/platform/jobs'
await getJobQueue().enqueueInTx(tx, {
  queue: LembreteQueue.name,
  payload: { reservaId },
  singletonKey: `lembrete:${reservaId}`, // dedupe e cancelamento por chave
  startAfter: instanteDoLembrete, // agendamento por instante
  correlationId: ctx.correlationId,
})
await getJobQueue().cancelByKeyInTx(tx, { queue: LembreteQueue.name, singletonKey: `lembrete:${reservaId}` }) // cancela o que ainda não rodou
```

Regras:

- `defineQueue` é obrigatório (fila desconhecida = erro). `dedupe: 'by-key'` usa a política `short` do pg-boss: um job **aguardando** por chave; enquanto um roda, outro pode ser agendado. Em fila `none` não se passa `singletonKey`.
- **Retentativa (PRD §7.6):** o wrapper do worker aplica a política. Falha transitória → reenvia o job com `attempt+1` e a espera `[imediato, 1, 5, 15, 60 min]` ±20%; `RetryableJobError({ retryAfterMs })` respeita `Retry-After`; permanente (`PermanentJobError`, `AppError` não retentável) ou esgotada → `setDeadLetterHook` (pendência), **sem loop**. O pg-boss só retenta (2×, 60 s) o que o wrapper nunca viu: crash do processo e expiração; o que ele esgota cai na fila `system.dead-letter`, que o worker consome e reporta como `expired`.
- **Dead letter → pendência:** `setDeadLetterHook(async (evento) => { ... })` (T30 troca o hook padrão, que só registra em log). Fontes: `job`, `outbox`, `inbox`, `external-op`. Chamado **depois** do commit; deve ser idempotente.
- Classificar HTTP: `classifyHttpStatus(status)` (408/425/429/5xx transitório; demais 4xx permanente) e `parseRetryAfter`.
- Produtor (web) e consumidor (worker) usam a mesma API; `getBoss('worker')` liga supervisão e agendador, `getBoss()` só enfileira.

## 2. Outbox de eventos de domínio (`~/platform/outbox`)

```ts
// modules/agenda/events.ts (T02): defineEvent(...)  ·  na transação do dado:
import { drizzleOutbox } from '~/platform/outbox'
await drizzleOutbox.publishInTx(tx, ReservationConfirmed.create(ctx, { aggregateId, aggregateRevision, payload }))

// modules/notificacoes/jobs.ts
import { registerEventHandler } from '~/platform/outbox'
registerEventHandler({
  name: 'notificacoes.avisar-reserva', // único e estável: metade da chave de idempotência
  eventType: 'ReservationConfirmed',
  handle: async (evento, { tx, ctx }) => {
    // só efeito no BANCO aqui (roda na transação do dispatcher, junto com o registro da entrega).
    await getJobQueue().enqueueInTx(tx, { queue: '...', payload: { ... } }) // efeito externo vira job
  },
})
```

- `publishInTx` grava `outbox` (id = id do evento: publicar duas vezes não duplica). O dispatcher (loop do worker, 1 s) pega eventos com `FOR UPDATE SKIP LOCKED` e entrega a cada handler do tipo num **savepoint**: `outbox_entregas (handler, evento_id)` é inserida na mesma transação; se já existir, o handler **não roda de novo** (provado: entrega repetida e dois dispatchers concorrentes).
- Handler que lança desfaz o próprio efeito, não afeta os outros handlers e o evento é retentado pela política (`DEFAULT_RETRY_POLICY`); permanente/esgotado → `outbox.estado = 'falhou'` + pendência.
- Eventos `processado` ficam na tabela (rastro). Limpeza/retensão é pendência (P3) para a T36/T40.

## 3. Inbox de webhooks (`~/platform/inbox`)

```ts
// routes/api/webhooks/mercado-pago.ts (T10)
import { receiveWebhook, registerInboxHandler } from '~/platform/inbox'

const adapter = {
  provider: 'mercado-pago',
  verify: ({ rawBody, headers }) => validarXSignature(rawBody, headers) ? { ok: true } : { ok: false, reason: 'x-signature' },
  parse: ({ rawBody, headers }) => ({ account, environment: 'test', eventId, headers: { 'x-request-id': headers.get('x-request-id') ?? '' } }),
}
// handler da rota: return receiveWebhook(request, adapter)

// integrations/mercado-pago/...: processamento assíncrono (job inbox.process)
registerInboxHandler('mercado-pago', async (registro, ctx) => {
  // registro.body é só pista: consulte /v1/payments/{id}. PermanentJobError = falhou + pendência.
})
```

`receiveWebhook(request, adapter, deps?)`: limita o corpo (256 KB; `413`) → `verify` (falhou = `401`, sem persistir) → `parse` (ilegível = `400`) → **numa transação** insere em `inbox_provedor` (único por barbearia+provedor+conta+ambiente+evento) **e** enfileira `inbox.process` → só então `200 { ok, duplicate }`. Falha de persistência = `503` (o provedor reenvia). Webhook repetido = 1 registro, 1 job, 200. O corpo guardado passa por `scrubCardData` (PAN com bandeira + Luhn vira `[cartao-removido]`); o hash é do corpo original; cabeçalhos passam pela redaction (assinatura/token viram `[redigido]`).

Estados: `recebido` → `processando` → `processado` | `falhou`. `reprocessInboxRecord({ inboxId, reason, requestedBy })` devolve a `recebido`, conta o reprocessamento, enfileira e audita; **nunca apaga nem reescreve** corpo, hash ou `recebido_em`. A fila `inbox.process` é de efeito externo: em modo recuperação os webhooks continuam sendo **recebidos e persistidos**, mas só são processados depois da liberação.

## 4. Operações externas (`~/platform/external-ops`)

```ts
import { defineExternalOperation, ExternalNotAppliedError, runExternalOperation } from '~/platform/external-ops'
import { PermanentJobError } from '~/platform/jobs'

export const CancelarAssinaturaMp = defineExternalOperation<{ preapprovalId: string }, { status: string }>({
  type: 'mercado-pago.cancelar-assinatura', // registrada: o worker precisa dela para reconciliar/repetir
  timeoutMs: 15_000,
  execute: async ({ preapprovalId }, { idempotencyKey, signal }) => {
    // 429/conexão recusada → throw new ExternalNotAppliedError(...)  (seguro repetir)
    // 4xx de configuração   → throw new PermanentJobError(...)       (falhou + pendência)
    // timeout/rede/5xx      → qualquer outro erro                      (incerta)
  },
  reconcile: async ({ preapprovalId }) => {
    // GET no provedor: { outcome: 'applied', result } | { outcome: 'not_applied' } | { outcome: 'unknown' }
  },
})

// no application service (fora de transação longa):
const r = await runExternalOperation(ctx, CancelarAssinaturaMp, {
  idempotencyKey: `cancelar:${assinaturaId}`, // uma por intenção de negócio
  target: `assinatura:${assinaturaId}`,
  input: { preapprovalId }, // vai para `operacoes_externas.entrada`: nunca segredo nem cartão
})
// r.status: 'confirmada' (r.result) | 'incerta' | 'pendente' | 'em_andamento' | 'falhou'
```

`runExternalOperation`: recusa com `SYSTEM.RECOVERY_MODE` → **persiste a intenção e dá commit** → chama (timeout) → registra o resultado e o job de continuação **na mesma transação**. Mesma chave devolve a mesma operação (sem segunda chamada se já `confirmada`; `IDEMPOTENCY.KEY_REUSED` se alvo/entrada diferem; execução simultânea devolve `em_andamento`).

- `incerta` (timeout, rede, 5xx, ou chamador que sumiu em `em_andamento` por mais de `timeoutMs`+60 s): o job `external-ops.advance` chama **`reconcile` antes de qualquer repetição**: `applied` → `confirmada` sem segunda chamada; `not_applied` → repete com a **mesma** chave de idempotência; `unknown` → continua `incerta` e reagenda (30 s, 2, 10, 30 min, depois de hora em hora, até 48×; esgotado = pendência). **Sem `reconcile`, uma operação incerta nunca é repetida sozinha** e abre pendência.
- `ExternalNotAppliedError` → `pendente` + retentativa pela política; `PermanentJobError` → `falhou` + pendência, sem job.

## 5. Modo recuperação (`~/platform/recovery`, D0078)

- Tabela `estado_recuperacao` (ativo, ponto restaurado, operador, motivo). **Só o operador altera**: `pnpm ops:recovery on --reason "restore de 30/01" [--restored-at 2027-01-30T03:00:00Z] [--operator nome]`, `pnpm ops:recovery off --reason "conciliação concluída (H06)"`, `pnpm ops:recovery status`. Cada mudança vai para a auditoria (append-only). Não há rota nem operação de usuário (`tests/security/recuperacao.test.ts` falha se `setRecoveryMode` aparecer em `src/`).
- `isRecoveryMode(ctx)` / `assertNotRecoveryMode(ctx)` (→ `SYSTEM.RECOVERY_MODE`, 503). Envios (WhatsApp, push) e mutações financeiras novas devem chamar `assertNotRecoveryMode` no começo. `runExternalOperation` já chama.
- Jobs de fila `externalEffect: true` **não executam** em modo recuperação: o wrapper os adia (30 s, sem gastar tentativa) até o operador liberar. Webhooks continuam sendo persistidos.
- A conciliação com os provedores desde o ponto restaurado (D0078) e o `off` autorizado (H06) são de T39/T40; aqui só existem a flag e os bloqueios.

## 6. Worker (`pnpm dev:worker`, `pnpm start:worker`)

`src/worker.ts`: `loadEnv()` na primeira linha → `startWorker()` → registra handlers da plataforma (`inbox.process`, `external-ops.advance`, `system.exemplo`) e de cada `modules/*/jobs.ts` (varredura de pasta + `import()`, pois fora do Vite não há `import.meta.glob`) → cria as filas → `boss.work` por fila + consumidor do dead letter + dispatcher do outbox. `SIGINT`/`SIGTERM` encerram com graça (espera os jobs em andamento, até 30 s).

`dev:worker` lê `.env.local` (`--env-file-if-exists`). Job de exemplo: em um terminal `pnpm dev:worker`, em outro `pnpm ops:example-job "olá"`; o worker registra `job de exemplo processado`. O worker precisa das migrações aplicadas (`outbox`, `operacoes_externas` etc.): `pnpm db:migrate`.

## Testes e limites conhecidos

- Os testes de integração criam filas e jobs no schema `pgboss` do banco `_test`, com nomes únicos por execução (o schema não é zerado entre execuções; `db:reset` derruba `public` e `drizzle`, não `pgboss`).
- Entrega **pelo menos uma vez**: handlers de job, de evento e de inbox precisam ser idempotentes. Um crash entre "reenviar" e "concluir o job" pode duplicar uma execução; a idempotência por chave (`singletonKey`, `(handler, evento)`, chave da operação) é o que protege o efeito.
- A retentativa reenvia um **novo** job (com `attempt+1`); o `jobId` muda entre tentativas (o `correlationId` não).
