import { z } from 'zod'
import { ok } from '~/contracts'
import { auditWriter } from '~/platform/audit/writer'
import { policies } from '~/platform/authz'
import { defineCommand, defineQuery, setSessionResolver } from '~/platform/context'
import { getDeployBarbearia } from '~/platform/db/deploy-barbearia'
import { getDatabase } from '~/platform/db/runtime'
import { isAppError } from '~/platform/errors/app-error'
import { logger } from '~/platform/logging'
import { uuidSchema } from '~/platform/validation'
import { grantRole, revokeRole } from './application/roles-service'
import {
  conferirVersoes,
  documentosPendentes,
  documentosVigentes,
  registrarAceites,
} from './application/terms-service'
import {
  findByPhone,
  getUser,
  hasGoogleLinked,
  listTeam,
} from './application/users-service'
import { RECENT_AUTH_WINDOW_MS } from './config'
import { IdentityErrors } from './errors'
import { getAuth } from './infra/auth'
import { getIdentityOutbox } from './infra/ports'
import { createSessionResolver } from './infra/session-resolver'
import { PAPEIS_EQUIPE } from './schema'

// PRD §7.3: operações autenticadas do módulo. O login em si (enviar/verificar código, sessão, cookie) roda nos
// endpoints do Better Auth (infra/auth.ts), porque precisa gravar o cookie de sessão na resposta.

/** Registra o resolvedor real (T02 define o contrato). Sem isso, ninguém tem sessão (falha fechada). */
setSessionResolver(
  createSessionResolver({
    auth: getAuth,
    db: getDatabase,
    barbeariaId: async () => (await getDeployBarbearia()).id,
  }),
)

const papelSchema = z.enum(PAPEIS_EQUIPE)

export const me = defineQuery({
  name: 'identity.me',
  input: z.object({}),
  policy: policies.authenticated(),
  handler: async ({ ctx, db }) => {
    const usuario = await getUser(db, ctx.barbeariaId, ctx.actorId)
    if (!usuario) throw IdentityErrors.USER_NOT_ELIGIBLE()
    let pendentes: { tipo: string; versao: string; texto: string }[] = []
    try {
      pendentes = (await documentosPendentes(db, ctx.barbeariaId, ctx.actorId)).map((d) => ({
        tipo: d.tipo,
        versao: d.versao,
        texto: d.texto,
      }))
    } catch (error) {
      // Sem documentos vigentes publicados não há o que exigir; qualquer outro erro sobe.
      if (!isAppError(error) || error.code !== IdentityErrors.codes.TERMS_UNAVAILABLE) throw error
      logger.warn({ correlationId: ctx.correlationId }, 'documentos legais vigentes não publicados')
    }
    return ok({
      usuarioId: usuario.id,
      nome: usuario.nome,
      estado: usuario.estado,
      roles: [...ctx.roles],
      telefoneMascarado: usuario.telefoneMascarado,
      google: await hasGoogleLinked(db, ctx.actorId),
      authTime: ctx.authTime.toISOString(),
      recentAuthUntil: new Date(ctx.authTime.getTime() + RECENT_AUTH_WINDOW_MS).toISOString(),
      documentosPendentes: pendentes,
    })
  },
})

export const listarEquipe = defineQuery({
  name: 'identity.listarEquipe',
  input: z.object({}),
  policy: policies.anyRole('admin'),
  handler: async ({ ctx, db }) => ok({ membros: await listTeam(db, ctx.barbeariaId) }),
})

export const buscarPorTelefone = defineQuery({
  name: 'identity.buscarPorTelefone',
  input: z.object({ telefone: z.string().min(8).max(32) }),
  policy: policies.anyRole('barbeiro', 'admin'),
  handler: async ({ ctx, input, db }) =>
    ok({ usuario: await findByPhone(db, ctx.barbeariaId, input.telefone) }),
})

export const aceitarDocumentos = defineCommand({
  name: 'identity.aceitarDocumentos',
  input: z.object({ termos: z.string().min(1).max(64), privacidade: z.string().min(1).max(64) }),
  policy: policies.authenticated(),
  handler: async ({ ctx, input, tx }) => {
    const vigentes = await documentosVigentes(tx, ctx.barbeariaId)
    conferirVersoes(vigentes, input)
    await registrarAceites(tx, {
      clock: ctx.clock,
      barbeariaId: ctx.barbeariaId,
      usuarioId: ctx.actorId,
      documentos: vigentes,
      canal: 'app',
    })
    await auditWriter.record(tx, ctx, {
      action: 'identity.documentos_aceitos',
      resource: { type: 'usuario', id: ctx.actorId },
      after: { termos: input.termos, privacidade: input.privacidade },
    })
    return ok({ aceitos: vigentes.length })
  },
})

export const concederPapel = defineCommand({
  name: 'identity.concederPapel',
  input: z.object({ usuarioId: uuidSchema, papel: papelSchema }),
  policy: policies.anyRole('admin'),
  requireRecentAuth: true,
  handler: async ({ ctx, input, tx }) => {
    const resultado = await grantRole(tx, ctx, getIdentityOutbox(), input)
    return ok({ usuarioId: input.usuarioId, papel: input.papel, jaTinha: resultado.jaTinha })
  },
})

export const revogarPapel = defineCommand({
  name: 'identity.revogarPapel',
  input: z.object({
    usuarioId: uuidSchema,
    papel: papelSchema,
    motivo: z.string().trim().min(1).max(300).optional(),
  }),
  policy: policies.anyRole('admin'),
  requireRecentAuth: true,
  handler: async ({ ctx, input, tx }) => {
    const resultado = await revokeRole(tx, ctx, getIdentityOutbox(), input)
    return ok({ usuarioId: input.usuarioId, papel: input.papel, jaRevogado: resultado.jaRevogado })
  },
})

