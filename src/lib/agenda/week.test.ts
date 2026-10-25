import { describe, expect, it } from "vitest";
import { summarizeWeek } from "./week";

describe("summarizeWeek", () => {
  it("agrupa dias seguidos com o mesmo horário (seed padrão)", () => {
    const rows = [
      { weekday: 0, openTime: "09:00", closeTime: "19:00", isClosed: true },
      ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, openTime: "09:00", closeTime: "19:00", isClosed: false })),
      { weekday: 6, openTime: "09:00", closeTime: "13:00", isClosed: false },
    ];
    expect(summarizeWeek(rows)).toEqual([
      { label: "Seg a Sex", hours: "09:00–19:00" },
      { label: "Sáb", hours: "09:00–13:00" },
      { label: "Dom", hours: "Fechado" },
    ]);
  });

  it("dia sem cadastro conta como fechado", () => {
    expect(summarizeWeek([])).toEqual([{ label: "Seg a Dom", hours: "Fechado" }]);
  });
});
