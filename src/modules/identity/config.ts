import { DEFAULT_OTP_POLICY, type OtpPolicy } from './domain/otp'

/** Janela de autenticação recente (D0071/D0081): 1 h; T08 passa a configurar por barbearia. */
export const RECENT_AUTH_WINDOW_MS = 60 * 60 * 1000

/** Sessão de 90 dias, renovada no uso (D0017). */
export const SESSION_TTL_SECONDS = 90 * 24 * 60 * 60
export const SESSION_RENEW_AFTER_SECONDS = 24 * 60 * 60

export interface IdentityConfig {
  readonly otp: OtpPolicy
  readonly recentAuthWindowMs: number
}

export const DEFAULT_IDENTITY_CONFIG: IdentityConfig = {
  otp: DEFAULT_OTP_POLICY,
  recentAuthWindowMs: RECENT_AUTH_WINDOW_MS,
}
