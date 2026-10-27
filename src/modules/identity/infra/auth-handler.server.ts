// Somente servidor. Porta de entrada HTTP de `/api/auth/*`: filtra o que o Better Auth expõe, confere a origem
// (CSRF) e exige autenticação recente para vincular o Google.
import type { Clock } from '~/contracts/clock'
import { AUTH_BASE_PATH, isAllowedOrigin } from '~/platform/auth'
import { systemClock } from '~/platform/time/clock'
import { loadEnv } from '~/platform/validation/env'
import { RECENT_AUTH_WINDOW_MS } from '../config'
import { getAuth } from './auth'

/**
 * Só estes caminhos existem. O Better Auth traz muito mais (atualizar usuário, trocar e-mail, listar e revogar
 * sessões, desvincular contas…): nada disso é exposto, porque a identidade é nossa (D0070) e o e-mail do Google
 * nunca define quem a pessoa é (RN01).
 */
const CAMINHOS_PERMITIDOS: readonly RegExp[] = [
  /^\/sign-in\/social$/,
  /^\/callback\/google$/,
  /^\/link-social$/,
  /^\/sign-out$/,
  /^\/error$/,
  /^\/identity\/(config|otp\/(send|verify|complete)|phone-change\/(send|confirm)|reauth\/(send|confirm))$/,
]

function json(status: number, corpo: Record<string, unknown>): Response {
  return Response.json(corpo, { status })
}

export async function handleAuthRequest(
  request: Request,
  clock: Clock = systemClock,
): Promise<Response> {
  const caminho = new URL(request.url).pathname.slice(AUTH_BASE_PATH.length) || '/'
  if (!CAMINHOS_PERMITIDOS.some((padrao) => padrao.test(caminho))) {
    return json(404, { code: 'SYSTEM.OPERATION_NOT_FOUND', message: 'Operação não encontrada.' })
  }
  if (!isAllowedOrigin(request, { appUrl: loadEnv().APP_URL })) {
    return json(403, { code: 'AUTH.ORIGIN_INVALID', message: 'Origem da requisição não permitida.' })
  }
  const auth = getAuth()
  if (caminho === '/link-social') {
    // Vincular o Google = provar o WhatsApp agora (RN01/D0071): sessão aberta por OTP há pouco tempo.
    const resposta = await auth.api.getSession({ headers: request.headers })
    const authTime = (resposta?.session as { authTime?: Date | string } | undefined)?.authTime
    if (!resposta) return json(401, { code: 'AUTH.REQUIRED', message: 'É preciso entrar para continuar.' })
    if (!authTime || clock.now().getTime() - new Date(authTime).getTime() >= RECENT_AUTH_WINDOW_MS) {
      return json(401, {
        code: 'AUTH.RECENT_REQUIRED',
        message: 'Confirme sua identidade novamente para continuar.',
      })
    }
  }
  return auth.handler(request)
}
