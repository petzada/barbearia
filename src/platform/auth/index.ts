export { AUTH_BASE_PATH, AUTH_COOKIE_PREFIX, createAuth } from './create-auth'
export type { AuthInstance, AuthSchema, CreateAuthOptions, GoogleOptions } from './create-auth'
export { assertAllowedOrigin, isAllowedOrigin, OriginErrors, requestOrigin } from './origin'
export type { OriginCheckOptions } from './origin'
export {
  generateOpaqueToken,
  generateOtpCode,
  hashOtpCode,
  hashSecretValue,
  safeEqualHex,
} from './otp-crypto'
export { isE164Brazilian, normalizeBrazilianPhone } from './phone'
