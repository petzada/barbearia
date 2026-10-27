import { and, eq } from 'drizzle-orm'
import { auditWriter } from '~/platform/audit/writer'
import { normalizeBrazilianPhone } from '~/platform/auth/phone'
import { newId } from '~/platform/ids'
import { maskPhone } from '~/platform/logging'
import { IdentityErrors } from '../errors'
import { PhoneChanged } from '../events'
import type { IdentityDeps } from '../infra/deps'
import { usuarios, vinculosTelefone } from '../schema'
import { requestOtp, verifyOtp, type RequestOtpResult } from './otp-service'
import { activePhoneOf } from './users-service'
import { advisoryLock, contextoDeSistema } from './shared'

function exigirTelefone(raw: string): string {
  const telefone = normalizeBrazilianPhone(raw)
  if (!telefone) throw IdentityErrors.PHONE_INVALID()
  return telefone
}

/** A02, passo 1: envia o código ao número NOVO. A colisão só aparece ao confirmar (não enumera contas no envio). */
export async function requestPhoneChange(
  deps: IdentityDeps,
  input: { barbeariaId: string; usuarioId: string; novoTelefone: string; ip?: string | null; correlationId?: string },
): Promise<RequestOtpResult> {
  const phone = exigirTelefone(input.novoTelefone)
  const atual = await activePhoneOf(deps.db, input.barbeariaId, input.usuarioId)
  if (atual === phone) throw IdentityErrors.PHONE_UNCHANGED()
  return requestOtp(deps, {
    barbeariaId: input.barbeariaId,
    phone,
    finalidade: 'troca_telefone',
    usuarioId: input.usuarioId,
    ...(input.ip === undefined ? {} : { ip: input.ip }),
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
  })
}

/**
 * A02, passo 2 (RN01/D0070): número novo comprovado → troca. Colisão com vínculo ativo de OUTRA conta (ativa ou
 * pré-cadastrada) é rejeitada com orientação de suporte; contas nunca são fundidas. O vínculo antigo fica como
 * histórico (inativo); assinatura e histórico seguem no mesmo `usuarioId`.
 */
export async function confirmPhoneChange(
  deps: IdentityDeps,
  input: { barbeariaId: string; usuarioId: string; novoTelefone: string; code: string; correlationId?: string },
): Promise<{ telefoneMascarado: string }> {
  const phone = exigirTelefone(input.novoTelefone)
  await verifyOtp(deps, {
    barbeariaId: input.barbeariaId,
    phone,
    code: input.code,
    finalidade: 'troca_telefone',
    usuarioId: input.usuarioId,
  })
  const { db, clock } = deps
  const agora = clock.now()
  const ctx = contextoDeSistema(deps, input.barbeariaId, input.correlationId)
  return db.transaction(async (tx) => {
    await advisoryLock(tx, `usuario:tel:${input.barbeariaId}:${phone}`)
    const [usuario] = await tx
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.barbeariaId, input.barbeariaId), eq(usuarios.id, input.usuarioId)))
      .for('update')
    if (!usuario || usuario.estado !== 'ativo') throw IdentityErrors.USER_NOT_ELIGIBLE()
    const [ocupado] = await tx
      .select({ usuarioId: vinculosTelefone.usuarioId })
      .from(vinculosTelefone)
      .where(
        and(
          eq(vinculosTelefone.barbeariaId, input.barbeariaId),
          eq(vinculosTelefone.telefone, phone),
          eq(vinculosTelefone.ativo, true),
        ),
      )
    if (ocupado) {
      throw ocupado.usuarioId === input.usuarioId
        ? IdentityErrors.PHONE_UNCHANGED()
        : IdentityErrors.PHONE_IN_USE()
    }
    const [antigo] = await tx
      .update(vinculosTelefone)
      .set({ ativo: false, desativadoEm: agora, motivoDesativacao: 'troca_de_numero' })
      .where(
        and(
          eq(vinculosTelefone.barbeariaId, input.barbeariaId),
          eq(vinculosTelefone.usuarioId, input.usuarioId),
          eq(vinculosTelefone.ativo, true),
        ),
      )
      .returning({ telefone: vinculosTelefone.telefone })
    await tx.insert(vinculosTelefone).values({
      id: newId(clock),
      barbeariaId: input.barbeariaId,
      usuarioId: input.usuarioId,
      telefone: phone,
      verificadoEm: agora,
      criadoEm: agora,
    })
    const anterior = antigo ? maskPhone(antigo.telefone) : ''
    await auditWriter.record(tx, ctx, {
      action: 'identity.telefone_trocado',
      resource: { type: 'usuario', id: input.usuarioId },
      before: { telefone: anterior },
      after: { telefone: maskPhone(phone) },
    })
    await deps.outbox.publishInTx(
      tx,
      PhoneChanged.create(ctx, {
        aggregateId: input.usuarioId,
        aggregateRevision: usuario.revisao,
        payload: { usuarioId: input.usuarioId, telefoneAnterior: anterior, telefoneNovo: maskPhone(phone) },
      }),
    )
    return { telefoneMascarado: maskPhone(phone) }
  })
}

/** D0071: reautenticação por OTP no número atual da própria pessoa. */
export async function requestReauth(
  deps: IdentityDeps,
  input: { barbeariaId: string; usuarioId: string; ip?: string | null; correlationId?: string },
): Promise<RequestOtpResult> {
  const phone = await activePhoneOf(deps.db, input.barbeariaId, input.usuarioId)
  if (!phone) throw IdentityErrors.USER_NOT_ELIGIBLE()
  return requestOtp(deps, {
    barbeariaId: input.barbeariaId,
    phone,
    finalidade: 'reautenticacao',
    usuarioId: input.usuarioId,
    ...(input.ip === undefined ? {} : { ip: input.ip }),
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
  })
}

export async function confirmReauth(
  deps: IdentityDeps,
  input: { barbeariaId: string; usuarioId: string; code: string },
): Promise<void> {
  const phone = await activePhoneOf(deps.db, input.barbeariaId, input.usuarioId)
  if (!phone) throw IdentityErrors.USER_NOT_ELIGIBLE()
  await verifyOtp(deps, {
    barbeariaId: input.barbeariaId,
    phone,
    code: input.code,
    finalidade: 'reautenticacao',
    usuarioId: input.usuarioId,
  })
}
