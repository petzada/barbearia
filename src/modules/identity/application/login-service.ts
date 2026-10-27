import { and, eq } from 'drizzle-orm'
import { auditWriter } from '~/platform/audit/writer'
import type { Executor } from '~/platform/db/types'
import { maskPhone } from '~/platform/logging'
import { newId } from '~/platform/ids'
import { contaViva } from '../domain/papeis'
import { IdentityErrors } from '../errors'
import { UserActivated } from '../events'
import type { IdentityDeps } from '../infra/deps'
import { otpDesafios, usuarios, vinculosTelefone, type Usuario } from '../schema'
import { continuationHash, issueContinuation, verifyOtp } from './otp-service'
import { advisoryLock, contextoDeSistema } from './shared'
import {
  conferirVersoes,
  documentosVigentes,
  paraCliente,
  registrarAceites,
  type AceiteInput,
  type DocumentoVigente,
} from './terms-service'

export type LoginOutcome =
  | { readonly kind: 'session'; readonly usuarioId: string }
  | {
      readonly kind: 'needs_profile'
      /** Token de uso único (10 min) para enviar nome + aceite. */
      readonly continuation: string
      /** Só para pré-cadastro, e só depois de provar o número (nunca antes: evitaria enumeração). */
      readonly suggestedName: string | null
      readonly documentos: readonly DocumentoVigente[]
    }

export async function findActiveLink(
  db: Executor,
  barbeariaId: string,
  phone: string,
): Promise<{ vinculoVerificadoEm: Date | null; usuario: Usuario } | undefined> {
  const [linha] = await db
    .select({ verificadoEm: vinculosTelefone.verificadoEm, usuario: usuarios })
    .from(vinculosTelefone)
    .innerJoin(usuarios, eq(usuarios.id, vinculosTelefone.usuarioId))
    .where(
      and(
        eq(vinculosTelefone.barbeariaId, barbeariaId),
        eq(vinculosTelefone.telefone, phone),
        eq(vinculosTelefone.ativo, true),
      ),
    )
  return linha ? { vinculoVerificadoEm: linha.verificadoEm, usuario: linha.usuario } : undefined
}

/**
 * Passo 2 do login: confere o OTP. Número com conta viva e verificada entra direto (inclusive número "reciclado":
 * risco aceito em D0017/D0070). Número novo ou pré-cadastrado precisa de nome e aceite (passo 3).
 */
export async function verifyLogin(
  deps: IdentityDeps,
  input: { barbeariaId: string; phone: string; code: string },
): Promise<LoginOutcome> {
  const { desafioId } = await verifyOtp(deps, { ...input, finalidade: 'login' })
  const vinculo = await findActiveLink(deps.db, input.barbeariaId, input.phone)
  if (vinculo?.vinculoVerificadoEm && contaViva(vinculo.usuario.estado)) {
    return { kind: 'session', usuarioId: vinculo.usuario.id }
  }
  const documentos = await documentosVigentes(deps.db, input.barbeariaId)
  const continuation = await issueContinuation(deps, desafioId)
  return {
    kind: 'needs_profile',
    continuation,
    suggestedName: vinculo?.usuario.estado === 'pre_cadastrado' ? vinculo.usuario.nome : null,
    documentos: documentos.map(paraCliente),
  }
}

export type FirstAccessOrigin = 'primeiro_acesso' | 'pre_cadastro' | 'ja_existia'

export interface CompleteFirstAccessInput {
  readonly barbeariaId: string
  readonly continuation: string
  readonly nome: string
  readonly aceites: AceiteInput
  readonly correlationId?: string
}

/**
 * Passo 3: nome + aceite dos documentos vigentes. Cria a conta (primeiro acesso) ou ATIVA o pré-cadastro, mantendo
 * o mesmo id, o histórico e as preferências (D0034, D0073). Um token só serve uma vez.
 */
