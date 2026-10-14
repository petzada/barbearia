import { describe, expect, it } from 'vitest'
import {
  expandCombo,
  findEquivalentCombo,
  isEnabledForAll,
  percentAt,
  validBasisPoints,
  validPriceAndDuration,
  type ComboCatalogo,
  type ComissaoVigencia,
  type Habilitacao,
} from '../../src/modules/catalog'

const combo: ComboCatalogo = { id: 'combo', componentes: ['barba', 'corte'], ativo: true }

describe('regras puras do catálogo', () => {
  it('encontra só o combo cujo conjunto é idêntico, mesmo com outra ordem', () => {
    expect(findEquivalentCombo(['corte', 'barba'], [combo])).toEqual(combo)
    expect(findEquivalentCombo(['corte'], [combo])).toBeNull()
    expect(findEquivalentCombo(['corte', 'barba', 'sobrancelha'], [combo])).toBeNull()
    expect(findEquivalentCombo(['corte', 'barba'], [{ ...combo, ativo: false }])).toBeNull()
  })

  it('expande combo para ele próprio e todos os componentes', () => {
    expect(expandCombo(['combo'], [combo])).toEqual(['combo', 'barba', 'corte'])
    expect(expandCombo(['corte'], [combo])).toEqual(['corte'])
  })

  it('exige habilitação para o combo e todos os componentes', () => {
    const soCombo: Habilitacao[] = [{ barbeiroId: 'b1', servicoId: 'combo', habilitado: true }]
    const selecao = expandCombo(['combo'], [combo])
    expect(isEnabledForAll(soCombo, 'b1', selecao)).toBe(false)
    expect(
      isEnabledForAll(
        [
          ...soCombo,
          { barbeiroId: 'b1', servicoId: 'barba', habilitado: true },
          { barbeiroId: 'b1', servicoId: 'corte', habilitado: true },
        ],
        'b1',
        selecao,
      ),
    ).toBe(true)
    expect(isEnabledForAll(soCombo, 'b1', [])).toBe(false)
  })

  it('seleciona o percentual da vigência que inclui a data local', () => {
    const vigencias: ComissaoVigencia[] = [
      {
        barbeiroId: 'b1',
        servicoId: 's1',
        percentualAvulsoBp: 3500,
        percentualAssinanteBp: 2500,
        inicio: '2027-10-01',
        fim: '2027-10-14',
      },
      {
        barbeiroId: 'b1',
        servicoId: 's1',
        percentualAvulsoBp: 4000,
        percentualAssinanteBp: 3000,
        inicio: '2027-10-15',
        fim: null,
      },
    ]
    expect(percentAt(vigencias, 'b1', 's1', 'avulso', '2027-10-14')).toBe(3500)
    expect(percentAt(vigencias, 'b1', 's1', 'assinante', '2027-10-14')).toBe(2500)
    expect(percentAt(vigencias, 'b1', 's1', 'avulso', '2027-10-15')).toBe(4000)
    expect(percentAt(vigencias, 'b2', 's1', 'avulso', '2027-10-15')).toBeNull()
  })

  it('valida preço, duração e pontos-base sem valores comerciais padrão', () => {
    expect(validPriceAndDuration(6500, 30)).toBe(true)
    expect(validPriceAndDuration(0, 30)).toBe(false)
    expect(validPriceAndDuration(6500, 0)).toBe(false)
    expect(validBasisPoints(10_000)).toBe(true)
    expect(validBasisPoints(10_001)).toBe(false)
  })
})
