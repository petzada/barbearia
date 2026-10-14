export interface RetryPolicy {
  /** Espera antes de cada retentativa, em ms; o tamanho da lista é o número de retentativas. */
  readonly delaysMs: readonly number[]
  /** Fração de jitter (0,2 = ±20%) aplicada a esperas maiores que zero. */
  readonly jitterRatio: number
}

const MINUTO = 60_000

/** PRD §7.6: imediato, 1, 5, 15 e 60 minutos, com jitter; depois disso vira pendência. */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  delaysMs: [0, 1 * MINUTO, 5 * MINUTO, 15 * MINUTO, 60 * MINUTO],
  jitterRatio: 0.2,
}

export function defineRetryPolicy(input: Partial<RetryPolicy> = {}): RetryPolicy {
  const delaysMs = input.delaysMs ?? DEFAULT_RETRY_POLICY.delaysMs
  const jitterRatio = input.jitterRatio ?? DEFAULT_RETRY_POLICY.jitterRatio
  if (delaysMs.some((d) => !Number.isFinite(d) || d < 0)) {
    throw new RangeError('As esperas de retentativa devem ser números ≥ 0.')
  }
  if (jitterRatio < 0 || jitterRatio >= 1) throw new RangeError('jitterRatio deve estar em [0, 1).')
  return { delaysMs, jitterRatio }
}

/**
 * Espera da retentativa de número `retryIndex` (0 = primeira retentativa), ou `null` quando a política
 * se esgotou. `retryAfterMs` (Retry-After do provedor) só aumenta a espera, nunca diminui.
 */
export function nextRetryDelayMs(
  policy: RetryPolicy,
  retryIndex: number,
  random: () => number = Math.random,
  retryAfterMs?: number,
): number | null {
  const base = policy.delaysMs[retryIndex]
  if (base === undefined) return null
  const jitter = base === 0 ? 0 : base * policy.jitterRatio * (random() * 2 - 1)
  return Math.max(Math.round(base + jitter), retryAfterMs ?? 0)
}
