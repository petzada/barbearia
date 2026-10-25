import type { Db } from "./db";
import { loadScheduleContext } from "./schedule-config";
import { todayDateKeySP } from "@/lib/agenda/timezone";

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Dia pedido na URL (`?dia=YYYY-MM-DD`) ou hoje em SP. */
export function resolveDateKey(raw: string | undefined): string {
  return raw && KEY_RE.test(raw) ? raw : todayDateKeySP();
}

export type DayBounds = {
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  /** Motivo quando é feriado/fechamento especial. */
  closedReason: string | null;
};

/** Expediente do dia (barbearia ∩ escala do barbeiro, feriados) para a timeline. */
export async function dayBoundsFor(db: Db, dateKey: string, barberId?: string): Promise<DayBounds> {
  const ctx = await loadScheduleContext(db, barberId ?? "", dateKey, dateKey);
  const hours = ctx.hoursFor(dateKey);
  const closure = ctx.closures.find((c) => c.dateKey === dateKey);
  return {
    openTime: hours?.openTime ?? "09:00",
    closeTime: hours?.closeTime ?? "19:00",
    isClosed: hours?.isClosed ?? true,
    closedReason: closure?.reason ?? null,
  };
}
