// Seguro para o navegador: só `fetch` para os endpoints do login. Nada de servidor aqui.

export interface ErroDeApi {
  readonly code: string
  readonly message: string
  readonly retryAfterSeconds?: number
}

export type RespostaDeApi<T> =
  | { readonly ok: true; readonly dados: T }
  | { readonly ok: false; readonly status: number; readonly erro: ErroDeApi }

/** Mensagem exibida quando a rede ou o servidor não respondem (nunca expõe detalhe técnico). */
export const ERRO_DE_REDE: ErroDeApi = {
  code: 'NETWORK',
  message: 'Sem conexão no momento. Confira sua internet e tente de novo.',
}

export async function chamarAuth<T>(
  caminho: string,
  corpo?: unknown,
  metodo: 'POST' | 'GET' = 'POST',
): Promise<RespostaDeApi<T>> {
  try {
    const resposta = await fetch(`/api/auth${caminho}`, {
      method: metodo,
      credentials: 'same-origin',
      headers: metodo === 'POST' ? { 'content-type': 'application/json' } : undefined,
      body: metodo === 'POST' ? JSON.stringify(corpo ?? {}) : undefined,
    })
    const json = (await resposta.json().catch(() => null)) as Record<string, unknown> | null
    if (resposta.ok) return { ok: true, dados: (json ?? {}) as T }
    const retry = json?.['retryAfterSeconds']
    return {
      ok: false,
      status: resposta.status,
      erro: {
        code: typeof json?.['code'] === 'string' ? json['code'] : 'SYSTEM.INTERNAL',
        message:
          typeof json?.['message'] === 'string'
            ? json['message']
            : 'Algo deu errado. Tente novamente em instantes.',
        ...(typeof retry === 'number' ? { retryAfterSeconds: retry } : {}),
      },
    }
  } catch {
    return { ok: false, status: 0, erro: ERRO_DE_REDE }
  }
}

/**
 * Destino depois do login: só caminho interno (sem `//`, sem esquema, sem barra invertida) — nada de redirect
 * aberto (PRD §7.8). Qualquer coisa estranha cai no padrão.
 */
export function caminhoSeguro(valor: unknown, padrao = '/'): string {
  if (typeof valor !== 'string' || valor.length === 0 || valor.length > 300) return padrao
  if (!valor.startsWith('/') || valor.startsWith('//') || valor.includes('\\')) return padrao
  if ([...valor].some((c) => c.charCodeAt(0) < 32)) return padrao
  return valor
}

export function formatarEspera(segundos: number): string {
  if (segundos < 90) return `${segundos} segundos`
  return `${Math.ceil(segundos / 60)} minutos`
}
