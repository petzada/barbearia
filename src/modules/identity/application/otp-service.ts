import { and, desc, eq, gt, isNull } from 'drizzle-orm'
import {
  generateOpaqueToken,
  generateOtpCode,
  hashOtpCode,
  hashSecretValue,
  safeEqualHex,
} from '~/platform/auth/otp-crypto'
import { barbearias } from '~/platform/db/schema/barbearias'
import { RateErrors } from '~/platform/errors'
import { newId } from '~/platform/ids'
import { logger, maskPhone } from '~/platform/logging'
import { challengeStatus, decideSend } from '../domain/otp'
import { IdentityErrors } from '../errors'
import type { IdentityDeps } from '../infra/deps'
import { otpDesafios, type OtpFinalidade } from '../schema'
import { advisoryLock, ipHash } from './shared'

export interface RequestOtpInput {
  readonly barbeariaId: string
  /** E.164 já normalizado. */
  readonly phone: string
  readonly finalidade: OtpFinalidade
  /** Só para troca de telefone e reautenticação. */
  readonly usuarioId?: string
  readonly ip?: string | null
  readonly correlationId?: string
}

export interface RequestOtpResult {
  readonly desafioId: string
  readonly expiraEm: Date
}

/**
 * RN01: persiste o desafio (hash) e só depois envia o código pelo canal `otp`. Reenvio invalida o anterior mas as
 * linhas antigas continuam contando nos limites por telefone e por IP. A resposta é a mesma para qualquer telefone:
 * não revela se há conta.
 */
export async function requestOtp(
  deps: IdentityDeps,
  input: RequestOtpInput,
): Promise<RequestOtpResult> {
  const { db, clock, config } = deps
  const agora = clock.now()
  const ipH = ipHash(deps, input.ip)
  const desafioId = newId(clock)
  const codigo = generateOtpCode()
  const expiraEm = new Date(agora.getTime() + config.otp.ttlMs)

  await db.transaction(async (tx) => {
    await advisoryLock(tx, `otp:tel:${input.barbeariaId}:${input.phone}`)
    await advisoryLock(tx, `otp:ip:${input.barbeariaId}:${ipH}`)
    const janela = new Date(
      agora.getTime() - Math.max(config.otp.phoneSends.windowMs, config.otp.ipSends.windowMs),
    )
    const recentes = await tx
      .select({
        telefone: otpDesafios.telefone,
        ipHash: otpDesafios.ipHash,
        criadoEm: otpDesafios.criadoEm,
      })
      .from(otpDesafios)
      .where(and(eq(otpDesafios.barbeariaId, input.barbeariaId), gt(otpDesafios.criadoEm, janela)))
    const porTelefone = recentes.filter((r) => r.telefone === input.phone).map((r) => r.criadoEm)
    const porIp = recentes.filter((r) => r.ipHash === ipH).map((r) => r.criadoEm)
    for (const decisao of [
      decideSend(porTelefone, agora, config.otp.phoneSends),
      decideSend(porIp, agora, config.otp.ipSends),
    ]) {
      if (!decisao.allowed) throw RateErrors.LIMITED({ retryAfterSeconds: decisao.retryAfterSeconds })
    }
    await tx
      .update(otpDesafios)
      .set({ invalidadoEm: agora })
      .where(
        and(
          eq(otpDesafios.barbeariaId, input.barbeariaId),
          eq(otpDesafios.telefone, input.phone),
          eq(otpDesafios.finalidade, input.finalidade),
          isNull(otpDesafios.invalidadoEm),
          isNull(otpDesafios.verificadoEm),
        ),
      )
    await tx.insert(otpDesafios).values({
      id: desafioId,
      barbeariaId: input.barbeariaId,
      telefone: input.phone,
      finalidade: input.finalidade,
      usuarioId: input.usuarioId ?? null,
      codigoHash: hashOtpCode({ code: codigo, challengeId: desafioId, secret: deps.secret }),
      ipHash: ipH,
      expiraEm,
      maxTentativas: config.otp.maxAttempts,
      criadoEm: agora,
    })
  })

  const [barbearia] = await db
    .select({ nome: barbearias.nome })
    .from(barbearias)
    .where(eq(barbearias.id, input.barbeariaId))
  const minutos = Math.round(config.otp.ttlMs / 60_000)
  const resultado = await deps.notifications.send({
    channel: 'otp',
    toE164: input.phone,
    text: `${codigo} é o seu código de acesso${barbearia ? ` à ${barbearia.nome}` : ''}. Vale por ${minutos} minutos. Não compartilhe com ninguém.`,
    idempotencyKey: desafioId,
  })
  if (resultado.status !== 'sent') {
    // Falha honesta: o código nunca chegou, então o desafio não pode ser usado.
    await db
      .update(otpDesafios)
      .set({ invalidadoEm: clock.now() })
      .where(eq(otpDesafios.id, desafioId))
    logger.warn(
      { correlationId: input.correlationId, para: maskPhone(input.phone), status: resultado.status },
      'falha ao enviar o código de login',
    )
    throw IdentityErrors.OTP_DELIVERY_FAILED()
  }
  return { desafioId, expiraEm }
}

