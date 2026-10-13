import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonthsAnchored,
  anchorDayOf,
  containsInstant,
  createManualClock,
  cycleRange,
  daysInMonth,
  localDate,
  localDayRange,
  localTime,
  parseLocalDate,
  parseLocalTime,
  parseTimeZone,
  zonedInstant,
} from '~/platform/time'

const SP = parseTimeZone('America/Sao_Paulo')
const NY = parseTimeZone('America/New_York')
const data = parseLocalDate

// D0080: renovação no mesmo dia do mês; dia inexistente vai para o último dia; o dia original volta.
describe('addMonthsAnchored', () => {
  it('31/01 → 28/02 (2027) → 31/03', () => {
    const fev = addMonthsAnchored(data('2027-01-31'), 1, 31)
    expect(fev).toBe('2027-02-28')
    expect(addMonthsAnchored(fev, 1, 31)).toBe('2027-03-31')
  })

  it('29/02/2028 → 29/03 e a âncora 29 em fevereiro de ano não bissexto cai no dia 28', () => {
    expect(addMonthsAnchored(data('2028-02-29'), 1, 29)).toBe('2028-03-29')
    expect(addMonthsAnchored(data('2027-01-29'), 1, 29)).toBe('2027-02-28')
  })

  it('âncora 30: fevereiro bissexto (29) e não bissexto (28); volta ao 30 em março', () => {
    expect(addMonthsAnchored(data('2028-01-30'), 1, 30)).toBe('2028-02-29')
    expect(addMonthsAnchored(data('2027-01-30'), 1, 30)).toBe('2027-02-28')
    expect(addMonthsAnchored(data('2027-02-28'), 1, 30)).toBe('2027-03-30')
  })

  it('âncora 31 em meses de 30 dias usa o dia 30 e volta ao 31', () => {
    expect(addMonthsAnchored(data('2027-03-31'), 1, 31)).toBe('2027-04-30')
    expect(addMonthsAnchored(data('2027-04-30'), 1, 31)).toBe('2027-05-31')
  })

  it('virada de ano, vários meses e meses negativos', () => {
    expect(addMonthsAnchored(data('2027-12-15'), 1, 15)).toBe('2028-01-15')
    expect(addMonthsAnchored(data('2027-01-31'), 13, 31)).toBe('2028-02-29')
    expect(addMonthsAnchored(data('2027-03-31'), -1, 31)).toBe('2027-02-28')
    expect(addMonthsAnchored(data('2027-01-31'), -2, 31)).toBe('2026-11-30')
    expect(addMonthsAnchored(data('2027-05-10'), 0, 10)).toBe('2027-05-10')
  })

  it('nunca é "30 dias": 12 renovações de 31/01 voltam ao dia 31 nos meses que o têm', () => {
    let atual = data('2027-01-31')
    const dias: string[] = []
    for (let i = 0; i < 12; i += 1) {
      atual = addMonthsAnchored(atual, 1, 31)
      dias.push(atual)
    }
    expect(dias).toEqual([
      '2027-02-28',
      '2027-03-31',
      '2027-04-30',
      '2027-05-31',
      '2027-06-30',
      '2027-07-31',
      '2027-08-31',
      '2027-09-30',
      '2027-10-31',
      '2027-11-30',
      '2027-12-31',
      '2028-01-31',
    ])
  })

  it('recusa âncora e meses inválidos', () => {
    expect(() => addMonthsAnchored(data('2027-01-31'), 1, 0)).toThrow(RangeError)
    expect(() => addMonthsAnchored(data('2027-01-31'), 1, 32)).toThrow(RangeError)
    expect(() => addMonthsAnchored(data('2027-01-31'), 1, 15.5)).toThrow(RangeError)
    expect(() => addMonthsAnchored(data('2027-01-31'), 0.5, 15)).toThrow(RangeError)
  })
})

describe('datas locais e fuso (America/Sao_Paulo)', () => {
  it('valida datas e horas', () => {
    expect(() => parseLocalDate('2027-02-29')).toThrow(RangeError)
    expect(() => parseLocalDate('2027-13-01')).toThrow(RangeError)
    expect(() => parseLocalDate('27-01-01')).toThrow(RangeError)
    expect(() => parseLocalTime('24:00')).toThrow(RangeError)
    expect(() => parseTimeZone('Marte/Olimpo')).toThrow(RangeError)
    expect(parseLocalDate('2028-02-29')).toBe('2028-02-29')
  })

  it('converte instante UTC para o dia local (UTC−3) e de volta', () => {
    const instante = new Date('2027-03-01T02:30:00Z') // ainda 28/02 em São Paulo
    expect(localDate(instante, SP)).toBe('2027-02-28')
    expect(localTime(instante, SP)).toBe('23:30')
    expect(zonedInstant(data('2027-02-28'), parseLocalTime('23:30'), SP).toISOString()).toBe(
      '2027-03-01T02:30:00.000Z',
    )
  })

  it('o dia local começa às 03:00Z e termina às 03:00Z do dia seguinte', () => {
    const dia = localDayRange(data('2027-02-28'), SP)
    expect(dia.start.toISOString()).toBe('2027-02-28T03:00:00.000Z')
    expect(dia.end.toISOString()).toBe('2027-03-01T03:00:00.000Z')
  })

  it('addDays e daysInMonth respeitam o calendário', () => {
    expect(addDays(data('2027-02-28'), 1)).toBe('2027-03-01')
    expect(addDays(data('2028-02-28'), 1)).toBe('2028-02-29')
    expect(daysInMonth(2028, 2)).toBe(29)
    expect(daysInMonth(2027, 2)).toBe(28)
    expect(daysInMonth(2027, 4)).toBe(30)
  })
})

