const CHAVE = 'barbearia:boas-vindas'

// Quando o armazenamento do navegador não existe ou recusa escrita (aba privada, política do aparelho),
// a marca vive só em memória: as boas-vindas não reaparecem em loop dentro da mesma visita (PRD §4.1:
// tudo funciona sem localStorage).
let marcaEmMemoria: string | null = null

function armazenamento(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    // Acessar `localStorage` pode lançar (cookies bloqueados): sem armazenamento, segue com a memória.
    return null
  }
}

/** Versão das boas-vindas que este aparelho já viu, ou `null`. Nunca lança. */
export function readSeenWelcomeVersion(): string | null {
  if (marcaEmMemoria !== null) return marcaEmMemoria
  try {
    return armazenamento()?.getItem(CHAVE) ?? null
  } catch {
    return null
  }
}

/** Grava que a versão foi vista (concluir ou pular, D0048). Nunca lança. */
export function markWelcomeSeen(versao: string): void {
  marcaEmMemoria = versao
  try {
    armazenamento()?.setItem(CHAVE, versao)
  } catch {
    // Sem escrita possível: a marca em memória já cobre esta visita.
  }
}

/** Só para testes: esquece a marca em memória. */
export function resetWelcomeMemory(): void {
  marcaEmMemoria = null
}

export interface WelcomeContext {
  readonly loggedIn: boolean
  /** A visita começou numa tela que não é a entrada (link de lembrete, favorito, etc.). */
  readonly deepLink: boolean
  readonly seenVersion: string | null
  readonly currentVersion: string
}

/**
 * Regras de exibição das boas-vindas (D0048, PRD §4.3 P01): uma vez por dispositivo e versão, nunca
 * para logado, nunca quando a entrada é um deep link.
 */
export function shouldShowWelcome({
  loggedIn,
  deepLink,
  seenVersion,
  currentVersion,
}: WelcomeContext): boolean {
  if (loggedIn || deepLink) return false
  return seenVersion !== currentVersion
}
