import { describe, expect, it } from "vitest";
import {
  formatDateRange,
  formatDayLabel,
  formatDayLong,
  formatDayMonth,
  formatMonthYear,
  formatTimeRange,
  formatWeekdayLong,
  formatWeekdayShort,
} from "./format";

// 2026-11-02 é segunda-feira. 12:00 UTC = 09:00 em SP.
const nine = Date.parse("2026-11-02T12:00:00Z");
const ten = Date.parse("2026-11-02T13:00:00Z");

describe("formatadores de data/hora", () => {
  it("dia da semana capitalizado, sem ponto", () => {
    expect(formatWeekdayShort("2026-11-02")).toBe("Seg");
    expect(formatWeekdayShort("2026-11-07")).toBe("Sáb");
    expect(formatWeekdayLong("2026-11-03")).toBe("Terça");
  });

  it("aceita dia ou instante (22h em SP ainda é o mesmo dia)", () => {
    expect(formatDayMonth("2026-11-02")).toBe("02/11");
    expect(formatDayMonth(Date.parse("2026-11-03T01:00:00Z"))).toBe("02/11");
    expect(formatDayLabel(nine)).toBe("Seg, 02/11");
    expect(formatDayLong("2026-11-02")).toBe("Segunda, 2 de novembro");
  });

  it("intervalos com espaço em volta do traço", () => {
    expect(formatTimeRange(nine, ten)).toBe("09:00 – 10:00");
    expect(formatDateRange("2026-11-02", "2026-11-08")).toBe("02/11 – 08/11");
    expect(formatDateRange("2026-11-02", "2026-11-02")).toBe("02/11");
  });

  it("mês e ano capitalizados", () => {
    expect(formatMonthYear(2026, 12)).toBe("Dezembro de 2026");
  });
});
