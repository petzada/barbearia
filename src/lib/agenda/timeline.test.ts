import { describe, expect, it } from "vitest";
import { assignColumnsByBox, buildTimelineRows, layoutTimelineEntriesWithColumns, MIN_CARD_HEIGHT_PX } from "./timeline";

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
  it("cards de 15 min seguidos não se sobrepõem: o mínimo de altura empurra o seguinte para outra coluna", () => {
    const rows = buildTimelineRows("17:00", "19:00");
    const out = layoutTimelineEntriesWithColumns(
      [
        { id: "a", starts_at: at("17:30"), ends_at: at("17:45") },
        { id: "b", starts_at: at("17:45"), ends_at: at("18:00") },
        { id: "c", starts_at: at("18:00"), ends_at: at("18:15") },
      ],
      rows,
    );
    const byId = new Map(out.map((o) => [o.id, o]));
    expect(byId.get("a")!.heightPx).toBe(MIN_CARD_HEIGHT_PX);
    expect(byId.get("a")!.column).not.toBe(byId.get("b")!.column);
    // "c" começa exatamente onde o card "a" termina (85px): encostado, mesma coluna.
    expect(byId.get("c")!.topPx).toBe(byId.get("a")!.topPx + byId.get("a")!.heightPx);
    expect(byId.get("c")!.column).toBe(0);
  });
});
