import { createAuthEndpoint, getSessionFromCtx, APIError } from 'better-auth/api'
import { setSessionCookie } from 'better-auth/cookies'
import type { BetterAuthPlugin } from 'better-auth'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { createAuth, requestOrigin, type AuthInstance, type GoogleOptions } from '~/platform/auth'
import { normalizeBrazilianPhone } from '~/platform/auth/phone'
import { getDeployBarbearia } from '~/platform/db/deploy-barbearia'
import { getDatabase } from '~/platform/db/runtime'
import { isAppError } from '~/platform/errors/app-error'
import { newId } from '~/platform/ids'
import { logger } from '~/platform/logging'
import { loadEnv } from '~/platform/validation/env'
import { completeFirstAccess, verifyLogin } from '../application/login-service'
import { requestOtp } from '../application/otp-service'
import {
  confirmPhoneChange,
  confirmReauth,
  requestPhoneChange,
  requestReauth,
} from '../application/phone-service'
import { SESSION_RENEW_AFTER_SECONDS, SESSION_TTL_SECONDS } from '../config'
import { IdentityErrors } from '../errors'
import { authAccounts, authSessions, authVerifications, usuarios } from '../schema'
import { authUsers } from './auth-user-table'
import { createIdentityDeps, type IdentityDeps } from './deps'

type ApiStatus =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'TOO_MANY_REQUESTS'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_SERVER_ERROR'
  | 'BAD_REQUEST'

const STATUS_POR_HTTP: Record<number, ApiStatus> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  503: 'SERVICE_UNAVAILABLE',
}

/** Erros esperados (AppError) viram resposta com código e mensagem segura; o resto vira 500 genérico com log. */
function paraApiError(error: unknown): APIError {
  if (error instanceof APIError) return error
  if (isAppError(error)) {
    return new APIError(STATUS_POR_HTTP[error.httpStatus] ?? 'INTERNAL_SERVER_ERROR', {
      code: error.code,
      message: error.message,
      ...(error.retryAfterSeconds === undefined ? {} : { retryAfterSeconds: error.retryAfterSeconds }),
    })
  }
  logger.error({ err: error }, 'falha inesperada no login')
  return new APIError('INTERNAL_SERVER_ERROR', {
    code: 'SYSTEM.INTERNAL',
    message: 'Algo deu errado. Tente novamente em instantes.',
  })
}

