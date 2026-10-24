import { describe, expect, it } from "vitest";
import {
  canClientCancel,
  dateKeyFromIsoInSP,
  formatMinutesShort,
  formatPriceCents,
  getSelectableDateKeys,
  isDateInBookingWindow,
} from "./availability";
import { spDayBounds, spLocalDateTimeToIso, todayDateKeySP } from "./timezone";

describe("fuso America/Sao_Paulo", () => {
  it("converte horário local para UTC (UTC-3, sem horário de verão)", () => {
    expect(spLocalDateTimeToIso("2026-11-02", "09:00")).toBe("2026-11-02T12:00:00.000Z");
  });

  it("limites do dia civil", () => {
    expect(spDayBounds("2026-11-02")).toEqual({
      start: "2026-11-02T03:00:00.000Z",
      end: "2026-11-03T03:00:00.000Z",
    });
  });

  it("horário das 22h em SP ainda é o mesmo dia (bug do slice UTC corrigido)", () => {
    expect(dateKeyFromIsoInSP("2026-11-03T01:00:00.000Z")).toBe("2026-11-02");
    expect(todayDateKeySP(new Date("2026-11-03T01:00:00.000Z"))).toBe("2026-11-02");
  });
});

describe("janela de agendamento", () => {
  const now = new Date("2026-11-02T15:00:00.000Z");
  it("inclui hoje e N-1 dias à frente", () => {
    const keys = getSelectableDateKeys(3, now);
    expect(keys).toEqual(["2026-11-02", "2026-11-03", "2026-11-04"]);
    expect(isDateInBookingWindow("2026-11-05", 3, now)).toBe(false);
  });
});

describe("cancelamento pelo cliente", () => {
  const now = new Date("2026-11-02T12:00:00.000Z");
  it("permite só com antecedência maior que o prazo configurado", () => {
    expect(canClientCancel("2026-11-02T14:01:00.000Z", 120, now)).toBe(true);
    expect(canClientCancel("2026-11-02T14:00:00.000Z", 120, now)).toBe(false);
    expect(canClientCancel("2026-11-02T12:31:00.000Z", 30, now)).toBe(true);
  });
});

describe("formatação", () => {
  it("formata preço e prazos", () => {
    expect(formatPriceCents(4500).replace(/\s/g, " ")).toBe("R$ 45,00");
    expect(formatMinutesShort(30)).toBe("30 min");
    expect(formatMinutesShort(120)).toBe("2h");
    expect(formatMinutesShort(90)).toBe("1h30");
  });
});
