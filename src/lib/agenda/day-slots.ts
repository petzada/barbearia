import { formatMinutesAsTime, minutesFromIsoInSP, parseTimeToMinutes } from "./timeline";

export type DayRow<T> =
  | { kind: "entry"; time: string; entry: T }
  | { kind: "free"; time: string; startMin: number };

/**
 * Linhas da tela "Hoje": atendimentos/bloqueios na ordem do horário e, entre
 * eles, cada passo da grade que está totalmente livre ("— livre —").
 * Itens fora do expediente também aparecem, na posição do horário.
 */
export function buildDayRows<T extends { starts_at: string; ends_at: string }>(input: {
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  stepMinutes: number;
  entries: T[];
}): DayRow<T>[] {
  const step = Math.max(5, input.stepMinutes);
  const spans = input.entries.map((entry) => ({
    entry,
    start: minutesFromIsoInSP(entry.starts_at),
    end: minutesFromIsoInSP(entry.ends_at),
  }));
  const rows: (DayRow<T> & { at: number })[] = spans.map((s) => ({
    kind: "entry" as const,
    time: formatMinutesAsTime(s.start),
    entry: s.entry,
    at: s.start,
  }));
  if (!input.isClosed) {
    const close = parseTimeToMinutes(input.closeTime);
    for (let t = parseTimeToMinutes(input.openTime); t + step <= close; t += step) {
      const busy = spans.some((s) => s.start < t + step && s.end > t);
      if (!busy) rows.push({ kind: "free", time: formatMinutesAsTime(t), startMin: t, at: t });
    }
  }
  return rows
    .sort((a, b) => a.at - b.at || (a.kind === "entry" ? -1 : 1))
    .map(({ at: _at, ...row }) => row as DayRow<T>);
}
