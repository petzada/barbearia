import { and, asc, eq, inArray } from 'drizzle-orm'
import type { RequestContext } from '~/contracts/context'
import { auditWriter } from '~/platform/audit/writer'
import { normalizeBrazilianPhone } from '~/platform/auth/phone'
import type { Executor, Tx } from '~/platform/db/types'
import { newId } from '~/platform/ids'
import { maskPhone } from '~/platform/logging'
import { IdentityErrors } from '../errors'
import {
  authAccounts,
  papeisUsuario,
  usuarios,
  vinculosTelefone,
  type PapelEquipe,
  type UsuarioEstado,
} from '../schema'
import { advisoryLock } from './shared'

export interface UsuarioResumo {
  readonly id: string
  readonly nome: string
  readonly estado: UsuarioEstado
  readonly telefoneMascarado: string | null
  readonly papeisEquipe: readonly PapelEquipe[]
}

async function papeisAtivos(db: Executor, barbeariaId: string, ids: readonly string[]) {
  if (ids.length === 0) return new Map<string, PapelEquipe[]>()
  const linhas = await db
    .select({ usuarioId: papeisUsuario.usuarioId, papel: papeisUsuario.papel })
    .from(papeisUsuario)
    .where(
      and(
        eq(papeisUsuario.barbeariaId, barbeariaId),
        eq(papeisUsuario.ativo, true),
        inArray(papeisUsuario.usuarioId, [...ids]),
      ),
    )
  const mapa = new Map<string, PapelEquipe[]>()
  for (const l of linhas) mapa.set(l.usuarioId, [...(mapa.get(l.usuarioId) ?? []), l.papel as PapelEquipe])
  return mapa
}

async function telefonesAtivos(db: Executor, barbeariaId: string, ids: readonly string[]) {
  if (ids.length === 0) return new Map<string, string>()
  const linhas = await db
    .select({ usuarioId: vinculosTelefone.usuarioId, telefone: vinculosTelefone.telefone })
    .from(vinculosTelefone)
    .where(
      and(
        eq(vinculosTelefone.barbeariaId, barbeariaId),
        eq(vinculosTelefone.ativo, true),
        inArray(vinculosTelefone.usuarioId, [...ids]),
      ),
    )
  return new Map(linhas.map((l) => [l.usuarioId, l.telefone]))
}

/** Contrato `identity.getUser`: dados mínimos, telefone mascarado. */
export async function getUser(
  db: Executor,
  barbeariaId: string,
  usuarioId: string,
): Promise<UsuarioResumo | null> {
  const [u] = await db
    .select()
    .from(usuarios)
    .where(and(eq(usuarios.barbeariaId, barbeariaId), eq(usuarios.id, usuarioId)))
  if (!u) return null
  const [papeis, telefones] = await Promise.all([
    papeisAtivos(db, barbeariaId, [u.id]),
    telefonesAtivos(db, barbeariaId, [u.id]),
  ])
  const telefone = telefones.get(u.id)
  return {
    id: u.id,
    nome: u.nome,
    estado: u.estado as UsuarioEstado,
    telefoneMascarado: telefone ? maskPhone(telefone) : null,
    papeisEquipe: papeis.get(u.id) ?? [],
  }
}

/**
 * Contrato `identity.findByPhone`: restrito à equipe (quem chama aplica a política) e devolve só o mínimo
 * (PRD §4.4): nome, telefone mascarado e estado. Nada de e-mail, histórico ou papéis alheios.
 */
export async function findByPhone(
  db: Executor,
  barbeariaId: string,
  telefone: string,
): Promise<{ usuarioId: string; nome: string; telefoneMascarado: string; estado: UsuarioEstado } | null> {
  const normalizado = normalizeBrazilianPhone(telefone)
  if (!normalizado) throw IdentityErrors.PHONE_INVALID()
  const [linha] = await db
    .select({ usuario: usuarios })
    .from(vinculosTelefone)
    .innerJoin(usuarios, eq(usuarios.id, vinculosTelefone.usuarioId))
    .where(
      and(
        eq(vinculosTelefone.barbeariaId, barbeariaId),
        eq(vinculosTelefone.telefone, normalizado),
        eq(vinculosTelefone.ativo, true),
      ),
    )
  if (!linha) return null
  return {
    usuarioId: linha.usuario.id,
    nome: linha.usuario.nome,
    telefoneMascarado: maskPhone(normalizado),
    estado: linha.usuario.estado as UsuarioEstado,
  }
}

