import type { SessionResolver } from '~/contracts/session'

// Registro do resolvedor de sessão do processo. T04 chama `setSessionResolver` no carregamento de
// `modules/identity/server.ts`. Enquanto nada for registrado, ninguém tem sessão: operações não
// públicas respondem `AUTH.REQUIRED` (falha fechada).
const semSessao: SessionResolver = { resolve: () => Promise.resolve(null) }

let atual: SessionResolver = semSessao

export function setSessionResolver(resolver: SessionResolver): void {
  atual = resolver
}

export function getSessionResolver(): SessionResolver {
  return atual
}

export function resetSessionResolver(): void {
  atual = semSessao
}
