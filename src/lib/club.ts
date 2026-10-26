import { dateKeyFromIsoInSP } from "@/lib/agenda/availability";
import { weekdayFromDateKeySP } from "@/lib/agenda/timeline";
import { formatAllowedWeekdays } from "@/lib/plans";

/** Assinatura do cliente vista pelo wizard de agendamento (serializável). */
export type BookingClub = {
  planName: string;
  remaining: number;
  total: number;
  coveredServiceIds: string[];
  allowedWeekdays: number[];
  /** Fim do ciclo atual (epoch ms): horários a partir daqui não são cobertos. */
  periodEnd: number;
};

/** O plano cobre este serviço (em algum dia) e ainda há atendimentos no ciclo. */
export function clubCoversService(club: BookingClub | null | undefined, serviceId: string): boolean {
  return Boolean(club && club.remaining > 0 && club.coveredServiceIds.includes(serviceId));
}

/** Mesma regra do servidor (`evaluateCoverage`) para mostrar o preço certo antes de confirmar. */
export function clubCoversSlot(club: BookingClub | null | undefined, serviceId: string, slot: number): boolean {
  if (!clubCoversService(club, serviceId) || !club) return false;
  if (slot >= club.periodEnd) return false;
  if (club.allowedWeekdays.length === 0) return true;
  return club.allowedWeekdays.includes(weekdayFromDateKeySP(dateKeyFromIsoInSP(slot)));
}

/** "Seu plano cobre terças e quartas" — vazio quando vale qualquer dia. */
export function clubWeekdayHint(club: BookingClub | null | undefined): string | null {
  if (!club || club.allowedWeekdays.length === 0) return null;
  return `Seu plano cobre ${formatAllowedWeekdays(club.allowedWeekdays)}`;
}