/** `x-real-ip` (colocado pelo proxy do Railway) ou o primeiro `x-forwarded-for`; só entra em hash para limite por IP. */
export function clientIp(headers: Headers | undefined): string | null {
  if (!headers) return null
  return headers.get('x-real-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}

const telefoneSchema = z.object({ telefone: z.string().min(1).max(32) })
const codigoSchema = z.string().regex(/^\d{6}$/, 'O código tem 6 dígitos.')

function exigirTelefone(raw: string): string {
  const phone = normalizeBrazilianPhone(raw)
  if (!phone) throw IdentityErrors.PHONE_INVALID()
  return phone
}

export interface IdentityPluginOptions {
  readonly deps: () => IdentityDeps
  readonly barbeariaId: () => Promise<string>
  readonly googleEnabled: boolean
}

type EndpointCtx = Parameters<typeof setSessionCookie>[0]

/**
 * Endpoints do login por WhatsApp. Ficam como plugin do Better Auth só para reaproveitar o tratamento de
 * cookie/sessão e a checagem de origem; a regra vive em `application/` (testável sem HTTP).
 */
export function identityPlugin(options: IdentityPluginOptions) {
  const comErro = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn()
    } catch (error) {
      throw paraApiError(error)
    }
  }

  async function sessaoObrigatoria(ctx: EndpointCtx) {
    const sessao = await getSessionFromCtx(ctx)
    if (!sessao) throw IdentityErrors.SESSION_REQUIRED_FOR_PURPOSE()
    return sessao
  }

  async function abrirSessao(ctx: EndpointCtx, usuarioId: string): Promise<void> {
    const deps = options.deps()
    const session = await ctx.context.internalAdapter.createSession(usuarioId, false, {
      authTime: deps.clock.now(),
    })
    const user = await ctx.context.internalAdapter.findUserById(usuarioId)
    if (!session || !user) throw IdentityErrors.USER_NOT_ELIGIBLE()
    await setSessionCookie(ctx, { session, user })
  }

  return {
    id: 'identity',
    endpoints: {
      identityConfig: createAuthEndpoint(
        '/identity/config',
        { method: 'GET' },
        async (ctx) => ctx.json({ google: options.googleEnabled }),
      ),

      identityOtpSend: createAuthEndpoint(
        '/identity/otp/send',
        { method: 'POST', body: telefoneSchema },
        (ctx) =>
          comErro(async () => {
            const deps = options.deps()
            const resultado = await requestOtp(deps, {
              barbeariaId: await options.barbeariaId(),
              phone: exigirTelefone(ctx.body.telefone),
              finalidade: 'login',
              ip: clientIp(ctx.request?.headers),
            })
            return ctx.json({ ok: true, expiraEm: resultado.expiraEm.toISOString() })
          }),
      ),

      identityOtpVerify: createAuthEndpoint(
        '/identity/otp/verify',
        { method: 'POST', body: telefoneSchema.extend({ codigo: codigoSchema }) },
        (ctx) =>
          comErro(async () => {
            const resultado = await verifyLogin(options.deps(), {
              barbeariaId: await options.barbeariaId(),
              phone: exigirTelefone(ctx.body.telefone),
              code: ctx.body.codigo,
            })
            if (resultado.kind === 'session') {
              await abrirSessao(ctx, resultado.usuarioId)
              return ctx.json({ status: 'logged_in' as const })
            }
            return ctx.json({
              status: 'needs_profile' as const,
              continuacao: resultado.continuation,
              nomeSugerido: resultado.suggestedName,
              documentos: resultado.documentos,
            })
          }),
      ),

      identityOtpComplete: createAuthEndpoint(
        '/identity/otp/complete',
        {
          method: 'POST',
          body: z.object({
            continuacao: z.string().min(20).max(200),
            nome: z.string().min(2).max(120),
            aceites: z.object({ termos: z.string().min(1).max(64), privacidade: z.string().min(1).max(64) }),
          }),
        },
        (ctx) =>
          comErro(async () => {
            const resultado = await completeFirstAccess(options.deps(), {
              barbeariaId: await options.barbeariaId(),
              continuation: ctx.body.continuacao,
              nome: ctx.body.nome,
              aceites: ctx.body.aceites,
            })
            await abrirSessao(ctx, resultado.usuarioId)
            return ctx.json({ status: 'logged_in' as const })
          }),
      ),

      identityPhoneChangeSend: createAuthEndpoint(
        '/identity/phone-change/send',
        { method: 'POST', body: telefoneSchema },
        (ctx) =>
          comErro(async () => {
            const sessao = await sessaoObrigatoria(ctx)
            const resultado = await requestPhoneChange(options.deps(), {
              barbeariaId: await options.barbeariaId(),
              usuarioId: sessao.user.id,
              novoTelefone: ctx.body.telefone,
              ip: clientIp(ctx.request?.headers),
            })
            return ctx.json({ ok: true, expiraEm: resultado.expiraEm.toISOString() })
          }),
      ),

      identityPhoneChangeConfirm: createAuthEndpoint(
        '/identity/phone-change/confirm',
        { method: 'POST', body: telefoneSchema.extend({ codigo: codigoSchema }) },
        (ctx) =>
          comErro(async () => {
            const sessao = await sessaoObrigatoria(ctx)
            const resultado = await confirmPhoneChange(options.deps(), {
              barbeariaId: await options.barbeariaId(),
              usuarioId: sessao.user.id,
              novoTelefone: ctx.body.telefone,
              code: ctx.body.codigo,
            })
            return ctx.json({ ok: true, telefone: resultado.telefoneMascarado })
          }),
      ),

      identityReauthSend: createAuthEndpoint(
        '/identity/reauth/send',
        { method: 'POST' },
        (ctx) =>
          comErro(async () => {
            const sessao = await sessaoObrigatoria(ctx)
            const resultado = await requestReauth(options.deps(), {
              barbeariaId: await options.barbeariaId(),
              usuarioId: sessao.user.id,
              ip: clientIp(ctx.request?.headers),
            })
            return ctx.json({ ok: true, expiraEm: resultado.expiraEm.toISOString() })
          }),
      ),

      identityReauthConfirm: createAuthEndpoint(
        '/identity/reauth/confirm',
        { method: 'POST', body: z.object({ codigo: codigoSchema }) },
        (ctx) =>
          comErro(async () => {
            const sessao = await sessaoObrigatoria(ctx)
            const deps = options.deps()
            await confirmReauth(deps, {
              barbeariaId: await options.barbeariaId(),
              usuarioId: sessao.user.id,
              code: ctx.body.codigo,
            })
            // D0071: a MESMA sessão ganha novo `auth_time`; o usuário volta para a ação que pediu a reautenticação.
            await ctx.context.adapter.update({
              model: 'session',
              where: [{ field: 'id', value: sessao.session.id }],
              update: { authTime: deps.clock.now() },
            })
            return ctx.json({ ok: true })
          }),
      ),
    },
  } satisfies BetterAuthPlugin
}

