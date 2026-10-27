import { defineErrors } from '../errors/define-errors'

export const OriginErrors = defineErrors('AUTH', {
  ORIGIN_INVALID: { httpStatus: 403, message: 'Origem da requisição não permitida.' },
})

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS'])

function originOf(valor: string | null | undefined): string | null {
  if (!valor) return null
  try {
    return new URL(valor).origin
  } catch {
    return null
  }
}

/** Origem pública desta requisição, atrás de proxy: `x-forwarded-*` > `Host` > URL. */
export function requestOrigin(request: Request): string {
  const url = new URL(request.url)
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? url.protocol.slice(0, -1)
  return `${proto}://${host}`
}

export interface OriginCheckOptions {
  /** `APP_URL`: origem canônica adicional aceita (domínio público do deploy). */
  readonly appUrl?: string | undefined
}

/**
 * PRD §7.8 / D0015: proteção CSRF das mutações. Toda requisição que muda estado (POST etc.) precisa trazer
 * `Origin` igual à origem desta aplicação (ou a `APP_URL`). Sem `Origin`, só passa se o navegador marcou a
 * requisição como `Sec-Fetch-Site: same-origin`. Cookies `sameSite=lax` são a segunda barreira, não a única.
 */
export function isAllowedOrigin(request: Request, options: OriginCheckOptions = {}): boolean {
  if (METODOS_SEGUROS.has(request.method.toUpperCase())) return true
  const permitidas = new Set<string>([requestOrigin(request)])
  const canonica = originOf(options.appUrl)
  if (canonica) permitidas.add(canonica)
  const origin = request.headers.get('origin')
  if (origin !== null) return permitidas.has(origin)
  return request.headers.get('sec-fetch-site') === 'same-origin'
}

export function assertAllowedOrigin(request: Request, options: OriginCheckOptions = {}): void {
  if (!isAllowedOrigin(request, options)) throw OriginErrors.ORIGIN_INVALID()
}
