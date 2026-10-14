export type TipoServico = 'simples' | 'combo'
export type TipoComissao = 'avulso' | 'assinante'

export interface ServicoCatalogo {
  readonly id: string
  readonly nome: string
  readonly descricao: string | null
  readonly precoCentavos: number
  readonly duracaoMinutos: number
  readonly tipo: TipoServico
  readonly ativo: boolean
  readonly fotoUrl?: string | null
}

export interface ComboCatalogo {
  readonly id: string
  readonly componentes: readonly string[]
  readonly ativo: boolean
}

export interface Habilitacao {
  readonly barbeiroId: string
  readonly servicoId: string
  readonly habilitado: boolean
}

export interface ComissaoVigencia {
  readonly barbeiroId: string
  readonly servicoId: string
  readonly percentualAvulsoBp: number
  readonly percentualAssinanteBp: number
  readonly inicio: string
  readonly fim: string | null
}

export function canonicalServiceSet(ids: readonly string[]): string {
  return [...new Set(ids)].sort().join(',')
}

export function getService(
  servicos: readonly ServicoCatalogo[],
  servicoId: string,
): ServicoCatalogo | undefined {
  return servicos.find((servico) => servico.id === servicoId)
}

export function getServices(servicos: readonly ServicoCatalogo[]): readonly ServicoCatalogo[] {
  return servicos
}

/** Encontra apenas um combo ativo cuja lista de componentes seja exatamente a seleção. */
export function findEquivalentCombo(
  selecaoDeServicos: readonly string[],
  combos: readonly ComboCatalogo[],
): ComboCatalogo | null {
  if (selecaoDeServicos.length === 0) return null
  const assinatura = canonicalServiceSet(selecaoDeServicos)
  return (
    combos.find((combo) => combo.ativo && canonicalServiceSet(combo.componentes) === assinatura) ??
    null
  )
}

/** Expande um combo uma única vez e mantém o próprio combo para validar a matriz inteira. */
export function expandCombo(
  selecaoDeServicos: readonly string[],
  combos: readonly ComboCatalogo[],
): readonly string[] {
  const expandidos = new Set(selecaoDeServicos)
  for (const combo of combos) {
    if (combo.ativo && expandidos.has(combo.id)) {
      for (const componente of combo.componentes) expandidos.add(componente)
    }
  }
  return [...expandidos]
}

/** Vazio não representa visita válida; cada serviço da seleção precisa de uma linha habilitada. */
export function isEnabledForAll(
  habilitacoes: readonly Habilitacao[],
  barbeiroId: string,
  servicosExpandidos: readonly string[],
): boolean {
  if (servicosExpandidos.length === 0) return false
  const habilitados = new Set(
    habilitacoes
      .filter((item) => item.barbeiroId === barbeiroId && item.habilitado)
      .map((item) => item.servicoId),
  )
  return servicosExpandidos.every((servicoId) => habilitados.has(servicoId))
}

/** Retorna o percentual da única vigência que cobre a data local ou null quando não há cadastro. */
export function percentAt(
  vigencias: readonly ComissaoVigencia[],
  barbeiroId: string,
  servicoId: string,
  tipo: TipoComissao,
  dataLocal: string,
): number | null {
  const vigente = vigencias
    .filter(
      (item) =>
        item.barbeiroId === barbeiroId &&
        item.servicoId === servicoId &&
        item.inicio <= dataLocal &&
        (item.fim === null || item.fim >= dataLocal),
    )
    .sort((a, b) => b.inicio.localeCompare(a.inicio))[0]
  if (!vigente) return null
  return tipo === 'avulso' ? vigente.percentualAvulsoBp : vigente.percentualAssinanteBp
}

export function validPriceAndDuration(precoCentavos: number, duracaoMinutos: number): boolean {
  return (
    Number.isSafeInteger(precoCentavos) &&
    precoCentavos > 0 &&
    Number.isInteger(duracaoMinutos) &&
    duracaoMinutos > 0
  )
}

export function validBasisPoints(percentualBp: number): boolean {
  return Number.isInteger(percentualBp) && percentualBp >= 0 && percentualBp <= 10_000
}
