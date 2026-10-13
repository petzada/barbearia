import type { ResolvedSession, SessionResolver } from '../session'

/**
 * Resolvedor de sessão para testes (T02). Sessões são registradas por token e lidas do header
 * `x-test-session`. T04 entrega o resolvedor real (cookie).
 */
export class FakeSessionResolver implements SessionResolver {
  static readonly HEADER = 'x-test-session'
  private readonly sessions = new Map<string, ResolvedSession>()

  register(token: string, session: ResolvedSession): this {
    this.sessions.set(token, session)
    return this
  }

  revoke(token: string): void {
    this.sessions.delete(token)
  }

  resolve(request: Request): Promise<ResolvedSession | null> {
    const token = request.headers.get(FakeSessionResolver.HEADER)
    return Promise.resolve(token ? (this.sessions.get(token) ?? null) : null)
  }
}
