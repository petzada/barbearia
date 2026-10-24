import { BARBER_TIMEZONE } from "./availability";

function addDaysToDateKey(baseKey: string, days: number): string {
  const [y, m, d] = baseKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/**
 * Converte data/hora locais (America/Sao_Paulo) para ISO UTC.
 * Offset derivado via Intl no instante pedido — alinhado ao SQL
 * `AT TIME ZONE 'America/Sao_Paulo'` enquanto o Brasil não adota horário de verão.
 */
function zonedLocalToUtcIso(dateKey: string, time: string): string {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  const probe = new Date(`${dateKey}T${normalizedTime}Z`);
  const inTz = new Date(
    probe.toLocaleString("en-US", { timeZone: BARBER_TIMEZONE }),
  );
  const inUtc = new Date(probe.toLocaleString("en-US", { timeZone: "UTC" }));
  const offsetMs = inUtc.getTime() - inTz.getTime();
  return new Date(probe.getTime() + offsetMs).toISOString();
}

/** Limites [início, fim) do dia civil em America/Sao_Paulo como ISO UTC. */
export function spDayBounds(dateKey: string): { start: string; end: string } {
  return {
    start: zonedLocalToUtcIso(dateKey, "00:00:00"),
    end: zonedLocalToUtcIso(addDaysToDateKey(dateKey, 1), "00:00:00"),
  };
}

export function todayDateKeySP(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BARBER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Converte data + hora locais (SP) para ISO timestamptz. */
export function spLocalDateTimeToIso(dateKey: string, time: string): string {
  return zonedLocalToUtcIso(dateKey, time);
}
