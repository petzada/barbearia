import { describe, expect, it } from "vitest";
import { buildDayRows } from "./day-slots";

const at = (hhmm: string) => `2026-11-02T${hhmm}:00-03:00`;
const entry = (id: string, start: string, end: string) => ({ id, starts_at: at(start), ends_at: at(end) });
const view = (rows: ReturnType<typeof buildDayRows<ReturnType<typeof entry>>>) =>
  rows.map((r) => (r.kind === "entry" ? `${r.time} ${r.entry.id}` : `${r.time} livre`));

describe("buildDayRows", () => {
  it("intercala livres e ocupados no passo da grade", () => {
    const rows = buildDayRows({
      openTime: "09:00",
      closeTime: "11:00",
      isClosed: false,
      stepMinutes: 30,
      entries: [entry("a", "09:30", "10:30")],
    });
    expect(view(rows)).toEqual(["09:00 livre", "09:30 a", "10:30 livre"]);
  });

  it("mantém encaixes fora da grade e fora do expediente", () => {
    const rows = buildDayRows({
      openTime: "09:00",
      closeTime: "10:00",
      isClosed: false,
      stepMinutes: 30,
      entries: [entry("a", "09:10", "09:40"), entry("late", "20:00", "20:30")],
    });
    expect(view(rows)).toEqual(["09:10 a", "20:00 late"]);
  });

  it("dia fechado lista só o que houver", () => {
    expect(view(buildDayRows({ openTime: "09:00", closeTime: "19:00", isClosed: true, stepMinutes: 30, entries: [] }))).toEqual([]);
  });
});
