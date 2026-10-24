import { BARBER_TIMEZONE } from "./availability";

export const SLOT_HEIGHT_PX = 85;
export const MIN_CARD_HEIGHT_PX = 85;
export const SLOT_STEP_MINUTES = 30;

export type TimelineRow = {
  startMin: number;
  endMin: number;
  heightPx: number;
  label: string;
  /** Oculta rótulo :30 no meio de um bloco de 60 min (ex. sem "13:30" entre 14h e 15h). */
  hideLabel?: boolean;
};

export type TimelineLabel = {
  topPx: number;
  text: string;
  /** start = alinha ao topo da linha; end = alinha à linha de fim do bloco de 60 min. */
  anchor: "start" | "end";
};

/** Alinhado ao SQL `extract(dow from p_dia)` (0 = domingo). */
export function weekdayFromDateKeySP(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

export function parseTimeToMinutes(time: string): number {
  const normalized = time.length >= 5 ? time.slice(0, 5) : time;
  const [h, min] = normalized.split(":").map(Number);
  return h * 60 + min;
}

export function formatMinutesAsTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Rótulo curto: :00 → "14h", :30 → "14:30". */
export function formatTimelineLabel(minutes: number): string {
  if (minutes % 60 === 0) {
    return `${Math.floor(minutes / 60)}h`;
  }
  return formatMinutesAsTime(minutes);
}

function coversFullHourBlock(
  entry: { starts_at: string; ends_at: string },
  hourStartMin: number,
): boolean {
  const start = minutesFromIsoInSP(entry.starts_at);
  const end = minutesFromIsoInSP(entry.ends_at);
  return start === hourStartMin && end - start >= 60;
}

function hasFullHourBookingAt(
  entries: { starts_at: string; ends_at: string }[],
  hourStartMin: number,
): boolean {
  return entries.some((e) => coversFullHourBlock(e, hourStartMin));
}

/** Grade uniforme (30 min, altura fixa); oculta rótulo do meio em blocos de 60 min. */
export function buildTimelineRows(
  openTime: string,
  closeTime: string,
  entries: { starts_at: string; ends_at: string }[] = [],
): TimelineRow[] {
  const start = parseTimeToMinutes(openTime);
  const end = parseTimeToMinutes(closeTime);
  const rows: TimelineRow[] = [];

  for (let m = start; m < end; m += SLOT_STEP_MINUTES) {
    const hourStart = m - (m % 60);
    const hideHalfHourInFullHourBlock =
      m % 60 === SLOT_STEP_MINUTES &&
      hasFullHourBookingAt(entries, hourStart);

    rows.push({
      startMin: m,
      endMin: m + SLOT_STEP_MINUTES,
      heightPx: SLOT_HEIGHT_PX,
      label: formatTimelineLabel(m),
      hideLabel: hideHalfHourInFullHourBlock,
    });
  }

  return rows;
}

/** Rótulos posicionados na grade (evita faixas vazias na coluna de horários). */
export function buildTimelineLabels(
  rows: TimelineRow[],
  entries: { starts_at: string; ends_at: string }[] = [],
): TimelineLabel[] {
  const labels: TimelineLabel[] = [];
  const endHourShownAt = new Set<number>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const hourStart = row.startMin - (row.startMin % 60);
    const isSecondHalfOfFullHour =
      row.hideLabel &&
      row.startMin % 60 === SLOT_STEP_MINUTES &&
      hasFullHourBookingAt(entries, hourStart);

    if (!row.hideLabel) {
      const prev = rows[i - 1];
      const skipDuplicateHourStart =
        prev?.hideLabel &&
        prev.startMin % 60 === SLOT_STEP_MINUTES &&
        hasFullHourBookingAt(entries, prev.startMin - SLOT_STEP_MINUTES) &&
        prev.endMin === row.startMin;

      if (!skipDuplicateHourStart) {
        labels.push({
          topPx: minuteToTopPx(rows, row.startMin),
          text: row.label,
          anchor: "start",
        });
      }
    }

    if (isSecondHalfOfFullHour && !endHourShownAt.has(row.endMin)) {
      endHourShownAt.add(row.endMin);
      labels.push({
        topPx: minuteToTopPx(rows, row.endMin),
        text: formatTimelineLabel(row.endMin),
        anchor: "end",
      });
    }
  }

  return labels;
}

export function entryDurationMinutes(entry: {
  starts_at: string;
  ends_at: string;
}): number {
  return (
    minutesFromIsoInSP(entry.ends_at) - minutesFromIsoInSP(entry.starts_at)
  );
}

export function buildSlotLabels(openTime: string, closeTime: string): string[] {
  return buildTimelineRows(openTime, closeTime).map((r) => r.label);
}

export function minutesFromIsoInSP(iso: string): number {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: BARBER_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return parseTimeToMinutes(formatted);
}

export function currentMinutesInSP(now: Date = new Date()): number {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: BARBER_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  return parseTimeToMinutes(formatted);
}

export const GAP_PX = 4;
export const COLUMN_GAP_PX = 4;

