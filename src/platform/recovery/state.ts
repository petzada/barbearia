import { eq } from 'drizzle-orm'
import type { RequestContext } from '~/contracts/context'
import { auditWriter } from '../audit/writer'
import { getDatabase } from '../db/runtime'
import type { Executor } from '../db/types'
import { SystemErrors } from '../errors/generic'
import { newId } from '../ids'
import { estadoRecuperacao, type LinhaEstadoRecuperacao } from './schema'

export interface RecoveryStatus {
  readonly active: boolean
  readonly restoredPoint: Date | null
  readonly activatedBy: string | null
  readonly reason: string | null
  readonly activatedAt: Date | null
}

const INATIVO: RecoveryStatus = {
  active: false,
  restoredPoint: null,
  activatedBy: null,
  reason: null,
  activatedAt: null,
}

function toStatus(linha: LinhaEstadoRecuperacao | undefined): RecoveryStatus {
  if (!linha) return INATIVO
  return {
    active: linha.ativo,
    restoredPoint: linha.pontoRestaurado,
    activatedBy: linha.ativadoPor,
    reason: linha.motivo,
    activatedAt: linha.ativadoEm,
  }
}

export async function getRecoveryStatus(
  ctx: Pick<RequestContext, 'barbeariaId'>,
  executor: Executor = getDatabase(),
): Promise<RecoveryStatus> {
  const [linha] = await executor
    .select()
    .from(estadoRecuperacao)
    .where(eq(estadoRecuperacao.barbeariaId, ctx.barbeariaId))
  return toStatus(linha)
}

/** D0078: efeitos externos e jobs de efeito consultam isto antes de agir. Sem linha = modo normal. */
export async function isRecoveryMode(
  ctx: Pick<RequestContext, 'barbeariaId'>,
  executor: Executor = getDatabase(),
): Promise<boolean> {
  return (await getRecoveryStatus(ctx, executor)).active
}

/** Recusa com `SYSTEM.RECOVERY_MODE` (503) quando o operador ativou o modo recuperação. */
export async function assertNotRecoveryMode(
  ctx: Pick<RequestContext, 'barbeariaId'>,
  executor: Executor = getDatabase(),
): Promise<void> {
  if (await isRecoveryMode(ctx, executor)) throw SystemErrors.RECOVERY_MODE()
}

export interface SetRecoveryModeInput {
  readonly active: boolean
  /** Quem executou (nome do operador). Texto livre, vai para a auditoria. */
  readonly operator: string
  /** Obrigatório: por que o modo foi ligado ou desligado. */
  readonly reason: string
  /** Instante do backup restaurado (só faz sentido ao ligar). */
  readonly restoredPoint?: Date
}

/**
 * Liga ou desliga o modo recuperação. Chamado só pelo CLI do operador (`pnpm ops:recovery`): não existe
 * rota nem operação de usuário para isto (D0078; `tests/security/recuperacao.test.ts` vigia).
 * Ligar/desligar fica na auditoria append-only com operador e motivo.
 */
export async function setRecoveryMode(
  ctx: RequestContext,
  input: SetRecoveryModeInput,
  db = getDatabase(),
): Promise<RecoveryStatus> {
  const reason = input.reason.trim()
  const operator = input.operator.trim()
  if (reason === '') throw new Error('O motivo é obrigatório para alterar o modo recuperação.')
  if (operator === '') throw new Error('O operador é obrigatório para alterar o modo recuperação.')

  return db.transaction(async (tx) => {
    const antes = await getRecoveryStatus(ctx, tx)
    const agora = ctx.clock.now()
    const valores = {
      ativo: input.active,
      pontoRestaurado: input.active ? (input.restoredPoint ?? null) : antes.restoredPoint,
      ativadoPor: operator,
      motivo: reason,
      ativadoEm: agora,
      atualizadoEm: agora,
    }
    await tx
      .insert(estadoRecuperacao)
      .values({ id: newId(ctx.clock), barbeariaId: ctx.barbeariaId, ...valores })
      .onConflictDoUpdate({ target: estadoRecuperacao.barbeariaId, set: valores })
    const depois = await getRecoveryStatus(ctx, tx)
    await auditWriter.record(tx, ctx, {
      action: input.active ? 'recovery.activate' : 'recovery.deactivate',
      resource: { type: 'estado_recuperacao', id: ctx.barbeariaId },
      before: { ativo: antes.active },
      after: { ativo: depois.active, operador: operator, pontoRestaurado: depois.restoredPoint },
      reason,
    })
    return depois
  })
}