export async function completeFirstAccess(
  deps: IdentityDeps,
  input: CompleteFirstAccessInput,
): Promise<{ usuarioId: string; origem: FirstAccessOrigin }> {
  const nome = input.nome.trim()
  if (nome.length < 2 || nome.length > 120) {
    throw IdentityErrors.CONTINUATION_INVALID({ message: 'Informe seu nome (2 a 120 caracteres).' })
  }
  const { db, clock } = deps
  const agora = clock.now()
  return db.transaction(async (tx) => {
    const [desafio] = await tx
      .select()
      .from(otpDesafios)
      .where(
        and(
          eq(otpDesafios.barbeariaId, input.barbeariaId),
          eq(otpDesafios.continuacaoHash, continuationHash(deps, input.continuation)),
        ),
      )
      .for('update')
    if (
      !desafio ||
      !desafio.verificadoEm ||
      desafio.continuacaoUsadaEm ||
      !desafio.continuacaoExpiraEm ||
      agora.getTime() >= desafio.continuacaoExpiraEm.getTime()
    ) {
      throw IdentityErrors.CONTINUATION_INVALID()
    }
    const documentos = await documentosVigentes(tx, input.barbeariaId)
    conferirVersoes(documentos, input.aceites)

    await advisoryLock(tx, `usuario:tel:${input.barbeariaId}:${desafio.telefone}`)
    const vinculo = await findActiveLink(tx, input.barbeariaId, desafio.telefone)
    const ctx = contextoDeSistema(deps, input.barbeariaId, input.correlationId)
    await tx
      .update(otpDesafios)
      .set({ continuacaoUsadaEm: agora })
      .where(eq(otpDesafios.id, desafio.id))

    if (vinculo?.vinculoVerificadoEm && contaViva(vinculo.usuario.estado)) {
      // Corrida: outra aba já criou a conta. Vira um login comum, sem duplicar.
      return { usuarioId: vinculo.usuario.id, origem: 'ja_existia' as const }
    }

    let usuarioId: string
    let origem: FirstAccessOrigin
    if (vinculo) {
      usuarioId = vinculo.usuario.id
      origem = 'pre_cadastro'
      await tx
        .update(usuarios)
        .set({ estado: 'ativo', nome, ativadoEm: agora, atualizadoEm: agora })
        .where(eq(usuarios.id, usuarioId))
      await tx
        .update(vinculosTelefone)
        .set({ verificadoEm: agora })
        .where(
          and(eq(vinculosTelefone.usuarioId, usuarioId), eq(vinculosTelefone.ativo, true)),
        )
    } else {
      usuarioId = newId(clock)
      origem = 'primeiro_acesso'
      await tx.insert(usuarios).values({
        id: usuarioId,
        barbeariaId: input.barbeariaId,
        nome,
        estado: 'ativo',
        ativadoEm: agora,
        criadoEm: agora,
        atualizadoEm: agora,
      })
      await tx.insert(vinculosTelefone).values({
        id: newId(clock),
        barbeariaId: input.barbeariaId,
        usuarioId,
        telefone: desafio.telefone,
        verificadoEm: agora,
        criadoEm: agora,
      })
    }
    await registrarAceites(tx, {
      clock,
      barbeariaId: input.barbeariaId,
      usuarioId,
      documentos,
      canal: 'app',
    })
    await auditWriter.record(tx, ctx, {
      action: 'identity.usuario_ativado',
      resource: { type: 'usuario', id: usuarioId },
      before: { estado: vinculo ? vinculo.usuario.estado : null },
      after: { estado: 'ativo', origem, telefone: maskPhone(desafio.telefone) },
    })
    await deps.outbox.publishInTx(
      tx,
      UserActivated.create(ctx, {
        aggregateId: usuarioId,
        aggregateRevision: 1,
        payload: { usuarioId, origem: origem === 'pre_cadastro' ? 'pre_cadastro' : 'primeiro_acesso' },
      }),
    )
    return { usuarioId, origem }
  })
}