// RN05: ciclo = [início, fim); instantes em UTC, calendário e prazos no fuso da loja.
describe('cycleRange', () => {
  it('ciclo de 31/01 15:00 em São Paulo termina em 28/02 15:00 local e o seguinte em 31/03', () => {
    const inicio = zonedInstant(data('2027-01-31'), parseLocalTime('15:00'), SP)
    const primeiro = cycleRange(inicio, anchorDayOf(data('2027-01-31')), SP)
    expect(primeiro.start).toBe(inicio)
    expect(localDate(primeiro.end, SP)).toBe('2027-02-28')
    expect(localTime(primeiro.end, SP)).toBe('15:00')
    const segundo = cycleRange(primeiro.end, 31, SP)
    expect(localDate(segundo.end, SP)).toBe('2027-03-31')
    expect(segundo.end.toISOString()).toBe('2027-03-31T18:00:00.000Z')
  })

  it('fronteira [início, fim): o instante exato do fim já é do próximo ciclo', () => {
    const inicio = new Date('2027-01-31T18:00:00Z')
    const ciclo = cycleRange(inicio, 31, SP)
    expect(containsInstant(ciclo, inicio)).toBe(true)
    expect(containsInstant(ciclo, new Date(ciclo.end.getTime() - 1))).toBe(true)
    expect(containsInstant(ciclo, ciclo.end)).toBe(false)
    expect(containsInstant(cycleRange(ciclo.end, 31, SP), ciclo.end)).toBe(true)
    expect(containsInstant(ciclo, new Date(inicio.getTime() - 1))).toBe(false)
  })

  it('o dia local, e não o dia UTC, define o fim (23:30 em SP já é dia seguinte em UTC)', () => {
    const inicio = zonedInstant(data('2027-01-30'), parseLocalTime('23:30'), SP) // 31/01 02:30Z
    const ciclo = cycleRange(inicio, 30, SP)
    expect(localDate(ciclo.end, SP)).toBe('2027-02-28')
    expect(localTime(ciclo.end, SP)).toBe('23:30')
  })

  it('pagamento com atraso: novo ciclo começa no instante de aprovação, com a nova âncora', () => {
    const aprovacao = new Date('2027-03-17T13:45:10Z')
    const ciclo = cycleRange(aprovacao, anchorDayOf(localDate(aprovacao, SP)), SP)
    expect(localDate(ciclo.end, SP)).toBe('2027-04-17')
    expect(localTime(ciclo.end, SP)).toBe('10:45')
  })
})

// PRD §7.3: o Brasil não tem horário de verão hoje, mas o código não assume isso.
describe('trocas de horário de verão', () => {
  it('horário inexistente (salto) avança pelo tamanho do salto: Nova York 14/03/2027 02:30 → 03:30 EDT', () => {
    const instante = zonedInstant(data('2027-03-14'), parseLocalTime('02:30'), NY)
    expect(instante.toISOString()).toBe('2027-03-14T07:30:00.000Z')
    expect(localTime(instante, NY)).toBe('03:30')
  })

  it('horário repetido (volta) usa a primeira ocorrência: Nova York 07/11/2027 01:30 → EDT', () => {
    const instante = zonedInstant(data('2027-11-07'), parseLocalTime('01:30'), NY)
    expect(instante.toISOString()).toBe('2027-11-07T05:30:00.000Z')
  })

  it('o dia local tem 23 ou 25 horas nas trocas', () => {
    const curto = localDayRange(data('2027-03-14'), NY)
    expect((curto.end.getTime() - curto.start.getTime()) / 3_600_000).toBe(23)
    const longo = localDayRange(data('2027-11-07'), NY)
    expect((longo.end.getTime() - longo.start.getTime()) / 3_600_000).toBe(25)
  })

  it('São Paulo antes de 2019 tinha salto à meia-noite: 04/11/2018 00:00 não existe e vira 01:00', () => {
    const instante = zonedInstant(data('2018-11-04'), parseLocalTime('00:00'), SP)
    expect(localTime(instante, SP)).toBe('01:00')
    expect(instante.toISOString()).toBe('2018-11-04T03:00:00.000Z')
  })

  it('ciclo que atravessa a troca mantém o horário de relógio local', () => {
    const inicio = zonedInstant(data('2027-02-14'), parseLocalTime('10:00'), NY) // EST
    const ciclo = cycleRange(inicio, 14, NY) // 14/03: já em EDT
    expect(localDate(ciclo.end, NY)).toBe('2027-03-14')
    expect(localTime(ciclo.end, NY)).toBe('10:00')
    expect(ciclo.end.toISOString()).toBe('2027-03-14T14:00:00.000Z')
  })
})

describe('relógio controlável', () => {
  it('avança e define o instante sem depender do relógio do sistema', () => {
    const relogio = createManualClock('2027-01-31T15:00:00Z')
    expect(relogio.now().toISOString()).toBe('2027-01-31T15:00:00.000Z')
    relogio.advance(3_600_000)
    expect(relogio.now().toISOString()).toBe('2027-01-31T16:00:00.000Z')
    relogio.set('2028-02-29T00:00:00Z')
    expect(relogio.now().toISOString()).toBe('2028-02-29T00:00:00.000Z')
  })

  it('devolve cópia: alterar o Date devolvido não muda o relógio', () => {
    const relogio = createManualClock('2027-01-31T15:00:00Z')
    relogio.now().setFullYear(1999)
    expect(relogio.now().getUTCFullYear()).toBe(2027)
  })

  it('recusa instante inicial inválido', () => {
    expect(() => createManualClock('não é data')).toThrow(RangeError)
  })
})
