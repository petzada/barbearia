import { betterAuth, type BetterAuthPlugin } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import type { Db } from '../db/types'

/** Nomes que o Better Auth conhece, apontando para as tabelas Drizzle do módulo de identidade. */
export interface AuthSchema {
  readonly user: unknown
  readonly session: unknown
  readonly account: unknown
  readonly verification: unknown
}

export interface GoogleOptions {
  readonly clientId: string
  readonly clientSecret: string
  /** Só testes: pula a verificação criptográfica do id token (nunca em produção). */
  readonly verifyIdToken?: (token: string, nonce?: string) => Promise<boolean>
}

export interface CreateAuthOptions {
  readonly db: Db
  readonly schema: AuthSchema
  readonly secret: string
  /** Origem pública (APP_URL). Atrás de proxy, é o que o Google vê como redirect. */
  readonly baseURL: string
  /** Origens aceitas pelo Better Auth; recebe a requisição para aceitar a origem pública atrás de proxy. */
  readonly trustedOrigins?: (request: Request | undefined) => string[]
  readonly google?: GoogleOptions | undefined
  readonly plugins: readonly BetterAuthPlugin[]
  readonly production: boolean
  readonly sessionTtlSeconds: number
  readonly sessionRenewAfterSeconds: number
  readonly generateId: () => string
  /** Veta a criação de sessão (ex.: conta anonimizada). Vale também para o callback do Google. */
  readonly canCreateSession: (usuarioId: string) => Promise<boolean>
}

export const AUTH_BASE_PATH = '/api/auth'
export const AUTH_COOKIE_PREFIX = 'barbearia'

/**
 * Better Auth para sessão e Google (D0015). Decisões de segurança fixadas aqui:
 * - cookie `httpOnly`, `sameSite=lax`, `secure` em produção, sem cache de sessão em cookie (revogação imediata);
 * - sessão de 90 dias renovada no uso;
 * - Google NUNCA cria conta nem vincula por e-mail (RN01): `disableSignUp` + `disableImplicitLinking`; a única forma
 *   de vincular é `linkSocial` com sessão (aberta por OTP), por isso `allowDifferentEmails`;
 * - sem e-mail/senha, sem outros provedores.
 * O OTP do WhatsApp NÃO usa o plugin de telefone do Better Auth: ele guarda o código em texto puro e zera os
 * contadores no reenvio, o que fere a RN01. O OTP é próprio (modules/identity) e entra como plugin só de endpoints.
 */
export function createAuth(options: CreateAuthOptions) {
  return betterAuth({
    appName: 'Barbearia',
    baseURL: options.baseURL,
    basePath: AUTH_BASE_PATH,
    secret: options.secret,
    trustedOrigins: (request) => options.trustedOrigins?.(request) ?? [],
    database: drizzleAdapter(options.db, {
      provider: 'pg',
      schema: {
        user: options.schema.user,
        session: options.schema.session,
        account: options.schema.account,
        verification: options.schema.verification,
      },
    }),
    user: {
      modelName: 'user',
      fields: {
        name: 'nome',
        email: 'email',
        emailVerified: 'emailVerificado',
        image: 'imagem',
        createdAt: 'criadoEm',
        updatedAt: 'atualizadoEm',
      },
    },
    session: {
      expiresIn: options.sessionTtlSeconds,
      updateAge: options.sessionRenewAfterSeconds,
      cookieCache: { enabled: false },
      additionalFields: {
        authTime: { type: 'date', required: true, input: false },
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
        allowDifferentEmails: true,
        trustedProviders: [],
      },
      encryptOAuthTokens: true,
    },
    emailAndPassword: { enabled: false },
    socialProviders: options.google
      ? {
          google: {
            clientId: options.google.clientId,
            clientSecret: options.google.clientSecret,
            disableSignUp: true,
            ...(options.google.verifyIdToken ? { verifyIdToken: options.google.verifyIdToken } : {}),
          },
        }
      : {},
    advanced: {
      cookiePrefix: AUTH_COOKIE_PREFIX,
      useSecureCookies: options.production,
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: options.production },
      database: { generateId: () => options.generateId() },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            if (!(await options.canCreateSession(String(session.userId)))) return false
            // D0071: sessão nova = autenticação nova (login por OTP ou Google).
            return { data: { ...session, authTime: (session as { authTime?: Date }).authTime ?? new Date() } }
          },
        },
      },
    },
    plugins: [...options.plugins],
  })
}

export type AuthInstance = ReturnType<typeof createAuth>
