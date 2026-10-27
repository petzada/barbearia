import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { newIdempotencyKey } from '../../src/contracts'
import { defaultRegistry } from '../../src/platform/context'
import type { ExecutionEnvironment } from '../../src/platform/context'
import { setIdentityOutbox } from '../../src/modules/identity/infra/ports'
import { papeisUsuario, usuarios } from '../../src/modules/identity/schema'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'
import { criarAmbiente, entrar, requisicaoComCookie, type Ambiente } from './helpers/identidade'

// Importar o servidor do módulo registra as operações no `defaultRegistry` (e o resolvedor global, que aqui não é usado).
await import('../../src/modules/identity/server')

describe('papéis de equipe, revogação imediata e autenticação recente (D0002, D0071)', () => {
  let banco: BancoDeTeste
  let amb: Ambiente

  beforeAll(async () => {
    banco = await abrirBancoDeTeste()
    amb = await criarAmbiente(banco)
    setIdentityOutbox(amb.outbox)
  })

  afterAll(async () => {
    setIdentityOutbox(undefined)
    await banco.encerrar()
  })

  /** Executa uma operação como o dispatcher faria, com a sessão do cookie e o relógio de teste. */
  async function operar(nome: string, cookie: string, entrada: Record<string, unknown> = {}) {
    const sessao = await amb.resolver.resolve(requisicaoComCookie(cookie))
    const operacao = defaultRegistry.get(nome)
    if (!operacao) throw new Error(`Operação ${nome} não registrada.`)
    const env: ExecutionEnvironment = {
      barbeariaId: banco.barbearia.id,
      clock: banco.clock,
      correlationId: `teste-${nome}`,
      session: sessao,
    }
    const comando = nome === 'identity.concederPapel' || nome === 'identity.revogarPapel' || nome === 'identity.aceitarDocumentos'
    return operacao.run(env, comando ? { idempotencyKey: newIdempotencyKey(), ...entrada } : entrada)
  }

  async function tornarAdmin(usuarioId: string) {
    await banco.db.insert(papeisUsuario).values({
      barbeariaId: banco.barbearia.id,
      usuarioId,
      papel: 'admin',
      concedidoPor: null,
    })
  }

  it('admin concede barbeiro a um cliente; o papel aparece na próxima requisição e emite TeamRoleGranted', async () => {
    const admin = await entrar(amb, '11988881001', 'Admin Um')
    await tornarAdmin(admin.usuarioId)
    const bruno = await entrar(amb, '11988881002', 'Bruno Barbeiro')

    expect((await amb.resolver.resolve(requisicaoComCookie(bruno.cookie)))?.roles).toEqual(['cliente'])
    const r = await operar('identity.concederPapel', admin.cookie, { usuarioId: bruno.usuarioId, papel: 'barbeiro' })
    expect(r).toMatchObject({ status: 'ok', data: { papel: 'barbeiro', jaTinha: false } })
    expect((await amb.resolver.resolve(requisicaoComCookie(bruno.cookie)))?.roles).toEqual(['cliente', 'barbeiro'])
    expect(amb.outbox.events.filter((e) => e.type === 'TeamRoleGranted')).toHaveLength(1)

    // Conceder de novo é idempotente: não duplica linha nem evento.
    const repetido = await operar('identity.concederPapel', admin.cookie, { usuarioId: bruno.usuarioId, papel: 'barbeiro' })
    expect(repetido).toMatchObject({ status: 'ok', data: { jaTinha: true } })
    expect(amb.outbox.events.filter((e) => e.type === 'TeamRoleGranted')).toHaveLength(1)
  })

  it('cliente e barbeiro não gerenciam papéis (AUTH.FORBIDDEN); sem sessão, AUTH.REQUIRED', async () => {
    const cliente = await entrar(amb, '11988881003', 'Cliente Comum')
    expect(await operar('identity.concederPapel', cliente.cookie, { usuarioId: cliente.usuarioId, papel: 'admin' })).toMatchObject({
      status: 'error',
      code: 'AUTH.FORBIDDEN',
    })
    expect(await operar('identity.listarEquipe', cliente.cookie)).toMatchObject({ status: 'error', code: 'AUTH.FORBIDDEN' })
    const semSessao = defaultRegistry.get('identity.listarEquipe')
    expect(
      await semSessao?.run({ barbeariaId: banco.barbearia.id, clock: banco.clock, correlationId: 'x', session: null }, {}),
    ).toMatchObject({ status: 'error', code: 'AUTH.REQUIRED' })
  })

  it('revogação: a sessão de equipe é recusada na PRÓXIMA requisição; a conta de cliente segue funcionando', async () => {
    const admin = await entrar(amb, '11988881004', 'Admin Dois')
    await tornarAdmin(admin.usuarioId)
    const carla = await entrar(amb, '11988881005', 'Carla Barbeira')
    await operar('identity.concederPapel', admin.cookie, { usuarioId: carla.usuarioId, papel: 'barbeiro' })
    // Enquanto é barbeira, pode buscar clientes pelo telefone (dados mínimos).
    const busca = await operar('identity.buscarPorTelefone', carla.cookie, { telefone: '11988881004' })
    expect(busca).toMatchObject({ status: 'ok', data: { usuario: { nome: 'Admin Dois', telefoneMascarado: expect.stringContaining('*') } } })
    expect(JSON.stringify(busca)).not.toContain('11988881004')

    const r = await operar('identity.revogarPapel', admin.cookie, { usuarioId: carla.usuarioId, papel: 'barbeiro', motivo: 'saiu da equipe' })
    expect(r).toMatchObject({ status: 'ok', data: { jaRevogado: false } })

    // MESMO cookie, próxima requisição: sem poderes de equipe.
    expect(await operar('identity.buscarPorTelefone', carla.cookie, { telefone: '11988881004' })).toMatchObject({
      status: 'error',
      code: 'AUTH.FORBIDDEN',
    })
    // A conta de cliente continua: a sessão existe e `identity.me` responde.
    expect(await operar('identity.me', carla.cookie)).toMatchObject({
      status: 'ok',
      data: { nome: 'Carla Barbeira', roles: ['cliente'] },
    })
    const evento = amb.outbox.events.find((e) => e.type === 'TeamRoleRevoked')
    expect(evento?.payload).toMatchObject({ usuarioId: carla.usuarioId, papel: 'barbeiro', papeisRestantes: [] })
    const [historico] = await banco.db
      .select()
      .from(papeisUsuario)
      .where(and(eq(papeisUsuario.usuarioId, carla.usuarioId), eq(papeisUsuario.ativo, false)))
    expect(historico).toMatchObject({ papel: 'barbeiro', revogadoPor: admin.usuarioId, motivoRevogacao: 'saiu da equipe' })
  })

  it('o último admin não pode ser removido; com outro admin ativo, pode', async () => {
    // Estado isolado: só estes dois admins existem para a regra (os de outros testes viram inativos).
    await banco.db.update(papeisUsuario).set({ ativo: false }).where(eq(papeisUsuario.papel, 'admin'))
    const a = await entrar(amb, '11988881006', 'Admin A')
    const b = await entrar(amb, '11988881007', 'Admin B')
    await tornarAdmin(a.usuarioId)

    const unico = await operar('identity.revogarPapel', a.cookie, { usuarioId: a.usuarioId, papel: 'admin' })
    expect(unico).toMatchObject({ status: 'error', code: 'IDENTITY.LAST_ADMIN', httpStatus: 409 })
    expect((await amb.resolver.resolve(requisicaoComCookie(a.cookie)))?.roles).toContain('admin')

    await operar('identity.concederPapel', a.cookie, { usuarioId: b.usuarioId, papel: 'admin' })
    const dois = await operar('identity.revogarPapel', a.cookie, { usuarioId: a.usuarioId, papel: 'admin' })
    expect(dois).toMatchObject({ status: 'ok' })
    // Agora b é o último.
    expect(await operar('identity.revogarPapel', b.cookie, { usuarioId: b.usuarioId, papel: 'admin' })).toMatchObject({
      code: 'IDENTITY.LAST_ADMIN',
    })
  })

  it('duas revogações simultâneas dos dois últimos admins nunca deixam o sistema sem admin', async () => {
    await banco.db.update(papeisUsuario).set({ ativo: false }).where(eq(papeisUsuario.papel, 'admin'))
    const a = await entrar(amb, '11988881008', 'Admin C')
    const b = await entrar(amb, '11988881009', 'Admin D')
    await tornarAdmin(a.usuarioId)
    await tornarAdmin(b.usuarioId)
    const resultados = await Promise.all([
      operar('identity.revogarPapel', a.cookie, { usuarioId: b.usuarioId, papel: 'admin' }),
      operar('identity.revogarPapel', b.cookie, { usuarioId: a.usuarioId, papel: 'admin' }),
    ])
    const ativos = await banco.db
      .select()
      .from(papeisUsuario)
      .where(and(eq(papeisUsuario.papel, 'admin'), eq(papeisUsuario.ativo, true)))
    expect(ativos.length).toBeGreaterThanOrEqual(1)
    expect(resultados.filter((r) => r.status === 'ok')).toHaveLength(1)
  })

  it('só conta ativa recebe papel (pré-cadastro e inexistente são recusados)', async () => {
    await banco.db.update(papeisUsuario).set({ ativo: false }).where(eq(papeisUsuario.papel, 'admin'))
    const admin = await entrar(amb, '11988881010', 'Admin E')
    await tornarAdmin(admin.usuarioId)
    const [pre] = await banco.db
      .insert(usuarios)
      .values({ barbeariaId: banco.barbearia.id, nome: 'Pré Cadastro', estado: 'pre_cadastrado' })
      .returning()
    expect(await operar('identity.concederPapel', admin.cookie, { usuarioId: pre?.id, papel: 'barbeiro' })).toMatchObject({
      code: 'IDENTITY.USER_NOT_ELIGIBLE',
    })
    expect(
      await operar('identity.concederPapel', admin.cookie, { usuarioId: '019a0000-0000-7000-8000-000000000000', papel: 'barbeiro' }),
    ).toMatchObject({ code: 'IDENTITY.USER_NOT_ELIGIBLE' })
    // Papel inválido nunca chega ao handler.
    expect(await operar('identity.concederPapel', admin.cookie, { usuarioId: admin.usuarioId, papel: 'cliente' })).toMatchObject({
      code: 'VALIDATION.FAILED',
    })
  })

  describe('autenticação recente (D0071): 59 min passa, 61 min exige reautenticação', () => {
    it('admin com login há 59 min concede; com 61 min recebe AUTH.RECENT_REQUIRED; reautenticar por OTP libera', async () => {
      await banco.db.update(papeisUsuario).set({ ativo: false }).where(eq(papeisUsuario.papel, 'admin'))
      const admin = await entrar(amb, '11988881011', 'Admin F')
      await tornarAdmin(admin.usuarioId)
      const alvo = await entrar(amb, '11988881012', 'Alvo Papel')

      banco.clock.advance(59 * 60_000)
      expect(await operar('identity.concederPapel', admin.cookie, { usuarioId: alvo.usuarioId, papel: 'barbeiro' })).toMatchObject({
        status: 'ok',
      })

      banco.clock.advance(2 * 60_000) // 61 min desde o login
      const vencida = await operar('identity.revogarPapel', admin.cookie, { usuarioId: alvo.usuarioId, papel: 'barbeiro' })
      expect(vencida).toMatchObject({ status: 'error', code: 'AUTH.RECENT_REQUIRED', httpStatus: 401 })
      // Ações comuns NÃO exigem login recente: consultar a equipe segue funcionando.
      expect(await operar('identity.listarEquipe', admin.cookie)).toMatchObject({ status: 'ok' })

      // Reautenticação: novo OTP no número da própria pessoa; a MESMA sessão ganha novo auth_time.
      await amb.post('/identity/reauth/send', {}, admin.cookie)
      const confirmada = await amb.post('/identity/reauth/confirm', { codigo: amb.ultimoCodigo() }, admin.cookie)
      expect(confirmada.status).toBe(200)
      const depois = await operar('identity.revogarPapel', admin.cookie, { usuarioId: alvo.usuarioId, papel: 'barbeiro' })
      expect(depois).toMatchObject({ status: 'ok' })
    })

    it('reautenticar exige sessão e código correto; código de outra pessoa não serve', async () => {
      const sem = await amb.post('/identity/reauth/send', {})
      expect(sem.status).toBe(401)
      const u = await entrar(amb, '11988881013', 'Pessoa G')
      await amb.post('/identity/reauth/send', {}, u.cookie)
      const certo = amb.ultimoCodigo()
      const ruim = await amb.post('/identity/reauth/confirm', { codigo: certo === '000000' ? '111111' : '000000' }, u.cookie)
      expect(ruim.status).toBe(422)
      expect(ruim.json['code']).toBe('IDENTITY.OTP_INVALID')
    })
  })
})
