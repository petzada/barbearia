import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import type { StorageProvider } from '~/contracts'
import type { Db } from '~/platform/db/types'
import { barbearias } from '~/platform/db/schema/barbearias'
import type { ComissaoVigencia } from '../domain/catalogo'
import { percentAt } from '../domain/catalogo'
import { barbeiros, comboComponentes, comissaoVigencias, habilitacoes, servicos } from '../schema'

export interface ServicoPublico {
  readonly id: string
  readonly nome: string
  readonly descricao: string | null
  readonly precoCentavos: number
  readonly duracaoMinutos: number
  readonly tipo: string
  readonly componentes: readonly string[]
  readonly fotoUrl: string | null
}

export interface BarbeiroPublico {
  readonly id: string
  readonly nome: string
  readonly bio: string | null
  readonly fotoUrl: string | null
  readonly servicos: readonly string[]
}

export interface ServicoAdmin {
  readonly id: string
  readonly nome: string
  readonly descricao: string | null
  readonly precoCentavos: number
  readonly duracaoMinutos: number
  readonly tipo: string
  readonly ativo: boolean
  readonly revisao: number
  readonly componentes: readonly { id: string; nome: string }[]
}

export interface CelulaMatriz {
  readonly barbeiroId: string
  readonly barbeiroNome: string
  readonly servicoId: string
  readonly servicoNome: string
  readonly servicoTipo: string
  readonly habilitado: boolean
  readonly percentualAvulsoBp: number | null
  readonly percentualAssinanteBp: number | null
  readonly inicioVigencia: string | null
}

export async function getShopTimeZone(db: Db, barbeariaId: string): Promise<string> {
  const [barbearia] = await db
    .select({ fuso: barbearias.fuso })
    .from(barbearias)
    .where(eq(barbearias.id, barbeariaId))
  if (!barbearia) throw new Error('Barbearia do contexto não encontrada.')
  return barbearia.fuso
}

async function fotoPublica(storage: StorageProvider, key: string | null): Promise<string | null> {
  if (!key) return null
  const info = await storage.head(key)
  if (!info) return null
  const signed = await storage.createReadUrl({ key, expiresInSeconds: 300 })
  return signed.url.startsWith('https://') ? signed.url : null
}

async function nomesDosComponentes(db: Db, barbeariaId: string, comboIds: readonly string[]) {
  if (comboIds.length === 0) return new Map<string, { id: string; nome: string }[]>()
  const linhas = await db
    .select({ comboId: comboComponentes.comboId, id: servicos.id, nome: servicos.nome })
    .from(comboComponentes)
    .innerJoin(
      servicos,
      and(
        eq(servicos.barbeariaId, comboComponentes.barbeariaId),
        eq(servicos.id, comboComponentes.componenteId),
      ),
    )
    .where(
      and(
        eq(comboComponentes.barbeariaId, barbeariaId),
        inArray(comboComponentes.comboId, [...comboIds]),
      ),
    )
    .orderBy(asc(servicos.nome))
  const mapa = new Map<string, { id: string; nome: string }[]>()
  for (const linha of linhas) {
    const componentes = mapa.get(linha.comboId) ?? []
    componentes.push({ id: linha.id, nome: linha.nome })
    mapa.set(linha.comboId, componentes)
  }
  return mapa
}

export async function listPublicCatalog(db: Db, barbeariaId: string, storage: StorageProvider) {
  const linhas = await db
    .select()
    .from(servicos)
    .where(and(eq(servicos.barbeariaId, barbeariaId), eq(servicos.ativo, true)))
    .orderBy(asc(servicos.tipo), asc(servicos.nome))
  const combos = linhas.filter((servico) => servico.tipo === 'combo').map((servico) => servico.id)
  const componentes = await nomesDosComponentes(db, barbeariaId, combos)
  return Promise.all(
    linhas.map(async (servico): Promise<ServicoPublico> => ({
      id: servico.id,
      nome: servico.nome,
      descricao: servico.descricao,
      precoCentavos: servico.precoCentavos,
      duracaoMinutos: servico.duracaoMinutos,
      tipo: servico.tipo,
      componentes: (componentes.get(servico.id) ?? []).map((item) => item.nome),
      fotoUrl: await fotoPublica(storage, servico.fotoKey),
    })),
  )
}

