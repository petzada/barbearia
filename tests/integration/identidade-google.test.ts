import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { authAccounts, usuarios } from '../../src/modules/identity/schema'
import { handleAuthRequest } from '../../src/modules/identity/infra/auth-handler.server'
import { setAuth } from '../../src/modules/identity/infra/auth'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'
import { criarAmbiente, entrar, ORIGEM, requisicaoComCookie, type Ambiente } from './helpers/identidade'

// O Google real é homologado na T38. Aqui o Better Auth roda de verdade (vinculação, sessão, regras de conta); só a
// verificação criptográfica do id token é trocada por um verificador falso, e o token é um JWT sem assinatura.
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
const idToken = (claims: { sub: string; email: string; name?: string }) =>
  `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ email_verified: true, name: 'Pessoa Google', ...claims })}.x`

describe('Google como identidade vinculada (RN01, D0017/D0070)', () => {
  let banco: BancoDeTeste
  let amb: Ambiente

  beforeAll(async () => {
    banco = await abrirBancoDeTeste()
    amb = await criarAmbiente(banco, { google: true })
    setAuth(amb.auth)
  })

  afterAll(async () => {
    setAuth(undefined)
    await banco.encerrar()
  })

  const entrarComGoogle = (claims: { sub: string; email: string }) =>
    amb.post('/sign-in/social', { provider: 'google', idToken: { token: idToken(claims) } })
  const vincular = (cookie: string, claims: { sub: string; email: string }) =>
    amb.post('/link-social', { provider: 'google', idToken: { token: idToken(claims) } }, cookie)
  const contasGoogle = (usuarioId: string) =>
    banco.db.select().from(authAccounts).where(eq(authAccounts.userId, usuarioId))

  it('primeira vez com Google (sem vínculo): não entra, não cria conta — antes é preciso provar o WhatsApp', async () => {
    const antes = (await banco.db.select().from(usuarios)).length
    const r = await entrarComGoogle({ sub: 'g-desconhecido', email: 'novo@exemplo.com' })
    expect(r.cookie).toBeNull()
    expect(r.status).toBeGreaterThanOrEqual(400)
    expect((await banco.db.select().from(usuarios)).length).toBe(antes)
  })

  it('vincular exige sessão aberta por OTP; depois o Google entra SEM código e na MESMA conta', async () => {
    const semSessao = await amb.post('/link-social', { provider: 'google', idToken: { token: idToken({ sub: 'g-ana', email: 'ana@exemplo.com' }) } })
    expect(semSessao.status).toBeGreaterThanOrEqual(400)

    const ana = await entrar(amb, '11988882001', 'Ana Google')
    const link = await vincular(ana.cookie, { sub: 'g-ana', email: 'ana@exemplo.com' })
    expect(link.status).toBe(200)
    expect(await contasGoogle(ana.usuarioId)).toHaveLength(1)
    expect((await contasGoogle(ana.usuarioId))[0]).toMatchObject({ providerId: 'google', accountId: 'g-ana' })

    const enviadosAntes = amb.notificacoes.sent.length
    const entrada = await entrarComGoogle({ sub: 'g-ana', email: 'ana@exemplo.com' })
    expect(entrada.cookie).toBeTruthy()
    expect(amb.notificacoes.sent).toHaveLength(enviadosAntes) // nenhum OTP foi pedido
    const sessao = await amb.resolver.resolve(requisicaoComCookie(entrada.cookie ?? ''))
    expect(sessao?.actorId).toBe(ana.usuarioId)
    expect(sessao?.roles).toEqual(['cliente'])
  })

  it('e-mail igual NÃO vincula: outra identidade Google com o mesmo e-mail não entra na conta', async () => {
    const bia = await entrar(amb, '11988882002', 'Bia Mail')
    await banco.db.update(usuarios).set({ email: 'bia@exemplo.com', emailVerificado: true }).where(eq(usuarios.id, bia.usuarioId))
    const tentativa = await entrarComGoogle({ sub: 'g-outra-pessoa', email: 'bia@exemplo.com' })
    expect(tentativa.cookie).toBeNull()
    expect(tentativa.status).toBeGreaterThanOrEqual(400)
    expect(await contasGoogle(bia.usuarioId)).toHaveLength(0)
  })

  it('a mesma identidade Google não pode ser vinculada a duas contas', async () => {
    const dani = await entrar(amb, '11988882003', 'Dani Dois')
    const eli = await entrar(amb, '11988882004', 'Eli Dois')
    expect((await vincular(dani.cookie, { sub: 'g-compartilhada', email: 'x@exemplo.com' })).status).toBe(200)
    const segunda = await vincular(eli.cookie, { sub: 'g-compartilhada', email: 'x@exemplo.com' })
    expect(segunda.status).toBeGreaterThanOrEqual(400)
    expect(await contasGoogle(eli.usuarioId)).toHaveLength(0)
  })

  it('vincular o Google exige autenticação recente (61 min de sessão → AUTH.RECENT_REQUIRED)', async () => {
    const fabio = await entrar(amb, '11988882005', 'Fábio Recente')
    const chamar = () =>
      handleAuthRequest(
        new Request(`${ORIGEM}/api/auth/link-social`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: ORIGEM, cookie: fabio.cookie },
          body: JSON.stringify({ provider: 'google', idToken: { token: idToken({ sub: 'g-fabio', email: 'f@exemplo.com' }) } }),
        }),
        banco.clock,
      )
    expect((await chamar()).status).toBe(200)
    banco.clock.advance(61 * 60_000)
    const vencida = await chamar()
    expect(vencida.status).toBe(401)
    expect(((await vencida.json()) as { code: string }).code).toBe('AUTH.RECENT_REQUIRED')
  })

  it('conta anonimizada não abre sessão nem pelo Google (veto na criação da sessão)', async () => {
    const gil = await entrar(amb, '11988882006', 'Gil Anon')
    await vincular(gil.cookie, { sub: 'g-gil', email: 'gil@exemplo.com' })
    await banco.db.update(usuarios).set({ estado: 'anonimizado' }).where(eq(usuarios.id, gil.usuarioId))
    const r = await entrarComGoogle({ sub: 'g-gil', email: 'gil@exemplo.com' })
    expect(r.cookie).toBeNull()
    expect(await amb.resolver.resolve(requisicaoComCookie(gil.cookie))).toBeNull() // e a sessão antiga também cai
  })
})
