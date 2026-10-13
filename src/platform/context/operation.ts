import { z } from 'zod'
import type { Clock } from '~/contracts/clock'
import type { CommandMeta } from '~/contracts/command'
import type { AuthenticatedContext, RequestContext } from '~/contracts/context'
import type { Jsonify } from '~/contracts/json'
import type { OkResult, PendingResult, Result } from '~/contracts/result'
import type { ResolvedSession } from '~/contracts/session'
import { requireAuthenticated, requireRecentAuth, requireRole } from '../authz/guards'
import { PUBLIC_OPERATIONS } from '../authz/public-allowlist'
import { isPolicy, type Policy } from '../authz/policies'
import { getDatabase } from '../db/runtime'
import type { Db, Tx } from '../db/types'
import { ValidationErrors } from '../errors/generic'
import { errorToResult } from '../errors/to-result'
import { isAppError } from '../errors/app-error'
import { hashPayload } from '../idempotency/hash'
import { withIdempotency } from '../idempotency/with-idempotency'
import { logger } from '../logging'
import { configurarMensagensDeValidacao } from '../validation/messages'
import { idempotencyKeySchema, revisaoSchema } from '../validation/schemas'
import { zodIssuesToFields } from '../validation/fields'
import { createRequestContext } from './request-context'
import { defaultRegistry, type OperationRegistry } from './registry'

const PADRAO_NOME_OPERACAO = /^[a-z][a-z0-9_]*\.[a-z][A-Za-z0-9_]*$/

/** Tudo que o servidor sabe sobre a requisição, já fora do navegador (D0019: `barbeariaId` do deploy). */
export interface ExecutionEnvironment {
  readonly barbeariaId: string
  readonly clock: Clock
  readonly correlationId: string
  readonly session: ResolvedSession | null
}

/** Contexto que o handler recebe: autenticado quando a política exige sessão. */
export type ContextFor<TPolicy extends Policy> = TPolicy extends { kind: 'public' }
  ? RequestContext
  : AuthenticatedContext

export type RecentAuthRequirement = true | { readonly windowMs: number }

interface BaseDefinition<TName extends string, TSchema extends z.ZodType, TPolicy extends Policy> {
  /** `<modulo>.<operacao>`: aparece em log, auditoria, chave de idempotência e na allowlist pública. */
  readonly name: TName
  /** Schema Zod da entrada (sem o envelope de comando). Obrigatório. */
  readonly input: TSchema
  /** Política de autorização. Obrigatória; `public` só com o nome na allowlist. */
  readonly policy: TPolicy
  /** D0071: exige login recente (padrão 1 h; `{ windowMs }` para outra janela). */
  readonly requireRecentAuth?: RecentAuthRequirement
  /** Checagem de recurso (dono, vínculo) depois da política e da validação: use `requireOwnership`. */
  readonly authorize?: (args: {
    ctx: ContextFor<TPolicy>
    input: z.output<TSchema>
  }) => void | Promise<void>
}

export interface QueryDefinition<
  TName extends string,
  TSchema extends z.ZodType,
  TPolicy extends Policy,
  TOutput,
> extends BaseDefinition<TName, TSchema, TPolicy> {
  readonly handler: (args: {
    ctx: ContextFor<TPolicy>
    input: z.output<TSchema>
    db: Db
  }) => Promise<OkResult<TOutput>>
}

export interface CommandDefinition<
  TName extends string,
  TSchema extends z.ZodType,
  TPolicy extends Policy,
  TOutput,
> extends BaseDefinition<TName, TSchema, TPolicy> {
  /** `required`: sem `expectedRevision` a validação falha. Padrão: `optional`. */
  readonly revision?: 'required' | 'optional'
  /**
   * Roda dentro de `withIdempotency` (uma transação): escreva o dado, a auditoria (`auditWriter.record(tx, …)`)
   * e o outbox na MESMA `tx`. Lance `AppError` para recusar; nunca chame provedor externo aqui.
   */
  readonly handler: (args: {
    ctx: ContextFor<TPolicy>
    input: z.output<TSchema>
    tx: Tx
    expectedRevision: number | undefined
    idempotencyKey: string
  }) => Promise<OkResult<TOutput> | PendingResult>
}

export interface Operation<
  TKind extends 'query' | 'command',
  TName extends string,
  TInput,
  TOutput,
> {
  readonly kind: TKind
  readonly name: TName
  readonly policy: Policy
  /** Executa o pipeline completo (política → validação → auth recente → handler). Nunca lança. */
  readonly run: (env: ExecutionEnvironment, rawInput: unknown) => Promise<Result<Jsonify<TOutput>>>
  /** Só tipos (para `remoteOperation`); não existe em tempo de execução. */
  readonly '~types': { readonly input: TInput; readonly output: Jsonify<TOutput> }
}

