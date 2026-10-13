// A biblioteca de fuso (Luxon) fica encapsulada neste arquivo: o resto do código só vê os tipos abaixo.
import { DateTime, IANAZone } from 'luxon'

declare const timeZoneBrand: unique symbol
declare const localDateBrand: unique symbol
declare const localTimeBrand: unique symbol

/** Fuso IANA validado (ex.: `America/Sao_Paulo`). D0080: vem da configuração da barbearia (`barbearias.fuso`). */
export type TimeZone = string & { readonly [timeZoneBrand]: true }
/** Data de calendário local `AAAA-MM-DD`, sem hora nem fuso. Datas locais são `date` no banco (PRD §6.1). */
export type LocalDate = string & { readonly [localDateBrand]: true }
/** Hora do relógio local `HH:mm`. */
export type LocalTime = string & { readonly [localTimeBrand]: true }

/** Intervalo semiaberto `[start, end)` (PRD RN05): o instante `end` já pertence ao próximo intervalo. */
export interface InstantRange {
  readonly start: Date
  readonly end: Date
}

const PADRAO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/
const PADRAO_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidTimeZone(value: string): boolean {
  return value.includes('/') ? IANAZone.isValidZone(value) : value === 'UTC'
}

export function parseTimeZone(value: string): TimeZone {
  if (!isValidTimeZone(value)) throw new RangeError(`Fuso horário inválido: "${value}".`)
  return value as TimeZone
}

export function parseLocalDate(value: string): LocalDate {
  const partes = PADRAO_DATA.exec(value)
  if (!partes) throw new RangeError(`Data local inválida: "${value}" (esperado AAAA-MM-DD).`)
  const [, ano, mes, dia] = partes
  const data = DateTime.fromObject({ year: Number(ano), month: Number(mes), day: Number(dia) })
  if (!data.isValid) throw new RangeError(`Data local inexistente: "${value}".`)
  return value as LocalDate
}

export function parseLocalTime(value: string): LocalTime {
  if (!PADRAO_HORA.test(value)) throw new RangeError(`Hora local inválida: "${value}" (HH:mm).`)
  return value as LocalTime
}

export function makeLocalDate(year: number, month: number, day: number): LocalDate {
  const data = DateTime.fromObject({ year, month, day })
  if (!data.isValid) throw new RangeError(`Data inexistente: ${year}-${month}-${day}.`)
  return data.toFormat('yyyy-MM-dd') as LocalDate
}

export interface LocalDateParts {
  readonly year: number
  readonly month: number
  readonly day: number
}

export function localDateParts(date: LocalDate): LocalDateParts {
  const [ano, mes, dia] = date.split('-').map(Number)
  return { year: ano ?? 0, month: mes ?? 0, day: dia ?? 0 }
}

export function daysInMonth(year: number, month: number): number {
  const dias = DateTime.fromObject({ year, month }).daysInMonth
  if (dias === undefined) throw new RangeError(`Mês inválido: ${year}-${month}.`)
  return dias
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const { year, month, day } = localDateParts(date)
  return DateTime.fromObject({ year, month, day })
    .plus({ days })
    .toFormat('yyyy-MM-dd') as LocalDate
}

/** Dia local de um instante no fuso informado. */
export function localDate(instant: Date, zone: TimeZone): LocalDate {
  return DateTime.fromJSDate(instant, { zone }).toFormat('yyyy-MM-dd') as LocalDate
}

/** Hora local (`HH:mm`) de um instante no fuso informado. */
export function localTime(instant: Date, zone: TimeZone): LocalTime {
  return DateTime.fromJSDate(instant, { zone }).toFormat('HH:mm') as LocalTime
}

/**
 * Instante UTC de uma data+hora do relógio local do fuso.
 * Horário inexistente (salto de horário de verão) avança pelo tamanho do salto; horário repetido
 * (volta do horário de verão) usa a primeira ocorrência. O Brasil não tem horário de verão desde 2019,
 * mas o código não assume isso (PRD §7.3).
 */
export function zonedInstant(date: LocalDate, time: LocalTime, zone: TimeZone): Date {
  const { year, month, day } = localDateParts(date)
  const [hora, minuto] = time.split(':').map(Number)
  const resultado = DateTime.fromObject(
    { year, month, day, hour: hora ?? 0, minute: minuto ?? 0 },
    { zone },
  )
  if (!resultado.isValid) throw new RangeError(`Data/hora inválida: ${date} ${time} em ${zone}.`)
  return resultado.toJSDate()
}

/** `[00:00 do dia, 00:00 do dia seguinte)` no fuso: a fronteira do dia local da barbearia. */
export function localDayRange(date: LocalDate, zone: TimeZone): InstantRange {
  const meiaNoite = parseLocalTime('00:00')
  return {
    start: zonedInstant(date, meiaNoite, zone),
    end: zonedInstant(addDays(date, 1), meiaNoite, zone),
  }
}

/** Pertinência em `[start, end)`: o instante exato do fim NÃO pertence ao intervalo. */
export function containsInstant(range: InstantRange, instant: Date): boolean {
  const t = instant.getTime()
  return t >= range.start.getTime() && t < range.end.getTime()
}
