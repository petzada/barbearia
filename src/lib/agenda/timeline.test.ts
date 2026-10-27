import { describe, expect, it } from "vitest";
import { assignColumnsByBox, buildTimelineRows, layoutTimelineEntriesWithColumns, MIN_CARD_HEIGHT_PX, SLOT_HEIGHT_PX } from "./timeline";

const at = (hhmm: string) => new Date(`2030-01-07T${hhmm}:00-03:00`).toISOString();

describe("assignColumnsByBox", () => {
  it("caixas encostadas ficam na mesma coluna; caixas que se cruzam vão para o lado", () => {
    const out = assignColumnsByBox([
      { id: "a", topPx: 0, heightPx: 60 },
      { id: "b", topPx: 60, heightPx: 30 },
      { id: "c", topPx: 70, heightPx: 30 },
    ]);
    expect(out.map((o) => [o.id, o.column, o.columnCount])).toEqual([
      ["a", 0, 1],
      ["b", 0, 2],
      ["c", 1, 2],
    ]);
  });
});

describe("layoutTimelineEntriesWithColumns", () => {
  it("15 min ocupa meio slot; cards de 15 min seguidos ficam empilhados na mesma coluna", () => {
    const rows = buildTimelineRows("17:00", "19:00");
    const out = layoutTimelineEntriesWithColumns(
      [
        { id: "a", starts_at: at("17:30"), ends_at: at("17:45") },
        { id: "b", starts_at: at("17:45"), ends_at: at("18:00") },
        { id: "c", starts_at: at("18:00"), ends_at: at("18:30") },
      ],
      rows,
    );
    const byId = new Map(out.map((o) => [o.id, o]));
    expect(byId.get("a")!.heightPx).toBe(SLOT_HEIGHT_PX / 2);
    expect(byId.get("b")!.topPx).toBe(byId.get("a")!.topPx + SLOT_HEIGHT_PX / 2);
    expect(byId.get("c")!.heightPx).toBe(MIN_CARD_HEIGHT_PX);
    expect(out.every((o) => o.column === 0 && o.columnCount === 1)).toBe(true);
  });

  it("encaixe no mesmo horário vai para a coluna ao lado", () => {
    const rows = buildTimelineRows("17:00", "19:00");
    const out = layoutTimelineEntriesWithColumns(
      [
        { id: "a", starts_at: at("17:30"), ends_at: at("18:00") },
        { id: "b", starts_at: at("17:30"), ends_at: at("17:45") },
      ],
      rows,
    );
    expect(out.map((o) => [o.column, o.columnCount])).toEqual([
      [0, 2],
      [1, 2],
    ]);
  });
});
