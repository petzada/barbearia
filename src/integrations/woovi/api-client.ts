import { ExternalNotAppliedError } from '~/platform/external-ops'
import { parseRetryAfter, PermanentJobError } from '~/platform/jobs'

export type WooviFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export interface WooviRequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly allowNotFound?: boolean
}

export class WooviApiClient {
  private readonly apiBaseUrl: string

  constructor(
    private readonly appId: string,
    apiBaseUrl = 'https://api.woovi-sandbox.com',
    private readonly fetcher: WooviFetch = fetch,
  ) {
    this.apiBaseUrl = apiBaseUrl.replace(/\/+$/, '')
  }

  async request<T>(path: string, options: WooviRequestOptions = {}): Promise<T | null> {
    const response = await this.fetcher(`${this.apiBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: this.appId,
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      ...(options.signal === undefined ? {} : { signal: options.signal }),
    })

    if (response.status === 404 && options.allowNotFound) return null
    if (!response.ok) {
      const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'), new Date())
      if (response.status === 408 || response.status === 425 || response.status === 429) {
        throw new ExternalNotAppliedError('A Woovi não confirmou a operação.', {
          ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
        })
      }
      if (response.status >= 500)
        throw new Error('A Woovi respondeu com erro temporário e resultado incerto.')
      throw new PermanentJobError('A Woovi recusou a operação. Confira os dados enviados.')
    }
    if (response.status === 204) return {} as T
    const text = await response.text()
    if (text === '') return {} as T
    try {
      return JSON.parse(text) as T
    } catch (error) {
      throw new Error('A Woovi retornou uma resposta inválida.', { cause: error })
    }
  }

  get baseUrl(): string {
    return this.apiBaseUrl
  }
}