export interface PreRegisterInput {
  readonly nome: string
  readonly telefone: string
  /** Membro da equipe que cadastrou (D0034). */
  readonly registradoPor: string
}

/**
 * Contrato `identity.createPreRegistered` (usado por T19, dentro da transação do agendamento): reaproveita a conta se
 * o telefone já existir (ativa OU pré-cadastrada) e devolve `{ usuarioId, jaExistia }`. Conta ativa nunca é duplicada
 * nem alterada; a equipe vê só o mínimo via `getUser`.
 */
export async function createPreRegistered(
  tx: Tx,
  ctx: RequestContext,
  input: PreRegisterInput,
): Promise<{ usuarioId: string; jaExistia: boolean }> {
  const telefone = normalizeBrazilianPhone(input.telefone)
  if (!telefone) throw IdentityErrors.PHONE_INVALID()
  const nome = input.nome.trim()
  if (nome.length < 2 || nome.length > 120) {
    throw IdentityErrors.PHONE_INVALID({ message: 'Informe o nome do cliente (2 a 120 caracteres).' })
  }
  await advisoryLock(tx, `usuario:tel:${ctx.barbeariaId}:${telefone}`)
  const [existente] = await tx
    .select({ usuarioId: vinculosTelefone.usuarioId })
    .from(vinculosTelefone)
    .where(
      and(
        eq(vinculosTelefone.barbeariaId, ctx.barbeariaId),
        eq(vinculosTelefone.telefone, telefone),
        eq(vinculosTelefone.ativo, true),
      ),
    )
  if (existente) return { usuarioId: existente.usuarioId, jaExistia: true }

  const agora = ctx.clock.now()
  const usuarioId = newId(ctx.clock)
  await tx.insert(usuarios).values({
    id: usuarioId,
    barbeariaId: ctx.barbeariaId,
    nome,
    estado: 'pre_cadastrado',
    registradoPor: input.registradoPor,
    criadoEm: agora,
    atualizadoEm: agora,
  })
  await tx.insert(vinculosTelefone).values({
    id: newId(ctx.clock),
    barbeariaId: ctx.barbeariaId,
    usuarioId,
    telefone,
    verificadoEm: null, // D0034: número ainda não provado
    criadoEm: agora,
  })
  await auditWriter.record(tx, ctx, {
    action: 'identity.pre_cadastro',
    resource: { type: 'usuario', id: usuarioId },
    after: { estado: 'pre_cadastrado', telefone: maskPhone(telefone), registradoPor: input.registradoPor },
  })
  return { usuarioId, jaExistia: false }
}

/** Lista de membros da equipe (D04-papéis): quem tem algum papel de equipe ativo. */
export async function listTeam(db: Executor, barbeariaId: string): Promise<UsuarioResumo[]> {
  const ativos = await db
    .selectDistinct({ usuarioId: papeisUsuario.usuarioId })
    .from(papeisUsuario)
    .where(and(eq(papeisUsuario.barbeariaId, barbeariaId), eq(papeisUsuario.ativo, true)))
  const ids = ativos.map((a) => a.usuarioId)
  if (ids.length === 0) return []
  const linhas = await db
    .select()
    .from(usuarios)
    .where(and(eq(usuarios.barbeariaId, barbeariaId), inArray(usuarios.id, ids)))
    .orderBy(asc(usuarios.nome))
  const [papeis, telefones] = await Promise.all([
    papeisAtivos(db, barbeariaId, ids),
    telefonesAtivos(db, barbeariaId, ids),
  ])
  return linhas.map((u) => {
    const tel = telefones.get(u.id)
    return {
      id: u.id,
      nome: u.nome,
      estado: u.estado as UsuarioEstado,
      telefoneMascarado: tel ? maskPhone(tel) : null,
      papeisEquipe: papeis.get(u.id) ?? [],
    }
  })
}

export async function hasGoogleLinked(db: Executor, usuarioId: string): Promise<boolean> {
  const [linha] = await db
    .select({ id: authAccounts.id })
    .from(authAccounts)
    .where(and(eq(authAccounts.userId, usuarioId), eq(authAccounts.providerId, 'google')))
  return linha !== undefined
}

export async function activePhoneOf(
  db: Executor,
  barbeariaId: string,
  usuarioId: string,
): Promise<string | null> {
  const mapa = await telefonesAtivos(db, barbeariaId, [usuarioId])
  return mapa.get(usuarioId) ?? null
}
