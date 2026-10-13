import {
  daysInMonth,
  localDate,
  localDateParts,
  localTime,
  makeLocalDate,
  zonedInstant,
  type InstantRange,
  type LocalDate,
  type TimeZone,
} from './zone'

function assertAnchorDay(anchorDay: number): void {
  if (!Number.isInteger(anchorDay) || anchorDay < 1 || anchorDay > 31) {
    throw new RangeError(`Dia-âncora inválido: ${anchorDay} (1 a 31).`)
  }
}

/** Dia-âncora de um ciclo que começa em `date` (D0052: a âncora é o dia do início do ciclo). */
export function anchorDayOf(date: LocalDate): number {
  return localDateParts(date).day
}

/**
 * D0080: soma `months` meses de calendário à data e fixa o dia na âncora; se o dia não existir no
 * mês, usa o último dia dele. O dia original volta quando existe: 31/01 → 28/02 → 31/03.
 * Nunca soma 30 dias. `date` só informa o mês de partida; o dia vem da âncora.
 */
export function addMonthsAnchored(date: LocalDate, months: number, anchorDay: number): LocalDate {
  assertAnchorDay(anchorDay)
  if (!Number.isInteger(months)) throw new RangeError(`Quantidade de meses inválida: ${months}.`)
  const { year, month } = localDateParts(date)
  const indice = year * 12 + (month - 1) + months
  const anoAlvo = Math.floor(indice / 12)
  const mesAlvo = (((indice % 12) + 12) % 12) + 1
  return makeLocalDate(anoAlvo, mesAlvo, Math.min(anchorDay, daysInMonth(anoAlvo, mesAlvo)))
}

/**
 * Ciclo mensal `[início, fim)` (RN05, D0080). O ciclo pode começar em qualquer instante (pagamento
 * com atraso começa no instante de aprovação); o fim é o mesmo horário de relógio da barbearia no
 * mês seguinte, ancorado em `anchorDay`. Renovação em dia: o próximo ciclo começa em `end` e reusa a âncora.
 */
export function cycleRange(start: Date, anchorDay: number, zone: TimeZone): InstantRange {
  const diaInicial = localDate(start, zone)
  const horaInicial = localTime(start, zone)
  const diaFinal = addMonthsAnchored(diaInicial, 1, anchorDay)
  return { start, end: zonedInstant(diaFinal, horaInicial, zone) }
}
