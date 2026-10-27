import { FakeNotificationProvider } from '../../../src/contracts/fakes/notification-provider'
import { FakeOutbox } from '../../../src/contracts/fakes/outbox'
import { publicarDocumento } from '../../../src/modules/identity/application/terms-service'
import { createIdentityDeps, type IdentityDeps } from '../../../src/modules/identity/infra/deps'
import { createIdentityAuth } from '../../../src/modules/identity/infra/auth'
import { createSessionResolver } from '../../../src/modules/identity/infra/session-resolver'
import type { AuthInstance } from '../../../src/platform/auth'
import type { BancoDeTeste } from './banco'

let proximoIp = 1
export const ORIGEM = 'http://localhost:3000'
export const SEGREDO_DE_TESTE = 'segredo-de-teste-do-identity-com-mais-de-32-caracteres'

export interface Ambiente {
  readonly deps: IdentityDeps
  readonly notificacoes: FakeNotificationProvider
  readonly outbox: FakeOutbox
  readonly auth: AuthInstance
  readonly resolver: ReturnType<typeof createSessionResolver>
  /** Código mais recente enviado por OTP (a mensagem fake traz o código; nunca o produção). */
  ultimoCodigo(): string
  /** POST JSON nos endpoints do Better Auth como o navegador faria (mesma origem). */
  post(caminho: string, corpo: unknown, cookie?: string, ip?: string): Promise<{ status: number; json: Record<string, unknown>; cookie: string | null }>
}

export async function criarAmbiente(banco: BancoDeTeste, opcoes: { google?: boolean } = {}): Promise<Ambiente> {
  const notificacoes = new FakeNotificationProvider()
  const outbox = new FakeOutbox()
  const deps = createIdentityDeps({
    db: banco.db,
    clock: banco.clock,
    secret: SEGREDO_DE_TESTE,
    notifications: notificacoes,
    outbox,
  })
  await banco.db.transaction(async (tx) => {
    await publicarDocumento(tx, banco.clock, { barbeariaId: banco.barbearia.id, tipo: 'termos', versao: '1', texto: 'Termos de teste v1' })
    await publicarDocumento(tx, banco.clock, { barbeariaId: banco.barbearia.id, tipo: 'privacidade', versao: '1', texto: 'Privacidade de teste v1' })
  })
  const auth = createIdentityAuth({
    deps,
    barbeariaId: banco.barbearia.id,
    baseURL: ORIGEM,
    production: false,
    google: opcoes.google
      ? { clientId: 'id-de-teste', clientSecret: 'segredo-de-teste', verifyIdToken: () => Promise.resolve(true) }
      : undefined,
  })
  const resolver = createSessionResolver({
    auth: () => auth,
    db: () => banco.db,
    barbeariaId: () => Promise.resolve(banco.barbearia.id),
  })
  return {
    deps,
    notificacoes,
    outbox,
    auth,
    resolver,
    ultimoCodigo() {
      const ultima = notificacoes.sent[notificacoes.sent.length - 1]
      const achado = /^(\d{6}) /.exec(ultima?.text ?? '')
      if (!achado?.[1]) throw new Error('Nenhum código enviado.')
      return achado[1]
    },
    async post(caminho, corpo, cookie, ip) {
      const resposta = await auth.handler(
        new Request(`${ORIGEM}/api/auth${caminho}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: ORIGEM,
            // IP distinto por chamada, salvo teste de limite por IP: o contador de IP não interfere nos demais.
            'x-real-ip': ip ?? `10.0.${Math.floor(proximoIp / 250)}.${proximoIp++ % 250}`,
            ...(cookie ? { cookie } : {}),
          },
          body: JSON.stringify(corpo),
        }),
      )
      const texto = await resposta.text()
      const setCookies = resposta.headers.getSetCookie()
      const sessao = setCookies.map((c) => c.split(';')[0]).filter((c): c is string => !!c && /session_token=[^;]+/.test(c))
      return {
        status: resposta.status,
        json: texto ? (JSON.parse(texto) as Record<string, unknown>) : {},
        cookie: sessao.length > 0 ? (sessao[sessao.length - 1] ?? null) : null,
      }
    },
  }
}

/** Requisição "do navegador" com o cookie de sessão, para o `SessionResolver`. */
export function requisicaoComCookie(cookie: string): Request {
  return new Request(`${ORIGEM}/qualquer`, { headers: { cookie } })
}

/** Faz o login completo (código → nome → aceite) e devolve o cookie e o id da conta. */
export async function entrar(
  amb: Ambiente,
  telefone: string,
  nome: string,
): Promise<{ cookie: string; usuarioId: string }> {
  await amb.post('/identity/otp/send', { telefone })
  let r = await amb.post('/identity/otp/verify', { telefone, codigo: amb.ultimoCodigo() })
  if (r.json['status'] === 'needs_profile') {
    r = await amb.post('/identity/otp/complete', {
      continuacao: r.json['continuacao'],
      nome,
      aceites: { termos: '1', privacidade: '1' },
    })
  }
  if (!r.cookie) throw new Error(`Login falhou: ${JSON.stringify(r.json)}`)
  const sessao = await amb.resolver.resolve(requisicaoComCookie(r.cookie))
  if (!sessao) throw new Error('Sessão não resolvida após o login.')
  return { cookie: r.cookie, usuarioId: sessao.actorId }
}
