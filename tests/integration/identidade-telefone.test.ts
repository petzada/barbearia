import { and, eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createPreRegistered } from '../../src/modules/identity/application/users-service'
import { auditoria } from '../../src/platform/audit'
import { vinculosTelefone } from '../../src/modules/identity/schema'
import { abrirBancoDeTeste, type BancoDeTeste } from './helpers/banco'
import { criarAmbiente, entrar, requisicaoComCookie, type Ambiente } from './helpers/identidade'

describe('troca de WhatsApp (A02, RN01, D0070)', () => {
  let banco: BancoDeTeste
  let amb: Ambiente

  beforeAll(async () => {
    banco = await abrirBancoDeTeste()
    amb = await criarAmbiente(banco)
    // Fixture de "assinatura/histórico" ligada ao id da conta (T16/T17 terão as tabelas reais).
    await banco.db.execute(
      sql`create table if not exists fixture_historico (id serial primary key, usuario_id uuid not null, descricao text not null)`,
    )
  })

  afterAll(async () => {
    await banco.db.execute(sql`drop table if exists fixture_historico`)
    await banco.encerrar()
  })

  const trocar = async (cookie: string, novo: string) => {
    const envio = await amb.post('/identity/phone-change/send', { telefone: novo }, cookie)
    if (envio.status !== 200) return { envio, confirmacao: null }
    const confirmacao = await amb.post('/identity/phone-change/confirm', { telefone: novo, codigo: amb.ultimoCodigo() }, cookie)
    return { envio, confirmacao }
  }

  it('sem colisão: o número muda, o histórico segue na mesma conta e o vínculo antigo fica inativo', async () => {
    const ana = await entrar(amb, '11988883001', 'Ana Troca')
    await banco.db.execute(sql`insert into fixture_historico (usuario_id, descricao) values (${ana.usuarioId}, 'assinatura premium')`)

    const { confirmacao } = await trocar(ana.cookie, '(11) 98888-3002')
    expect(confirmacao?.status).toBe(200)
    expect(confirmacao?.json['telefone']).toContain('*') // só mascarado volta ao navegador

    const vinculos = await banco.db.select().from(vinculosTelefone).where(eq(vinculosTelefone.usuarioId, ana.usuarioId))
    const ativo = vinculos.filter((v) => v.ativo)
    const antigo = vinculos.filter((v) => !v.ativo)
    expect(ativo).toHaveLength(1)
    expect(ativo[0]).toMatchObject({ telefone: '+5511988883002' })
    expect(ativo[0]?.verificadoEm).not.toBeNull()
    expect(antigo).toHaveLength(1)
    expect(antigo[0]).toMatchObject({ telefone: '+5511988883001', motivoDesativacao: 'troca_de_numero' })

    // Histórico/assinatura continuam no mesmo id; a sessão aberta segue válida.
    const historico = await banco.db.execute(sql`select count(*)::int as n from fixture_historico where usuario_id = ${ana.usuarioId}`)
    expect((historico.rows[0] as { n: number }).n).toBe(1)
    expect((await amb.resolver.resolve(requisicaoComCookie(ana.cookie)))?.actorId).toBe(ana.usuarioId)

    // O número NOVO entra na mesma conta; o ANTIGO não entra mais nela.
    const novoLogin = await entrar(amb, '11988883002', 'Ana Troca')
    expect(novoLogin.usuarioId).toBe(ana.usuarioId)
    await amb.post('/identity/otp/send', { telefone: '11988883001' })
    const antigoLogin = await amb.post('/identity/otp/verify', { telefone: '11988883001', codigo: amb.ultimoCodigo() })
    expect(antigoLogin.json['status']).toBe('needs_profile') // para o sistema, é um número sem conta

    // Auditoria e evento com telefones mascarados.
    const eventos = amb.outbox.events.filter((e) => e.type === 'PhoneChanged')
    expect(eventos).toHaveLength(1)
    expect(JSON.stringify(eventos[0]?.payload)).not.toMatch(/988883001|988883002/)
    const linhas = await banco.db.select().from(auditoria).where(and(eq(auditoria.recursoId, ana.usuarioId), eq(auditoria.acao, 'identity.telefone_trocado')))
    expect(linhas).toHaveLength(1)
    expect(JSON.stringify(linhas[0])).not.toMatch(/988883001|988883002/)
  })

  it('colisão com conta ATIVA é rejeitada com orientação de suporte, sem fundir contas', async () => {
    const bia = await entrar(amb, '11988883003', 'Bia Troca')
    const caio = await entrar(amb, '11988883004', 'Caio Dono')
    const { envio, confirmacao } = await trocar(bia.cookie, '11988883004')
    expect(envio.status).toBe(200) // no envio não há como saber (não enumera contas)
    expect(confirmacao?.status).toBe(409)
    expect(confirmacao?.json['code']).toBe('IDENTITY.PHONE_IN_USE')
    expect(confirmacao?.json['message']).toContain('Procure a barbearia')

    const ativosBia = await banco.db.select().from(vinculosTelefone).where(and(eq(vinculosTelefone.usuarioId, bia.usuarioId), eq(vinculosTelefone.ativo, true)))
    expect(ativosBia.map((v) => v.telefone)).toEqual(['+5511988883003'])
    const ativosCaio = await banco.db.select().from(vinculosTelefone).where(and(eq(vinculosTelefone.usuarioId, caio.usuarioId), eq(vinculosTelefone.ativo, true)))
    expect(ativosCaio.map((v) => v.telefone)).toEqual(['+5511988883004'])
  })

  it('colisão com número de um pré-cadastro também é rejeitada (nunca fundir)', async () => {
    const dani = await entrar(amb, '11988883005', 'Dani Troca')
    const ctx = banco.contexto({ roles: ['barbeiro'] })
    await banco.db.transaction((tx) => createPreRegistered(tx, ctx, { nome: 'Pré Eli', telefone: '11988883006', registradoPor: dani.usuarioId }))
    const { confirmacao } = await trocar(dani.cookie, '11988883006')
    expect(confirmacao?.json['code']).toBe('IDENTITY.PHONE_IN_USE')
  })

  it('trocar para o próprio número é recusado; número inválido também', async () => {
    const eva = await entrar(amb, '11988883007', 'Eva Mesma')
    const igual = await amb.post('/identity/phone-change/send', { telefone: '11988883007' }, eva.cookie)
    expect(igual.json['code']).toBe('IDENTITY.PHONE_UNCHANGED')
    const invalido = await amb.post('/identity/phone-change/send', { telefone: '12345' }, eva.cookie)
    expect(invalido.json['code']).toBe('IDENTITY.PHONE_INVALID')
  })

  it('exige sessão; o código tem de ser do número NOVO e da própria pessoa', async () => {
    expect((await amb.post('/identity/phone-change/send', { telefone: '11988883008' })).status).toBe(401)
    const fer = await entrar(amb, '11988883009', 'Fer Um')
    const gus = await entrar(amb, '11988883010', 'Gus Dois')
    await amb.post('/identity/phone-change/send', { telefone: '11988883011' }, fer.cookie)
    const codigoDoFer = amb.ultimoCodigo()
    // Outra pessoa logada não consegue usar o código pedido pelo Fer.
    const roubo = await amb.post('/identity/phone-change/confirm', { telefone: '11988883011', codigo: codigoDoFer }, gus.cookie)
    expect(roubo.status).toBe(422)
    // Nem usar o código de login de outro número.
    const outroNumero = await amb.post('/identity/phone-change/confirm', { telefone: '11988883012', codigo: codigoDoFer }, fer.cookie)
    expect(outroNumero.status).toBe(422)
    const certo = await amb.post('/identity/phone-change/confirm', { telefone: '11988883011', codigo: codigoDoFer }, fer.cookie)
    expect(certo.status).toBe(200)
  })
})
