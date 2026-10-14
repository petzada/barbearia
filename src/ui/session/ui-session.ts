import { useEffect, useSyncExternalStore } from 'react'
import type { Role } from '~/contracts'
import { devSessionFromCookie } from './dev-session'

/**
 * Sessão como a UI a enxerga. Serve só para experiência (abas, redirecionamento, o que esconder): a
 * segurança real é do servidor, que revalida papel e sessão em toda operação (PRD §4.2, §4.4).
 */
export interface UiSession {
  readonly actorId: string
  readonly nome: string | null
  readonly roles: readonly Role[]
}

/**
 * Fonte da sessão da UI. T04 a entrega em `src/modules/identity/ui-session.ts`
 * (`export const uiSessionSource: UiSessionSource`), consultando o servidor; T05 a carrega por glob.
 */
export type UiSessionSource = () => Promise<UiSession | null>

export interface UiSessionSnapshot {
  readonly status: 'loading' | 'ready'
  readonly session: UiSession | null
  /** Verdadeiro se a fonte falhou: a UI trata como deslogado (falha fechada) e a tela pode avisar. */
  readonly failed: boolean
}

const CARREGANDO: UiSessionSnapshot = { status: 'loading', session: null, failed: false }

const modulosDaSessao = import.meta.glob<{ uiSessionSource?: UiSessionSource }>(
  '/src/modules/identity/ui-session.ts',
  { eager: true },
)

const semSessao: UiSessionSource = () => Promise.resolve(null)

let fonteRegistrada: UiSessionSource | null = null

/** Para T04 (ou testes) trocarem a fonte sem depender do glob. */
export function setUiSessionSource(fonte: UiSessionSource | null): void {
  fonteRegistrada = fonte
  invalidateUiSession()
}

function fonteAtual(): UiSessionSource {
  if (fonteRegistrada) return fonteRegistrada
  for (const modulo of Object.values(modulosDaSessao)) {
    if (modulo.uiSessionSource) return modulo.uiSessionSource
  }
  return semSessao
}

async function carregarSessao(): Promise<UiSessionSnapshot> {
  // Só em E2E: o flag é exposto como booleano pelo vite.config apenas em `vite dev`.
  // `import.meta.env.MODE` vira "production" no build e remove este ramo do bundle.
  const fakeDeE2E = (import.meta.env as ImportMetaEnv & { E2E_FAKE_SESSION?: boolean })
    .E2E_FAKE_SESSION
  if (import.meta.env.MODE === 'development' && fakeDeE2E === true) {
    const dev = devSessionFromCookie()
    if (dev) return { status: 'ready', session: dev, failed: false }
  }
  try {
    return { status: 'ready', session: await fonteAtual()(), failed: false }
  } catch {
    // A falha vira estado explícito (`failed`), não silêncio: guardas tratam como deslogado.
    return { status: 'ready', session: null, failed: true }
  }
}

let snapshot: UiSessionSnapshot = CARREGANDO
let promessa: Promise<UiSessionSnapshot> | null = null
const ouvintes = new Set<() => void>()

function publicar(proximo: UiSessionSnapshot) {
  snapshot = proximo
  for (const o of ouvintes) o()
}

/** Carrega a sessão uma vez e reaproveita; as guardas das rotas esperam por ela. */
export function ensureUiSession(): Promise<UiSessionSnapshot> {
  promessa ??= carregarSessao().then((resultado) => {
    publicar(resultado)
    return resultado
  })
  return promessa
}

/** Chame depois de login, logout ou troca de papéis para a UI reler a sessão. */
export function invalidateUiSession(): void {
  promessa = null
  publicar(CARREGANDO)
}

export function useUiSession(): UiSessionSnapshot {
  const atual = useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte)
      return () => ouvintes.delete(ouvinte)
    },
    () => snapshot,
    () => CARREGANDO,
  )
  useEffect(() => {
    void ensureUiSession()
  }, [atual.status])
  return atual
}
