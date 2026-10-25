import { BARBER_TIMEZONE, dateKeyFromIsoInSP, formatSlotTime } from "./availability";

/**
 * Formatadores únicos de data/hora para a interface (fuso America/Sao_Paulo).
 * Aceitam um dia ("YYYY-MM-DD") ou um instante (Date, epoch ms ou ISO) e já
 * devolvem o texto capitalizado — nada de `split`/`capitalize` nas telas.
 */
export type DayInput = string | number | Date;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const toDateKey = (value: DayInput) =>
  typeof value === "string" && DATE_KEY.test(value) ? value : dateKeyFromIsoInSP(value);

const noonUtc = (dateKey: string) => {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
};

export const capitalize = (text: string) => (text ? text[0].toLocaleUpperCase("pt-BR") + text.slice(1) : text);

/** "Seg", "Ter", … */
export function formatWeekdayShort(value: DayInput): string {
  const weekday = new Intl.DateTimeFormat("pt-BR", { timeZone: BARBER_TIMEZONE, weekday: "short" })
    .format(noonUtc(toDateKey(value)))
    .replace(".", "");
  return capitalize(weekday);
}

/** "Segunda", "Terça", … */
export function formatWeekdayLong(value: DayInput): string {
  const weekday = new Intl.DateTimeFormat("pt-BR", { timeZone: BARBER_TIMEZONE, weekday: "long" })
    .format(noonUtc(toDateKey(value)))
    .replace("-feira", "");
  return capitalize(weekday);
}

/** "02/11" */
export function formatDayMonth(value: DayInput): string {
  const [, m, d] = toDateKey(value).split("-");
  return `${d}/${m}`;
}

/** "Seg, 02/11" */
export function formatDayLabel(value: DayInput): string {
  return `${formatWeekdayShort(value)}, ${formatDayMonth(value)}`;
}

/** "Segunda, 2 de novembro" */
export function formatDayLong(value: DayInput): string {
  const key = toDateKey(value);
  const dayMonth = new Intl.DateTimeFormat("pt-BR", { timeZone: BARBER_TIMEZONE, day: "numeric", month: "long" }).format(
    noonUtc(key),
  );
  return `${formatWeekdayLong(key)}, ${dayMonth}`;
}

/** "Novembro de 2026" */
export function formatMonthYear(year: number, month: number): string {
  return capitalize(
    new Intl.DateTimeFormat("pt-BR", { timeZone: BARBER_TIMEZONE, month: "long", year: "numeric" }).format(
      new Date(Date.UTC(year, month - 1, 1, 12)),
    ),
  );
}

/** "09:00 – 10:00" (sempre com espaços em volta do traço). */
export function formatTimeRange(start: DayInput, end: DayInput): string {
  return `${formatSlotTime(start)} – ${formatSlotTime(end)}`;
}

/** "02/11 – 08/11" (ou só "02/11" quando é o mesmo dia). */
export function formatDateRange(from: DayInput, to: DayInput): string {
  const a = formatDayMonth(from);
  const b = formatDayMonth(to);
  return a === b ? a : `${a} – ${b}`;
}

/** Faixa de horário de expediente ("09:00 – 19:00") a partir de "HH:MM". */
export function formatHoursRange(open: string, close: string): string {
  return `${open.slice(0, 5)} – ${close.slice(0, 5)}`;
}
