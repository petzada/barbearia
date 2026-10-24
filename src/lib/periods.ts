import { todayDateKeySP } from "@/lib/agenda/timezone";

export type PeriodKey = "hoje" | "7d" | "mes" | "mes-anterior" | "30d";

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "mes", label: "Este mês" },
  { key: "mes-anterior", label: "Mês passado" },
];

const addDays = (key: string, days: number) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

/** Período (datas SP inclusivas) a partir do filtro da URL. */
export function resolvePeriod(raw: string | undefined, now: Date = new Date()): { key: PeriodKey; from: string; to: string } {
  const today = todayDateKeySP(now);
  const [y, m] = today.split("-").map(Number);
  const key = (PERIOD_OPTIONS.some((p) => p.key === raw) || raw === "30d" ? raw : "mes") as PeriodKey;
  switch (key) {
    case "hoje":
      return { key, from: today, to: today };
    case "7d":
      return { key, from: addDays(today, -6), to: today };
    case "30d":
      return { key, from: addDays(today, -29), to: today };
    case "mes-anterior": {
      const first = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
      const last = new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10);
      return { key, from: first, to: last };
    }
    default:
      return { key: "mes", from: `${today.slice(0, 7)}-01`, to: today };
  }
}