export async function listPublicBarbers(
  db: Db,
  barbeariaId: string,
  storage: StorageProvider,
): Promise<BarbeiroPublico[]> {
  const profissionais = await db
    .select({
      id: barbeiros.id,
      nome: barbeiros.nomeExibicao,
      bio: barbeiros.bio,
      fotoKey: barbeiros.fotoKey,
    })
    .from(barbeiros)
    .where(and(eq(barbeiros.barbeariaId, barbeariaId), eq(barbeiros.ativo, true)))
    .orderBy(asc(barbeiros.ordem), asc(barbeiros.nomeExibicao))
  if (profissionais.length === 0) return []
  const servicosDoBarbeiro = await db
    .select({ barbeiroId: habilitacoes.barbeiroId, nome: servicos.nome })
    .from(habilitacoes)
    .innerJoin(
      servicos,
      and(
        eq(servicos.barbeariaId, habilitacoes.barbeariaId),
        eq(servicos.id, habilitacoes.servicoId),
      ),
    )
    .where(
      and(
        eq(habilitacoes.barbeariaId, barbeariaId),
        inArray(
          habilitacoes.barbeiroId,
          profissionais.map((item) => item.id),
        ),
        eq(habilitacoes.habilitado, true),
        eq(servicos.ativo, true),
      ),
    )
    .orderBy(asc(servicos.nome))
  const mapa = new Map<string, string[]>()
  for (const linha of servicosDoBarbeiro) {
    const nomes = mapa.get(linha.barbeiroId) ?? []
    nomes.push(linha.nome)
    mapa.set(linha.barbeiroId, nomes)
  }
  return Promise.all(
    profissionais.map(async (profissional) => ({
      id: profissional.id,
      nome: profissional.nome,
      bio: profissional.bio,
      fotoUrl: await fotoPublica(storage, profissional.fotoKey),
      servicos: mapa.get(profissional.id) ?? [],
    })),
  )
}

export async function listAdminCatalog(db: Db, barbeariaId: string): Promise<ServicoAdmin[]> {
  const linhas = await db
    .select()
    .from(servicos)
    .where(eq(servicos.barbeariaId, barbeariaId))
    .orderBy(desc(servicos.ativo), asc(servicos.tipo), asc(servicos.nome))
  const combos = linhas.filter((servico) => servico.tipo === 'combo').map((servico) => servico.id)
  const componentes = await nomesDosComponentes(db, barbeariaId, combos)
  return linhas.map((servico) => ({
    id: servico.id,
    nome: servico.nome,
    descricao: servico.descricao,
    precoCentavos: servico.precoCentavos,
    duracaoMinutos: servico.duracaoMinutos,
    tipo: servico.tipo,
    ativo: servico.ativo,
    revisao: servico.revisao,
    componentes: componentes.get(servico.id) ?? [],
  }))
}

export async function listMatrix(
  db: Db,
  barbeariaId: string,
  dataLocal: string,
): Promise<CelulaMatriz[]> {
  const [profissionais, servicosAtivos, habilitacoesAtuais, vigencias] = await Promise.all([
    db
      .select({ id: barbeiros.id, nome: barbeiros.nomeExibicao })
      .from(barbeiros)
      .where(and(eq(barbeiros.barbeariaId, barbeariaId), eq(barbeiros.ativo, true)))
      .orderBy(asc(barbeiros.ordem), asc(barbeiros.nomeExibicao)),
    db
      .select({ id: servicos.id, nome: servicos.nome, tipo: servicos.tipo })
      .from(servicos)
      .where(and(eq(servicos.barbeariaId, barbeariaId), eq(servicos.ativo, true)))
      .orderBy(asc(servicos.tipo), asc(servicos.nome)),
    db.select().from(habilitacoes).where(eq(habilitacoes.barbeariaId, barbeariaId)),
    db.select().from(comissaoVigencias).where(eq(comissaoVigencias.barbeariaId, barbeariaId)),
  ])
  const dadosDeVigencia: ComissaoVigencia[] = vigencias.map((vigencia) => ({
    barbeiroId: vigencia.barbeiroId,
    servicoId: vigencia.servicoId,
    percentualAvulsoBp: vigencia.percentualAvulsoBp,
    percentualAssinanteBp: vigencia.percentualAssinanteBp,
    inicio: vigencia.inicio,
    fim: vigencia.fim,
  }))
  return profissionais.flatMap((profissional) =>
    servicosAtivos.map((servico) => {
      const habilitacao = habilitacoesAtuais.find(
        (item) => item.barbeiroId === profissional.id && item.servicoId === servico.id,
      )
      const vigente = dadosDeVigencia
        .filter(
          (item) =>
            item.barbeiroId === profissional.id &&
            item.servicoId === servico.id &&
            item.inicio <= dataLocal &&
            (item.fim === null || item.fim >= dataLocal),
        )
        .sort((a, b) => b.inicio.localeCompare(a.inicio))[0]
      return {
        barbeiroId: profissional.id,
        barbeiroNome: profissional.nome,
        servicoId: servico.id,
        servicoNome: servico.nome,
        servicoTipo: servico.tipo,
        habilitado: habilitacao?.habilitado ?? false,
        percentualAvulsoBp: percentAt(
          dadosDeVigencia,
          profissional.id,
          servico.id,
          'avulso',
          dataLocal,
        ),
        percentualAssinanteBp: percentAt(
          dadosDeVigencia,
          profissional.id,
          servico.id,
          'assinante',
          dataLocal,
        ),
        inicioVigencia: vigente?.inicio ?? null,
      }
    }),
  )
}
