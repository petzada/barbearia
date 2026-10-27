import { and, eq } from 'drizzle-orm'
import type { SessionResolver } from '~/contracts/session'
import type { AuthInstance } from '~/platform/auth'
import type { Db } from '~/platform/db/types'
import { logger } from '~/platform/logging'
import { papeisEfetivos } from '../domain/papeis'
import { papeisUsuario, usuarios, type PapelEquipe } from '../schema'

export interface SessionResolverOptions {
  readonly auth: () => AuthInstance
  readonly db: () => Db
  readonly barbeariaId: () => Promise<string>
  /** Recebe os `Set-Cookie` de renovação (sessão renovada no uso) para anexar à resposta. */
  readonly applyCookies?: (setCookies: string[]) => void
}

/**
 * `SessionResolver` real (T02 define o contrato). Valida o cookie no Better Auth e, a CADA requisição, lê os papéis
 * de equipe no banco: revogar um papel vale na próxima chamada, sem esperar a sessão expirar (D0071), e a conta de
 * cliente continua funcionando. Pré-cadastro e conta anonimizada nunca têm sessão. Nunca lança por sessão inválida.
 */
export function createSessionResolver(options: SessionResolverOptions): SessionResolver {
  return {
    async resolve(request) {
      try {
        const resposta = await options.auth().api.getSession({
          headers: request.headers,
          returnHeaders: true,
        })
        const dados = resposta.response
        if (!dados) return null
        const setCookies = resposta.headers.getSetCookie()
        if (setCookies.length > 0) options.applyCookies?.(setCookies)

        const db = options.db()
        const barbeariaId = await options.barbeariaId()
        const [usuario] = await db
          .select({ id: usuarios.id, estado: usuarios.estado })
          .from(usuarios)
          .where(and(eq(usuarios.id, dados.user.id), eq(usuarios.barbeariaId, barbeariaId)))
        if (!usuario) return null
        const equipe = await db
          .select({ papel: papeisUsuario.papel })
          .from(papeisUsuario)
          .where(
            and(
              eq(papeisUsuario.barbeariaId, barbeariaId),
              eq(papeisUsuario.usuarioId, usuario.id),
              eq(papeisUsuario.ativo, true),
            ),
          )
        const roles = papeisEfetivos(
          usuario.estado,
          equipe.map((e) => e.papel as PapelEquipe),
        )
        if (roles.length === 0) return null
        const authTime = (dados.session as { authTime?: Date | string }).authTime
        return {
          actorId: usuario.id,
          roles,
          sessionId: dados.session.id,
          // Sessão antiga sem auth_time nunca passa por "recente": cai no instante da criação.
          authTime: new Date(authTime ?? dados.session.createdAt),
        }
      } catch (error) {
        logger.error({ err: error }, 'falha ao resolver a sessão; tratada como sem sessão')
        return null
      }
    },
  }
}