export interface IdentityAuthOptions {
  readonly deps?: IdentityDeps
  readonly barbeariaId?: string
  readonly google?: GoogleOptions | undefined
  readonly production?: boolean
  readonly baseURL?: string
}

/** Monta o Better Auth do app. Testes passam `deps`, `barbeariaId` e um Google com `verifyIdToken` falso. */
export function createIdentityAuth(options: IdentityAuthOptions = {}): AuthInstance {
  const env = loadEnv()
  const deps = (): IdentityDeps => options.deps ?? createIdentityDeps()
  const secret = options.deps?.secret ?? env.BETTER_AUTH_SECRET
  if (!secret) throw new Error('BETTER_AUTH_SECRET ausente: obrigatório para o login (veja o .env.example).')
  const baseURL = options.baseURL ?? env.APP_URL ?? 'http://localhost:3000'
  const google =
    options.google ??
    (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
      : undefined)
  const db = options.deps?.db ?? getDatabase()

  const auth = createAuth({
    db,
    schema: { user: authUsers, session: authSessions, account: authAccounts, verification: authVerifications },
    secret,
    baseURL,
    trustedOrigins: (request) => [
      new URL(baseURL).origin,
      ...(request ? [requestOrigin(request)] : []),
    ],
    google,
    plugins: [
      identityPlugin({
        deps,
        barbeariaId: async () => options.barbeariaId ?? (await getDeployBarbearia()).id,
        googleEnabled: google !== undefined,
      }),
    ],
    production: options.production ?? env.NODE_ENV === 'production',
    sessionTtlSeconds: SESSION_TTL_SECONDS,
    sessionRenewAfterSeconds: SESSION_RENEW_AFTER_SECONDS,
    generateId: () => newId(),
    canCreateSession: async (usuarioId) => {
      const [u] = await db.select({ estado: usuarios.estado }).from(usuarios).where(eq(usuarios.id, usuarioId))
      return u !== undefined && (u.estado === 'ativo' || u.estado === 'exclusao_agendada')
    },
  })
  return auth
}

let instancia: AuthInstance | undefined

export function getAuth(): AuthInstance {
  instancia ??= createIdentityAuth()
  return instancia
}

/** Só testes. */
export function setAuth(auth: AuthInstance | undefined): void {
  instancia = auth
}

