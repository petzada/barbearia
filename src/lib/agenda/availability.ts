export const BARBER_TIMEZONE = "America/Sao_Paulo";

/** Padrões das regras de agendamento (o admin ajusta em Configurações). */
export const DEFAULT_BOOKING_WINDOW_DAYS = 30;
export const DEFAULT_CANCEL_UNTIL_MINUTES = 120;

function addDaysToDateKey(baseKey: string, days: number): string {
  const [y, m, d] = baseKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Limites do mês civil atual em SP (para calendário popup). */
export function getCurrentMonthDateBoundsInSP(now: Date = new Date()): {
  start: string;
  end: string;
  year: number;
  month: number;
} {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: BARBER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month] = today.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
    year,
    month,
  };
}

/** Ano civil atual em SP (ano vigente do calendário). */
export function getCalendarYearInSP(now: Date = new Date()): number {
  return getInitialCalendarViewInSP(now).year;
}

/** Mês/ano iniciais do calendário (mês atual em SP). */
export function getInitialCalendarViewInSP(now: Date = new Date()): {
  year: number;
  month: number;
} {
  const { year, month } = getCurrentMonthDateBoundsInSP(now);
  return { year, month };
}

/** Chips rápidos: âncora + até 4 dias seguintes na janela de agendamento. */
export function getQuickDayKeys(
  anchor: string | null,
  windowDays: number = DEFAULT_BOOKING_WINDOW_DAYS,
  now: Date = new Date(),
): string[] {
  const all = getSelectableDateKeys(windowDays, now);
  if (!anchor) return all.slice(0, 5);
  const idx = all.indexOf(anchor);
  if (idx === -1) return all.slice(0, 5);
  return all.slice(idx, idx + 5);
}

/** Chaves YYYY-MM-DD selecionáveis (hoje em SP até a janela configurada). */
export function getSelectableDateKeys(
  windowDays: number = DEFAULT_BOOKING_WINDOW_DAYS,
  now: Date = new Date(),
): string[] {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BARBER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = formatter.format(now);
  return Array.from({ length: Math.max(1, windowDays) }, (_, i) =>
    addDaysToDateKey(today, i),
  );
}

/** Formata timestamptz de início de slot para exibição (ex.: "09:00"). */
export function formatSlotTime(
  iso: string | number | Date,
  locale = "pt-BR",
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: BARBER_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Formata dia (YYYY-MM-DD) para o seletor (ex.: "qui., 22/05"). */
export function formatSelectableDay(dateKey: string, locale = "pt-BR"): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat(locale, {
    timeZone: BARBER_TIMEZONE,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(utc);
}

/** Cliente pode cancelar pelo app se falta mais que o prazo configurado. */
export function canClientCancel(
  startsAt: string | number | Date,
  cancelUntilMinutes: number = DEFAULT_CANCEL_UNTIL_MINUTES,
  now: Date = new Date(),
): boolean {
  const startsAtMs = new Date(startsAt).getTime();
  return startsAtMs > now.getTime() + cancelUntilMinutes * 60 * 1000;
}

/** "2h", "30 min", "1h30" — usado nas mensagens de prazo. */
export function formatMinutesShort(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** Dia civil (YYYY-MM-DD) de um instante no fuso da barbearia. */
export function dateKeyFromIsoInSP(iso: string | number | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BARBER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** Dia está dentro da janela de agendamento (hoje … +N dias em SP). */
export function isDateInBookingWindow(
  dateKey: string,
  windowDays: number = DEFAULT_BOOKING_WINDOW_DAYS,
  now: Date = new Date(),
): boolean {
  return getSelectableDateKeys(windowDays, now).includes(dateKey);
}

/** Dois instantes representam o mesmo horário de início (comparação em ms). */
export function sameInstant(a: string, b: string): boolean {
  return new Date(a).getTime() === new Date(b).getTime();
}

/** Preço em centavos → "R$ 45,00". */
export function formatPriceCents(cents: number, locale = "pt-BR"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