/** Forma comum a todas as operações, usada pelo registro e pelo dispatcher. */
export interface AnyOperation {
  readonly kind: 'query' | 'command'
  readonly name: string
  readonly policy: Policy
  readonly run: (env: ExecutionEnvironment, rawInput: unknown) => Promise<Result<unknown>>
  readonly '~types': { readonly input: unknown; readonly output: unknown }
}

/** Tipo de entrada que o navegador envia (comando: dados + `idempotencyKey` + `expectedRevision?`). */
export type OperationInput<TOp extends AnyOperation> = TOp['~types']['input']
/** Tipo do `data` do resultado `ok`, como o navegador o recebe (JSON). */
export type OperationOutput<TOp extends AnyOperation> = TOp['~types']['output']

const commandMetaSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
  expectedRevision: revisaoSchema.optional(),
})

export class OperationDefinitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OperationDefinitionError'
  }
}

function assertDefinition(
  def: { name: string; input: unknown; policy: unknown },
  allowlist: readonly string[],
): void {
  if (!PADRAO_NOME_OPERACAO.test(def.name)) {
    throw new OperationDefinitionError(
      `Nome de operação inválido: "${def.name}" (use modulo.operacao).`,
    )
  }
  if (!isPolicy(def.policy)) {
    throw new OperationDefinitionError(
      `A operação "${def.name}" não declarou política de autorização.`,
    )
  }
  if (typeof (def.input as { safeParse?: unknown } | null)?.safeParse !== 'function') {
    throw new OperationDefinitionError(
      `A operação "${def.name}" não declarou schema Zod de entrada.`,
    )
  }
  if (def.policy.kind === 'public' && !allowlist.includes(def.name)) {
    throw new OperationDefinitionError(
      `A operação "${def.name}" é pública mas não está na allowlist (src/platform/authz/public-allowlist.ts).`,
    )
  }
}

function enforcePolicy(policy: Policy, ctx: RequestContext): void {
  switch (policy.kind) {
    case 'public':
      return
    case 'authenticated':
      requireAuthenticated(ctx)
      return
    case 'roles':
      requireRole(ctx, ...policy.roles)
  }
}

function parseData(schema: z.ZodType, raw: unknown): unknown {
  const resultado = schema.safeParse(raw)
  if (!resultado.success)
    throw ValidationErrors.FAILED({ fields: zodIssuesToFields(resultado.error) })
  return resultado.data
}

/** Separa o envelope do comando dos dados e valida os dois, juntando os erros de campo. */
function parseCommand(
  dataSchema: z.ZodType,
  revision: 'required' | 'optional',
  raw: unknown,
): { data: unknown; meta: CommandMeta } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw ValidationErrors.FAILED({
      fields: [{ path: '', message: 'Corpo da requisição inválido.' }],
    })
  }
  const { idempotencyKey, expectedRevision, ...dados } = raw as Record<string, unknown>
  const meta = commandMetaSchema.safeParse({ idempotencyKey, expectedRevision })
  const data = dataSchema.safeParse(dados)
  const fields = [
    ...(meta.success ? [] : zodIssuesToFields(meta.error)),
    ...(data.success ? [] : zodIssuesToFields(data.error)),
    ...(revision === 'required' && expectedRevision === undefined
      ? [{ path: 'expectedRevision', message: 'Campo obrigatório.' }]
      : []),
  ]
  if (fields.length > 0 || !meta.success || !data.success) throw ValidationErrors.FAILED({ fields })
  return { data: data.data, meta: meta.data }
}

/** Todo resultado sai como JSON puro: é o que o cliente recebe e o que a idempotência repete. */
function toJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T
}

function logOutcome(
  name: string,
  kind: string,
  ctx: RequestContext,
  startedAt: number,
  result: Result<unknown>,
  error?: unknown,
): void {
  const base = {
    operation: name,
    kind,
    correlationId: ctx.correlationId,
    actorId: ctx.actorId,
    durationMs: Math.round(performance.now() - startedAt),
  }
  if (result.status !== 'error') {
    logger.info({ ...base, status: result.status }, 'operação concluída')
  } else if (isAppError(error)) {
    // Erro esperado: sem stack e sem entrada (a entrada pode ter dado pessoal).
    logger.info({ ...base, status: 'error', code: result.code }, 'operação recusada')
  } else {
    logger.error({ ...base, status: 'error', code: result.code, err: error }, 'operação falhou')
  }
}

type Authorizer = (args: { ctx: never; input: never }) => void | Promise<void>

