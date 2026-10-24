import type { Db } from "./db";
import { getBusinessHours } from "./settings";
import { hoursForDate } from "@/lib/agenda/slots";
import { todayDateKeySP } from "@/lib/agenda/timezone";

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Dia pedido na URL (`?dia=YYYY-MM-DD`) ou hoje em SP. */
export function resolveDateKey(raw: string | undefined): string {
  return raw && KEY_RE.test(raw) ? raw : todayDateKeySP();
}

/** Horário de funcionamento do dia para montar a grade da timeline. */
export async function dayBoundsFor(db: Db, dateKey: string) {
  const hours = hoursForDate(dateKey, await getBusinessHours(db));
  return {
    openTime: hours?.openTime ?? "09:00",
    closeTime: hours?.closeTime ?? "19:00",
    isClosed: hours?.isClosed ?? true,
  };
}
