import { parseTimeToMinutes, weekdayFromDateKeySP } from "./timeline";
import { spLocalDateTimeToIso } from "./timezone";

export type BusyRange = { startsAt: number; endsAt: number };

export type DayHours = {
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

export type SlotRules = {
  /** Passo da grade de horários (min). */
  slotIntervalMinutes: number;
  /** Antecedência mínima para agendar (min). */
  minLeadMinutes: number;
};

/**
 * Horários de início livres (epoch ms) para um serviço em um dia (SP).
 * Mesma semântica do antigo `get_available_slots` (Postgres): o serviço
 * precisa caber inteiro antes do fechamento, respeitar a antecedência mínima
 * e não cruzar nenhum agendamento/bloqueio ativo do barbeiro.
 */
export function computeAvailableSlots(input: {
  dateKey: string;
  hours: DayHours | null;
  durationMinutes: number;
  rules: SlotRules;
  busy: BusyRange[];
  now: number;
}): number[] {
  const { dateKey, hours, durationMinutes, rules, busy, now } = input;
  if (!hours || hours.isClosed || durationMinutes <= 0) return [];

  const step = Math.max(5, rules.slotIntervalMinutes);
  const openMin = parseTimeToMinutes(hours.openTime);
  const closeMin = parseTimeToMinutes(hours.closeTime);
  if (!(closeMin > openMin)) return [];

  const dayOpen = Date.parse(spLocalDateTimeToIso(dateKey, hours.openTime));
  const minStart = now + rules.minLeadMinutes * 60_000;
  const durationMs = durationMinutes * 60_000;
  const closeTs = dayOpen + (closeMin - openMin) * 60_000;

  const slots: number[] = [];
  for (let cursor = dayOpen; cursor + durationMs <= closeTs; cursor += step * 60_000) {
    if (cursor < minStart) continue;
    const end = cursor + durationMs;
    const overlaps = busy.some((b) => b.startsAt < end && b.endsAt > cursor);
    if (!overlaps) slots.push(cursor);
  }
  return slots;
}

export function hoursForDate(
  dateKey: string,
  week: { weekday: number; openTime: string; closeTime: string; isClosed: boolean }[],
): DayHours | null {
  const weekday = weekdayFromDateKeySP(dateKey);
  const row = week.find((h) => h.weekday === weekday);
  return row
    ? { openTime: row.openTime, closeTime: row.closeTime, isClosed: row.isClosed }
    : null;
}

export type BarberDayRow = {
  weekday: number;
  startTime: string;
  endTime: string;
  isOff: boolean;
};

/**
 * Expediente efetivo de um barbeiro num dia: interseção do horário da
 * barbearia com a escala dele, e fechado em feriados/fechamentos especiais.
 * Sem linha de escala para o dia = segue a barbearia.
 */
export function effectiveDayHours(input: {
  dateKey: string;
  shopWeek: { weekday: number; openTime: string; closeTime: string; isClosed: boolean }[];
  barberWeek?: BarberDayRow[];
  closedDates?: ReadonlySet<string>;
}): DayHours | null {
  const shop = hoursForDate(input.dateKey, input.shopWeek);
  if (!shop) return null;
  if (input.closedDates?.has(input.dateKey)) return { ...shop, isClosed: true };
  if (shop.isClosed) return shop;
  const weekday = weekdayFromDateKeySP(input.dateKey);
  const own = input.barberWeek?.find((r) => r.weekday === weekday);
  if (!own) return shop;
  if (own.isOff) return { ...shop, isClosed: true };
  const openTime = own.startTime > shop.openTime ? own.startTime : shop.openTime;
  const closeTime = own.endTime < shop.closeTime ? own.endTime : shop.closeTime;
  return closeTime > openTime
    ? { openTime, closeTime, isClosed: false }
    : { openTime: shop.openTime, closeTime: shop.closeTime, isClosed: true };
}