/** Topo em px de um instante na grade de slots. */
export function minuteToTopPx(rows: TimelineRow[], minute: number): number {
  let y = 0;
  for (const row of rows) {
    if (minute <= row.startMin) return y;
    if (minute < row.endMin) {
      const span = row.endMin - row.startMin;
      const ratio = span > 0 ? (minute - row.startMin) / span : 0;
      return y + ratio * row.heightPx;
    }
    y += row.heightPx;
  }
  return y;
}

/** Altura em px entre dois instantes na grade. */
export function spanToHeightPx(
  rows: TimelineRow[],
  startMin: number,
  endMin: number,
): number {
  return Math.max(0, minuteToTopPx(rows, endMin) - minuteToTopPx(rows, startMin));
}

export function timelineRowsHeightPx(rows: TimelineRow[]): number {
  return rows.reduce((sum, r) => sum + r.heightPx, 0);
}

export function layoutEntry({
  startsAt,
  rows,
}: {
  startsAt: string;
  rows: TimelineRow[];
}): { topPx: number; heightPx: number } {
  const startMin = minutesFromIsoInSP(startsAt);
  const topPx = minuteToTopPx(rows, startMin);
  return { topPx, heightPx: MIN_CARD_HEIGHT_PX };
}

export type TimelineLayoutItem = {
  id: string;
  topPx: number;
  heightPx: number;
};

export type TimelineLayoutColumnItem = TimelineLayoutItem & {
  column: number;
  columnCount: number;
};

/** Verifica sobreposição temporal em America/Sao_Paulo. */
export function eventsOverlapInSP(
  a: { starts_at: string; ends_at: string },
  b: { starts_at: string; ends_at: string },
): boolean {
  const startA = minutesFromIsoInSP(a.starts_at);
  const endA = minutesFromIsoInSP(a.ends_at);
  const startB = minutesFromIsoInSP(b.starts_at);
  const endB = minutesFromIsoInSP(b.ends_at);
  return startA < endB && startB < endA;
}

/** Posiciona eventos em colunas quando horários se cruzam (evita sobreposição visual). */
export function layoutTimelineEntriesWithColumns(
  entries: { id: string; starts_at: string; ends_at: string }[],
  rows: TimelineRow[],
): TimelineLayoutColumnItem[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  type Placed = {
    id: string;
    starts_at: string;
    ends_at: string;
    topPx: number;
    heightPx: number;
    column: number;
  };

  const placed: Placed[] = [];

  for (const e of sorted) {
    const { topPx, heightPx } = layoutEntry({
      startsAt: e.starts_at,
      rows,
    });

    const overlapping = placed.filter((p) => eventsOverlapInSP(e, p));
    const usedColumns = new Set(overlapping.map((p) => p.column));

    let column = 0;
    while (usedColumns.has(column)) column++;

    placed.push({
      id: e.id,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      topPx,
      heightPx,
      column,
    });
  }

  return placed.map((p) => {
    const cluster = placed.filter((other) => eventsOverlapInSP(p, other));
    const columnCount = Math.max(1, ...cluster.map((c) => c.column + 1));
    return {
      id: p.id,
      topPx: p.topPx,
      heightPx: p.heightPx,
      column: p.column,
      columnCount,
    };
  });
}

export function formatAgendaDayHeader(dateKey: string, locale = "pt-BR"): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat(locale, {
    timeZone: BARBER_TIMEZONE,
    weekday: "long",
    day: "numeric",
  }).format(utc);
}

export function timelineHeightPx(
  openTime: string,
  closeTime: string,
  entries: { starts_at: string; ends_at: string }[] = [],
): number {
  return timelineRowsHeightPx(buildTimelineRows(openTime, closeTime, entries));
}

/** Amplia open/close para incluir eventos fora do expediente (arredondado em slots de 30 min). */
export function expandBoundsForEntries(
  openTime: string,
  closeTime: string,
  entries: { starts_at: string; ends_at: string }[],
  stepMin = SLOT_STEP_MINUTES,
): { openTime: string; closeTime: string } {
  let openMin = parseTimeToMinutes(openTime);
  let closeMin = parseTimeToMinutes(closeTime);
  for (const e of entries) {
    openMin = Math.min(openMin, minutesFromIsoInSP(e.starts_at));
    closeMin = Math.max(closeMin, minutesFromIsoInSP(e.ends_at));
  }
  openMin = Math.floor(openMin / stepMin) * stepMin;
  closeMin = Math.ceil(closeMin / stepMin) * stepMin;
  if (closeMin <= openMin) closeMin = openMin + stepMin;
  return {
    openTime: formatMinutesAsTime(openMin),
    closeTime: formatMinutesAsTime(closeMin),
  };
}

export function nowLineTopPx(
  rows: TimelineRow[],
  now: Date = new Date(),
): number | null {
  if (rows.length === 0) return null;
  const nowMin = currentMinutesInSP(now);
  const start = rows[0].startMin;
  const end = rows[rows.length - 1].endMin;
  if (nowMin < start || nowMin >= end) return null;
  return minuteToTopPx(rows, nowMin);
}
