import { and, eq } from 'drizzle-orm'
import type { AuthenticatedContext } from '~/contracts/context'
import type { Outbox } from '~/contracts/ports/outbox'
import { auditWriter } from '~/platform/audit/writer'
import type { Tx } from '~/platform/db/types'
import { newId } from '~/platform/ids'
import { podeRemoverAdmin, podeReceberPapel } from '../domain/papeis'
import { IdentityErrors } from '../errors'
import { TeamRoleGranted, TeamRoleRevoked } from '../events'
import { papeisUsuario, usuarios, type PapelEquipe } from '../schema'
import { advisoryLock } from './shared'

async function carregarAlvo(tx: Tx, barbeariaId: string, usuarioId: string) {
  const [alvo] = await tx
    .select()
    .from(usuarios)
    .where(and(eq(usuarios.barbeariaId, barbeariaId), eq(usuarios.id, usuarioId)))
    .for('update')
  return alvo
}

/**
 * D0002/D0071: concede `barbeiro` ou `admin`. Quem chama exige papel admin e autenticação recente (política da
 * operação). Idempotente: conceder o que já está ativo não duplica nem reemite evento. Só conta `ativo` recebe papel.
 */
export async function grantRole(
  tx: Tx,
  ctx: AuthenticatedContext,
  outbox: Outbox,
  input: { usuarioId: string; papel: PapelEquipe },
): Promise<{ jaTinha: boolean }> {
  const alvo = await carregarAlvo(tx, ctx.barbeariaId, input.usuarioId)
  if (!alvo || !podeReceberPapel(alvo.estado)) throw IdentityErrors.USER_NOT_ELIGIBLE()
  await advisoryLock(tx, `papeis:${ctx.barbeariaId}`)
  const [existente] = await tx
    .select({ id: papeisUsuario.id })
    .from(papeisUsuario)
    .where(
      and(
        eq(papeisUsuario.barbeariaId, ctx.barbeariaId),
        eq(papeisUsuario.usuarioId, alvo.id),
        eq(papeisUsuario.papel, input.papel),
        eq(papeisUsuario.ativo, true),
      ),
    )
  if (existente) return { jaTinha: true }
  const agora = ctx.clock.now()
  await tx.insert(papeisUsuario).values({
    id: newId(ctx.clock),
    barbeariaId: ctx.barbeariaId,
    usuarioId: alvo.id,
    papel: input.papel,
    concedidoPor: ctx.actorId,
    criadoEm: agora,
    atualizadoEm: agora,
  })
  await auditWriter.record(tx, ctx, {
    action: 'identity.papel_concedido',
    resource: { type: 'usuario', id: alvo.id },
    after: { papel: input.papel },
  })
  await outbox.publishInTx(
    tx,
    TeamRoleGranted.create(ctx, {
      aggregateId: alvo.id,
      aggregateRevision: 1,
      payload: { usuarioId: alvo.id, papel: input.papel, concedidoPor: ctx.actorId },
    }),
  )
  return { jaTinha: false }
}

/**
 * Revoga um papel. Vale na PRÓXIMA requisição: o `SessionResolver` lê os papéis do banco a cada chamada, então a
 * sessão de equipe perde os poderes na hora e a conta de cliente segue intacta (D0071). Nunca remove o último admin.
 */
export async function revokeRole(
  tx: Tx,
  ctx: AuthenticatedContext,
  outbox: Outbox,
  input: { usuarioId: string; papel: PapelEquipe; motivo?: string },
): Promise<{ jaRevogado: boolean }> {
  // Serializa concessões/revogações: duas revogações simultâneas não deixam o sistema sem admin.
  await advisoryLock(tx, `papeis:${ctx.barbeariaId}`)
  const [ativo] = await tx
    .select()
    .from(papeisUsuario)
    .where(
      and(
        eq(papeisUsuario.barbeariaId, ctx.barbeariaId),
        eq(papeisUsuario.usuarioId, input.usuarioId),
        eq(papeisUsuario.papel, input.papel),
        eq(papeisUsuario.ativo, true),
      ),
    )
    .for('update')
  if (!ativo) return { jaRevogado: true }

  if (input.papel === 'admin') {
    const admins = await tx
      .select({ usuarioId: papeisUsuario.usuarioId })
      .from(papeisUsuario)
      .innerJoin(usuarios, eq(usuarios.id, papeisUsuario.usuarioId))
      .where(
        and(
          eq(papeisUsuario.barbeariaId, ctx.barbeariaId),
          eq(papeisUsuario.papel, 'admin'),
          eq(papeisUsuario.ativo, true),
          eq(usuarios.estado, 'ativo'),
        ),
      )
    const outros = admins.filter((a) => a.usuarioId !== input.usuarioId).length
    if (!podeRemoverAdmin(outros)) throw IdentityErrors.LAST_ADMIN()
  }

  const agora = ctx.clock.now()
  await tx
    .update(papeisUsuario)
    .set({
      ativo: false,
      revogadoEm: agora,
      revogadoPor: ctx.actorId,
      motivoRevogacao: input.motivo ?? null,
      atualizadoEm: agora,
      revisao: ativo.revisao + 1,
    })
    .where(eq(papeisUsuario.id, ativo.id))
  const restantes = await tx
    .select({ papel: papeisUsuario.papel })
    .from(papeisUsuario)
    .where(
      and(
        eq(papeisUsuario.barbeariaId, ctx.barbeariaId),
        eq(papeisUsuario.usuarioId, input.usuarioId),
        eq(papeisUsuario.ativo, true),
      ),
    )
  await auditWriter.record(tx, ctx, {
    action: 'identity.papel_revogado',
    resource: { type: 'usuario', id: input.usuarioId },
    before: { papel: input.papel },
    after: { papeisRestantes: restantes.map((r) => r.papel) },
    ...(input.motivo ? { reason: input.motivo } : {}),
  })
  await outbox.publishInTx(
    tx,
    TeamRoleRevoked.create(ctx, {
      aggregateId: input.usuarioId,
      aggregateRevision: 1,
      payload: {
        usuarioId: input.usuarioId,
        papel: input.papel,
        revogadoPor: ctx.actorId,
        papeisRestantes: restantes.map((r) => r.papel),
      },
    }),
  )
  return { jaRevogado: false }
}
