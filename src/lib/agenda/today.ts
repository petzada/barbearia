import { BARBER_TIMEZONE } from "./availability";
import { parseTimeToMinutes } from "./timeline";

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

/**
 * Faixa de horas da linha do tempo (horas cheias): expediente ampliado para
 * caber atendimentos fora do horário e o "agora" quando ele cai no dia.
 */
export function timelineHourRange(input: {
  openTime: string;
  closeTime: string;
  items: { startMin: number; endMin: number }[];
  nowMin?: number | null;
}): { startHour: number; endHour: number } {
  let start = parseTimeToMinutes(input.openTime);
  let end = parseTimeToMinutes(input.closeTime);
  for (const i of input.items) {
    start = Math.min(start, i.startMin);
    end = Math.max(end, i.endMin);
  }
  if (input.nowMin != null && input.nowMin >= start - 60 && input.nowMin <= end + 60) {
    start = Math.min(start, input.nowMin);
    end = Math.max(end, input.nowMin);
  }
  const startHour = Math.max(0, Math.floor(start / 60));
  const endHour = Math.min(24, Math.max(startHour + 1, Math.ceil(end / 60)));
  return { startHour, endHour };
}
