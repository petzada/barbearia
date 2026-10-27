import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  aceitesDocumentos,
  authSessions,
  otpDesafios,
  usuarios,
  vinculosTelefone,
} from '../../src/modules/identity/schema'
import { createPreRegistered } from '../../src/modules/identity/application/users-service'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'
import { criarAmbiente, ORIGEM, requisicaoComCookie, type Ambiente } from './helpers/identidade'

describe('login por código no WhatsApp (A01)', () => {
  let banco: BancoDeTeste
  let amb: Ambiente

  beforeAll(async () => {
    banco = await abrirBancoDeTeste()
    amb = await criarAmbiente(banco)
  })

  afterAll(async () => {
    await banco.encerrar()
  })

  async function loginCompleto(telefone: string, nome: string) {
    await amb.post('/identity/otp/send', { telefone })
    const verificado = await amb.post('/identity/otp/verify', { telefone, codigo: amb.ultimoCodigo() })
    if (verificado.json['status'] === 'logged_in') return verificado
    return amb.post('/identity/otp/complete', {
      continuacao: verificado.json['continuacao'],
      nome,
      aceites: { termos: '1', privacidade: '1' },
    })
  }

  it('primeiro acesso: telefone → código → nome → aceite → sessão com papéis de cliente', async () => {
    const telefone = '(11) 98888-0001'
    const envio = await amb.post('/identity/otp/send', { telefone })
    expect(envio.status).toBe(200)

    const verificado = await amb.post('/identity/otp/verify', { telefone, codigo: amb.ultimoCodigo() })
    expect(verificado.json['status']).toBe('needs_profile')
    expect(verificado.cookie).toBeNull() // sem conta e sem aceite não há sessão
    expect((verificado.json['documentos'] as { tipo: string }[]).map((d) => d.tipo).sort()).toEqual(['privacidade', 'termos'])

    const completo = await amb.post('/identity/otp/complete', {
      continuacao: verificado.json['continuacao'],
      nome: 'Ana Souza',
      aceites: { termos: '1', privacidade: '1' },
    })
    expect(completo.json['status']).toBe('logged_in')
    expect(completo.cookie).toBeTruthy()

    const sessao = await amb.resolver.resolve(requisicaoComCookie(completo.cookie ?? ''))
    expect(sessao).toMatchObject({ roles: ['cliente'] })
    const [usuario] = await banco.db.select().from(usuarios).where(eq(usuarios.id, sessao?.actorId ?? ''))
    expect(usuario).toMatchObject({ nome: 'Ana Souza', estado: 'ativo', lembretesAtivos: true })

    // Aceite registrado com versão, hash, instante e canal (D0046).
    const aceites = await banco.db.select().from(aceitesDocumentos).where(eq(aceitesDocumentos.usuarioId, usuario?.id ?? ''))
    expect(aceites).toHaveLength(2)
    expect(aceites.every((a) => a.canal === 'app' && a.versao === '1' && /^[0-9a-f]{64}$/.test(a.hash))).toBe(true)
    // Telefone normalizado e verificado; evento de ativação publicado.
    const [vinculo] = await banco.db.select().from(vinculosTelefone).where(eq(vinculosTelefone.usuarioId, usuario?.id ?? ''))
    expect(vinculo).toMatchObject({ telefone: '+5511988880001', ativo: true })
    expect(vinculo?.verificadoEm).not.toBeNull()
    expect(amb.outbox.events.some((e) => e.type === 'UserActivated')).toBe(true)
  })

  it('a sessão guarda auth_time, dura 90 dias e o cookie é httpOnly + sameSite=lax', async () => {
    const telefone = '11988880002'
    await amb.post('/identity/otp/send', { telefone })
    const verificado = await amb.post('/identity/otp/verify', { telefone, codigo: amb.ultimoCodigo() })
    const resposta = await amb.auth.handler(
      new Request(`${ORIGEM}/api/auth/identity/otp/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: ORIGEM },
        body: JSON.stringify({
          continuacao: verificado.json['continuacao'],
          nome: 'Bia Lima',
          aceites: { termos: '1', privacidade: '1' },
        }),
      }),
    )
    const cabecalho = resposta.headers.getSetCookie().find((c) => c.includes('session_token')) ?? ''
    expect(cabecalho).toMatch(/HttpOnly/i)
    expect(cabecalho).toMatch(/SameSite=Lax/i)
    expect(cabecalho).toMatch(/Max-Age=7776000/) // 90 dias

    const [sessao] = await banco.db.select().from(authSessions).orderBy(authSessions.createdAt).limit(10)
    expect(sessao?.authTime).toBeInstanceOf(Date)
  })

  it('quem já tem conta entra só com o código (sem nome nem aceite de novo)', async () => {
    await loginCompleto('11988880003', 'Caio Dias')
    const segundo = await loginCompleto('11988880003', 'Outro Nome')
    expect(segundo.json['status']).toBe('logged_in')
    expect(segundo.cookie).toBeTruthy()
    const contas = await banco.db.select().from(vinculosTelefone).where(eq(vinculosTelefone.telefone, '+5511988880003'))
    expect(contas).toHaveLength(1) // não duplicou conta
  })

  it('o token de continuação serve uma vez só', async () => {
    const telefone = '11988880004'
    await amb.post('/identity/otp/send', { telefone })
    const verificado = await amb.post('/identity/otp/verify', { telefone, codigo: amb.ultimoCodigo() })
    const corpo = {
      continuacao: verificado.json['continuacao'],
      nome: 'Duda Reis',
      aceites: { termos: '1', privacidade: '1' },
    }
    expect((await amb.post('/identity/otp/complete', corpo)).status).toBe(200)
    const repetido = await amb.post('/identity/otp/complete', corpo)
    expect(repetido.status).toBe(422)
    expect(repetido.json['code']).toBe('IDENTITY.CONTINUATION_INVALID')
  })

  it('aceite com versão desatualizada ou sem aceite é recusado', async () => {
    const telefone = '11988880005'
    await amb.post('/identity/otp/send', { telefone })
    const verificado = await amb.post('/identity/otp/verify', { telefone, codigo: amb.ultimoCodigo() })
    const ruim = await amb.post('/identity/otp/complete', {
      continuacao: verificado.json['continuacao'],
      nome: 'Edu Prado',
      aceites: { termos: '0', privacidade: '1' },
    })
    expect(ruim.status).toBe(409)
    expect(ruim.json['code']).toBe('IDENTITY.TERMS_OUTDATED')
    const semAceite = await amb.post('/identity/otp/complete', {
      continuacao: verificado.json['continuacao'],
      nome: 'Edu Prado',
    })
    expect(semAceite.status).toBeGreaterThanOrEqual(400)
  })

  it('pré-cadastro → ativação pelo mesmo telefone: mesmo id, histórico e preferência de lembrete preservados', async () => {
    const equipeId = banco.contexto().actorId ?? ''
    const ctx = banco.contexto({ roles: ['barbeiro'] })
    const criado = await banco.db.transaction((tx) =>
      createPreRegistered(tx, ctx, { nome: 'Fábio Cardoso', telefone: '11988880006', registradoPor: equipeId }),
    )
    expect(criado.jaExistia).toBe(false)
    // O cliente respondeu SAIR antes de ativar a conta (D0073) e há um registro "histórico" ligado ao id.
    await banco.db.update(usuarios).set({ lembretesAtivos: false }).where(eq(usuarios.id, criado.usuarioId))

    const telefone = '11988880006'
    await amb.post('/identity/otp/send', { telefone })
    const verificado = await amb.post('/identity/otp/verify', { telefone, codigo: amb.ultimoCodigo() })
    expect(verificado.json['status']).toBe('needs_profile')
    expect(verificado.json['nomeSugerido']).toBe('Fábio Cardoso') // só depois de provar o número
    const completo = await amb.post('/identity/otp/complete', {
      continuacao: verificado.json['continuacao'],
      nome: 'Fábio Cardoso',
      aceites: { termos: '1', privacidade: '1' },
    })
    expect(completo.status).toBe(200)
    const sessao = await amb.resolver.resolve(requisicaoComCookie(completo.cookie ?? ''))
    expect(sessao?.actorId).toBe(criado.usuarioId) // mesma conta
    const [ativo] = await banco.db.select().from(usuarios).where(eq(usuarios.id, criado.usuarioId))
    expect(ativo).toMatchObject({ estado: 'ativo', lembretesAtivos: false, registradoPor: equipeId })
    const [vinculo] = await banco.db
      .select()
      .from(vinculosTelefone)
      .where(and(eq(vinculosTelefone.usuarioId, criado.usuarioId), eq(vinculosTelefone.ativo, true)))
    expect(vinculo?.verificadoEm).not.toBeNull()
    expect(amb.outbox.events.filter((e) => e.type === 'UserActivated' && (e.payload as { usuarioId: string }).usuarioId === criado.usuarioId)).toHaveLength(1)

    // Pré-cadastrar de novo o mesmo número devolve a conta ativa, sem duplicar.
    const outra = await banco.db.transaction((tx) =>
      createPreRegistered(tx, ctx, { nome: 'Nome Diferente', telefone: '(11) 98888-0006', registradoPor: equipeId }),
    )
    expect(outra).toEqual({ usuarioId: criado.usuarioId, jaExistia: true })
  })

  it('número que já tem conta ativa recebendo código de novo dispositivo entra normalmente (risco aceito D0017/D0070)', async () => {
    await loginCompleto('11988880007', 'Gabi Alves')
    const novoDispositivo = await loginCompleto('11988880007', '')
    expect(novoDispositivo.cookie).toBeTruthy()
  })

  it('sem sessão: cookie ausente, adulterado ou desconhecido não autentica', async () => {
    expect(await amb.resolver.resolve(new Request(`${ORIGEM}/x`))).toBeNull()
    expect(await amb.resolver.resolve(requisicaoComCookie('barbearia.session_token=lixo.lixo'))).toBeNull()
  })

  it('só uma lista fechada de caminhos do Better Auth existe; POST de outra origem é recusado', async () => {
    const { handleAuthRequest } = await import('../../src/modules/identity/infra/auth-handler.server')
    const { setAuth } = await import('../../src/modules/identity/infra/auth')
    setAuth(amb.auth)
    const chamar = (caminho: string, origin: string | null, metodo = 'POST') =>
      handleAuthRequest(
        new Request(`${ORIGEM}/api/auth${caminho}`, {
          method: metodo,
          headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) },
          ...(metodo === 'POST' ? { body: JSON.stringify({ telefone: '11988880008' }) } : {}),
        }),
      )

    const forjada = await chamar('/identity/otp/send', 'https://evil.example')
    expect(forjada.status).toBe(403)
    expect(((await forjada.json()) as { code: string }).code).toBe('AUTH.ORIGIN_INVALID')
    expect((await chamar('/identity/otp/send', null)).status).toBe(403) // sem Origin e sem Sec-Fetch-Site
    const [achado] = await banco.db.select().from(otpDesafios).where(eq(otpDesafios.telefone, '+5511988880008'))
    expect(achado).toBeUndefined() // nada foi criado nem enviado

    expect((await chamar('/update-user', ORIGEM)).status).toBe(404) // Better Auth traz mais do que expomos
    expect((await chamar('/sign-in/email', ORIGEM)).status).toBe(404)
    expect((await chamar('/list-sessions', ORIGEM, 'GET')).status).toBe(404)
    expect((await chamar('/identity/otp/send', ORIGEM)).status).toBe(200)
    setAuth(undefined)
  })
})
