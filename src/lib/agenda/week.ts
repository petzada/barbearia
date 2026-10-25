export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
export const WEEKDAY_LONG = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

type HoursRow = { weekday: number; openTime: string; closeTime: string; isClosed: boolean };

/**
 * Agrupa dias consecutivos com o mesmo horário, começando na segunda:
 * "Seg a Sex · 09:00–19:00", "Sáb · 09:00–13:00", "Dom · Fechado".
 */
export function summarizeWeek(rows: HoursRow[]): { label: string; hours: string }[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const byDay = new Map(rows.map((r) => [r.weekday, r]));
  const text = (r: HoursRow | undefined) =>
    !r || r.isClosed ? "Fechado" : `${r.openTime}–${r.closeTime}`;
  const groups: { days: number[]; hours: string }[] = [];
  for (const day of order) {
    const hours = text(byDay.get(day));
    const last = groups.at(-1);
    if (last && last.hours === hours) last.days.push(day);
    else groups.push({ days: [day], hours });
  }
  return groups.map((g) => ({
    label:
      g.days.length === 1
        ? WEEKDAY_SHORT[g.days[0]]
        : `${WEEKDAY_SHORT[g.days[0]]} a ${WEEKDAY_SHORT[g.days[g.days.length - 1]]}`,
    hours: g.hours,
  }));
}
