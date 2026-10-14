import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  enteredByDeepLink,
  registerInitialEntry,
  resetInitialEntry,
} from '~/ui/welcome/initial-entry'
import {
  markWelcomeSeen,
  readSeenWelcomeVersion,
  resetWelcomeMemory,
  shouldShowWelcome,
} from '~/ui/welcome/welcome-rules'

const base = { loggedIn: false, deepLink: false, seenVersion: null, currentVersion: '1' }

describe('regras de exibição das boas-vindas (D0048, P01)', () => {
  it('visitante novo vê', () => {
    expect(shouldShowWelcome(base)).toBe(true)
  })

  it('uma vez por dispositivo: versão já vista não volta', () => {
    expect(shouldShowWelcome({ ...base, seenVersion: '1' })).toBe(false)
  })

  it('versão nova reaparece uma vez', () => {
    expect(shouldShowWelcome({ ...base, seenVersion: '1', currentVersion: '2' })).toBe(true)
  })

  it('nunca para quem está logado, mesmo sem marca ou com versão nova', () => {
    expect(shouldShowWelcome({ ...base, loggedIn: true })).toBe(false)
    expect(shouldShowWelcome({ ...base, loggedIn: true, seenVersion: '0' })).toBe(false)
  })

  it('nunca quando a entrada é um deep link', () => {
    expect(shouldShowWelcome({ ...base, deepLink: true })).toBe(false)
  })
})

describe('entrada da visita', () => {
  beforeEach(() => resetInitialEntry())

  it('começar em "/" não é deep link; qualquer outra tela é', () => {
    registerInitialEntry('/')
    expect(enteredByDeepLink()).toBe(false)
    resetInitialEntry()
    registerInitialEntry('/app/reservas/123')
    expect(enteredByDeepLink()).toBe(true)
  })

  it('só a primeira entrada vale (navegar depois para "/" não muda)', () => {
    registerInitialEntry('/app/plano')
    registerInitialEntry('/')
    expect(enteredByDeepLink()).toBe(true)
  })

  it('sem entrada registrada não é deep link', () => {
    expect(enteredByDeepLink()).toBe(false)
  })
})

describe('marca no navegador funciona sem localStorage (aba privada)', () => {
  beforeEach(() => resetWelcomeMemory())
  afterEach(() => vi.unstubAllGlobals())

  function janelaComArmazenamento(storage: Partial<Storage> | 'lanca-ao-acessar') {
    const janela =
      storage === 'lanca-ao-acessar'
        ? Object.defineProperty({}, 'localStorage', {
            get() {
              throw new DOMException('bloqueado', 'SecurityError')
            },
          })
        : { localStorage: storage }
    vi.stubGlobal('window', janela)
  }

  it('grava e lê quando o armazenamento funciona', () => {
    const dados = new Map<string, string>()
    janelaComArmazenamento({
      getItem: (k) => dados.get(k) ?? null,
      setItem: (k, v) => void dados.set(k, v),
    })
    expect(readSeenWelcomeVersion()).toBeNull()
    markWelcomeSeen('3')
    expect(dados.get('barbearia:boas-vindas')).toBe('3')
    resetWelcomeMemory()
    expect(readSeenWelcomeVersion()).toBe('3')
  })

  it('acessar localStorage lança: não quebra e lembra na memória da visita', () => {
    janelaComArmazenamento('lanca-ao-acessar')
    expect(readSeenWelcomeVersion()).toBeNull()
    expect(() => markWelcomeSeen('1')).not.toThrow()
    expect(readSeenWelcomeVersion()).toBe('1')
  })

  it('setItem lança (cota/modo privado): não quebra e lembra na memória', () => {
    janelaComArmazenamento({
      getItem: () => null,
      setItem: () => {
        throw new DOMException('cheio', 'QuotaExceededError')
      },
    })
    expect(() => markWelcomeSeen('2')).not.toThrow()
    expect(readSeenWelcomeVersion()).toBe('2')
  })

  it('getItem lança: devolve null em vez de quebrar', () => {
    janelaComArmazenamento({
      getItem: () => {
        throw new Error('falha')
      },
      setItem: () => undefined,
    })
    expect(readSeenWelcomeVersion()).toBeNull()
  })

  it('sem window (servidor): não lança', () => {
    vi.stubGlobal('window', undefined)
    expect(readSeenWelcomeVersion()).toBeNull()
    expect(() => markWelcomeSeen('1')).not.toThrow()
  })
})
