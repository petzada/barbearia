import { BARBER_TIMEZONE } from "./availability";

/**
 * Pendente = atendimento ainda marcado (status "booked"): os que não
 * começaram e os que já começaram/passaram mas não foram concluídos.
 */
export function isPendingAppointment(entry: { type: string; status: string }): boolean {
  return entry.type === "appointment" && entry.status === "booked";
}

/** Minutos desde 00:00 em São Paulo. */
export function minutesOfDaySP(value: number | string | Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BARBER_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/** Saudação pelo horário de Brasília. */
export function greetingSP(now: Date = new Date()): "Bom dia" | "Boa tarde" | "Boa noite" {
  const hour = Math.floor(minutesOfDaySP(now) / 60);
  return hour >= 5 && hour < 12 ? "Bom dia" : hour >= 12 && hour < 18 ? "Boa tarde" : "Boa noite";
}

/** "14:30" (24h). */
export function formatClock(minutes: number): string {
  const m = ((Math.floor(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
