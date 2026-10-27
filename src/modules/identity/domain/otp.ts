// Regras puras do OTP (RN01, D0017). Sem banco, sem relógio global: o instante entra por parâmetro.

export interface SendLimit {
  readonly max: number
  readonly windowMs: number
}

export interface OtpPolicy {
  /** Validade do código. */
  readonly ttlMs: number
  /** Tentativas por código. */
  readonly maxAttempts: number
  /** Padrão proposto no PRD: 3 envios/15 min por telefone. */
  readonly phoneSends: SendLimit
  /** Padrão proposto no PRD: 10 envios/h por IP. */
  readonly ipSends: SendLimit
  /** Validade da continuação do primeiro acesso (nome + aceite) depois do código aceito. */
  readonly continuationTtlMs: number
}

export const DEFAULT_OTP_POLICY: OtpPolicy = {
  ttlMs: 5 * 60_000,
  maxAttempts: 5,
  phoneSends: { max: 3, windowMs: 15 * 60_000 },
  ipSends: { max: 10, windowMs: 60 * 60_000 },
  continuationTtlMs: 10 * 60_000,
}

export interface ChallengeState {
  readonly expiraEm: Date
  readonly tentativas: number
  readonly maxTentativas: number
  readonly invalidadoEm: Date | null
  readonly verificadoEm: Date | null
}

export type ChallengeStatus = 'valido' | 'expirado' | 'esgotado' | 'invalidado' | 'consumido'

/** A validade vence EXATAMENTE em `expiraEm` (semiaberta, como a auth recente): em `expiraEm` já expirou. */
export function challengeStatus(desafio: ChallengeState, agora: Date): ChallengeStatus {
  if (desafio.verificadoEm) return 'consumido'
  if (desafio.invalidadoEm) return 'invalidado'
  if (agora.getTime() >= desafio.expiraEm.getTime()) return 'expirado'
  if (desafio.tentativas >= desafio.maxTentativas) return 'esgotado'
  return 'valido'
}

export type SendDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly retryAfterSeconds: number }

/**
 * Janela deslizante sobre os envios já feitos. Quando estourou, `retryAfterSeconds` é o tempo até o envio mais
 * antigo da janela sair dela (o suficiente para liberar uma vaga).
 */
export function decideSend(enviosEm: readonly Date[], agora: Date, regra: SendLimit): SendDecision {
  const inicio = agora.getTime() - regra.windowMs
  const naJanela = enviosEm.filter((d) => d.getTime() > inicio).sort((a, b) => a.getTime() - b.getTime())
  if (naJanela.length < regra.max) return { allowed: true }
  const critico = naJanela[naJanela.length - regra.max]
  const libera = (critico?.getTime() ?? agora.getTime()) + regra.windowMs
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((libera - agora.getTime()) / 1000)) }
}