export interface VerifyOtpInput {
  readonly barbeariaId: string
  readonly phone: string
  readonly code: string
  readonly finalidade: OtpFinalidade
  readonly usuarioId?: string
}

type Desfecho = 'ok' | 'invalido' | 'esgotado'

/**
 * Confere o código contra o desafio mais recente do telefone/finalidade. Uso único; a 5ª tentativa errada bloqueia o
 * código. Os contadores são gravados mesmo quando a verificação falha (o erro é lançado depois do commit).
 */
export async function verifyOtp(
  deps: IdentityDeps,
  input: VerifyOtpInput,
): Promise<{ desafioId: string }> {
  const { db, clock } = deps
  const agora = clock.now()
  const resultado = await db.transaction(
    async (tx): Promise<{ desfecho: Desfecho; desafioId: string | null }> => {
      const [desafio] = await tx
        .select()
        .from(otpDesafios)
        .where(
          and(
            eq(otpDesafios.barbeariaId, input.barbeariaId),
            eq(otpDesafios.telefone, input.phone),
            eq(otpDesafios.finalidade, input.finalidade),
            ...(input.usuarioId ? [eq(otpDesafios.usuarioId, input.usuarioId)] : []),
          ),
        )
        .orderBy(desc(otpDesafios.criadoEm), desc(otpDesafios.id))
        .limit(1)
        .for('update')
      // Mesmo custo de hash quando não há desafio: sem diferença de tempo entre "existe" e "não existe".
      const calculado = hashOtpCode({
        code: input.code,
        challengeId: desafio?.id ?? newId(clock),
        secret: deps.secret,
      })
      if (!desafio) return { desfecho: 'invalido', desafioId: null }
      const estado = challengeStatus(desafio, agora)
      if (estado === 'esgotado') return { desfecho: 'esgotado', desafioId: desafio.id }
      if (estado !== 'valido') return { desfecho: 'invalido', desafioId: desafio.id }
      if (safeEqualHex(calculado, desafio.codigoHash)) {
        await tx.update(otpDesafios).set({ verificadoEm: agora }).where(eq(otpDesafios.id, desafio.id))
        return { desfecho: 'ok', desafioId: desafio.id }
      }
      const tentativas = desafio.tentativas + 1
      await tx.update(otpDesafios).set({ tentativas }).where(eq(otpDesafios.id, desafio.id))
      return {
        desfecho: tentativas >= desafio.maxTentativas ? 'esgotado' : 'invalido',
        desafioId: desafio.id,
      }
    },
  )
  if (resultado.desfecho === 'ok' && resultado.desafioId) return { desafioId: resultado.desafioId }
  if (resultado.desfecho === 'esgotado') throw IdentityErrors.OTP_ATTEMPTS_EXCEEDED()
  throw IdentityErrors.OTP_INVALID()
}

export function continuationHash(deps: IdentityDeps, token: string): string {
  return hashSecretValue({ value: token, purpose: 'continuacao', secret: deps.secret })
}

/** Gera o token de continuação (nome + aceite) para um desafio já verificado. Só o hash fica no banco. */
export async function issueContinuation(deps: IdentityDeps, desafioId: string): Promise<string> {
  const token = generateOpaqueToken()
  const agora = deps.clock.now()
  await deps.db
    .update(otpDesafios)
    .set({
      continuacaoHash: continuationHash(deps, token),
      continuacaoExpiraEm: new Date(agora.getTime() + deps.config.otp.continuationTtlMs),
    })
    .where(eq(otpDesafios.id, desafioId))
  return token
}