async function runChecks(
  def: {
    policy: Policy
    requireRecentAuth?: RecentAuthRequirement | undefined
    authorize?: Authorizer | undefined
  },
  ctx: RequestContext,
  input: unknown,
): Promise<void> {
  if (def.requireRecentAuth) {
    const options =
      def.requireRecentAuth === true ? {} : { windowMs: def.requireRecentAuth.windowMs }
    requireRecentAuth(ctx, options)
  }
  if (def.authorize) await def.authorize({ ctx: ctx as never, input: input as never })
}

export interface OperationFactoryOptions {
  /** Allowlist das operações públicas. Em produção é `PUBLIC_OPERATIONS`; testes injetam outra. */
  readonly publicAllowlist: readonly string[]
  readonly registry: OperationRegistry
}

export function createOperationFactory(options: OperationFactoryOptions) {
  configurarMensagensDeValidacao()

  function defineQuery<
    const TName extends string,
    TSchema extends z.ZodType,
    TPolicy extends Policy,
    TOutput,
  >(
    def: QueryDefinition<TName, TSchema, TPolicy, TOutput>,
  ): Operation<'query', TName, z.input<TSchema>, TOutput> {
    assertDefinition(def, options.publicAllowlist)

    const operation: Operation<'query', TName, z.input<TSchema>, TOutput> = {
      kind: 'query',
      name: def.name,
      policy: def.policy,
      '~types': {} as never,
      async run(env, rawInput) {
        const ctx = createRequestContext(env)
        const startedAt = performance.now()
        try {
          enforcePolicy(def.policy, ctx)
          const input = parseData(def.input, rawInput)
          await runChecks(def, ctx, input)
          const out = await def.handler({
            ctx: ctx as ContextFor<TPolicy>,
            input: input as z.output<TSchema>,
            db: getDatabase(),
          })
          const result = toJson(out) as Result<Jsonify<TOutput>>
          logOutcome(def.name, 'query', ctx, startedAt, result)
          return result
        } catch (error) {
          const result = errorToResult(error, ctx.correlationId) as Result<Jsonify<TOutput>>
          logOutcome(def.name, 'query', ctx, startedAt, result, error)
          return result
        }
      },
    }
    options.registry.register(operation)
    return operation
  }

  function defineCommand<
    const TName extends string,
    TSchema extends z.ZodType,
    TPolicy extends Policy,
    TOutput,
  >(
    def: CommandDefinition<TName, TSchema, TPolicy, TOutput>,
  ): Operation<'command', TName, z.input<TSchema> & CommandMeta, TOutput> {
    assertDefinition(def, options.publicAllowlist)
    const revision = def.revision ?? 'optional'

    const operation: Operation<'command', TName, z.input<TSchema> & CommandMeta, TOutput> = {
      kind: 'command',
      name: def.name,
      policy: def.policy,
      '~types': {} as never,
      async run(env, rawInput) {
        const ctx = createRequestContext(env)
        const startedAt = performance.now()
        try {
          enforcePolicy(def.policy, ctx)
          const { data, meta } = parseCommand(def.input, revision, rawInput)
          await runChecks(def, ctx, data)
          const payloadHash = hashPayload({ data, expectedRevision: meta.expectedRevision ?? null })
          const out = await withIdempotency(ctx, def.name, meta.idempotencyKey, payloadHash, (tx) =>
            def.handler({
              ctx: ctx as ContextFor<TPolicy>,
              input: data as z.output<TSchema>,
              tx,
              expectedRevision: meta.expectedRevision,
              idempotencyKey: meta.idempotencyKey,
            }),
          )
          const result = toJson(out) as Result<Jsonify<TOutput>>
          logOutcome(def.name, 'command', ctx, startedAt, result)
          return result
        } catch (error) {
          const result = errorToResult(error, ctx.correlationId) as Result<Jsonify<TOutput>>
          logOutcome(def.name, 'command', ctx, startedAt, result, error)
          return result
        }
      },
    }
    options.registry.register(operation)
    return operation
  }

  return { defineQuery, defineCommand }
}

/**
 * Construtores oficiais (PRD §7.3). Toda server function do sistema nasce de um destes dois:
 * não existe outro caminho para expor uma operação ao navegador (ver `dispatcher.ts` e o teste de varredura).
 *
 * ```ts
 * // modules/scheduling/server.ts  (só roda no servidor)
 * export const cancelarReserva = defineCommand({
 *   name: 'scheduling.cancelarReserva',
 *   input: z.object({ reservaId: uuidSchema }),
 *   policy: policies.anyRole('cliente', 'barbeiro', 'admin'),
 *   revision: 'required',
 *   handler: async ({ ctx, input, tx, expectedRevision }) => { … return ok({ reservaId }, novaRevisao) },
 * })
 * ```
 */
export const { defineQuery, defineCommand } = createOperationFactory({
  publicAllowlist: PUBLIC_OPERATIONS,
  registry: defaultRegistry,
})
