import { redirect } from '@tanstack/react-router'
import { ensureUiSession, type UiSession } from '../session/ui-session'
import { decideAccess, loginHref, type Area } from './access'

export interface AreaAccess {
  readonly access: 'liberado' | 'negado'
  readonly session: UiSession
}

/**
 * `beforeLoad` das áreas logadas: sem sessão vai ao login guardando o destino; no contexto errado vai ao
 * certo; sem papel mostra acesso negado. Só UX: o servidor decide de verdade (PRD §4.2).
 */
export async function guardArea(area: Area, location: { href: string }): Promise<AreaAccess> {
  const { session } = await ensureUiSession()
  const decisao = decideAccess(area, session)
  if (decisao.kind === 'login') throw redirect({ href: loginHref(location.href) })
  if (decisao.kind === 'redirect') throw redirect({ href: decisao.to })
  // `login` cobre `session === null`; daqui em diante há sessão.
  if (!session) throw redirect({ href: loginHref(location.href) })
  return { access: decisao.kind === 'allow' ? 'liberado' : 'negado', session }
}
