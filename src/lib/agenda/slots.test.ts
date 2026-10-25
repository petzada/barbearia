import { describe, expect, it } from "vitest";
import { computeAvailableSlots, effectiveDayHours, hoursForDate } from "./slots";
import { formatSlotTime } from "./availability";

const rules = { slotIntervalMinutes: 30, minLeadMinutes: 30 };
const hours = { openTime: "09:00", closeTime: "12:00", isClosed: false };
// 2026-11-02 é segunda-feira. 09:00 em SP = 12:00 UTC.
const DAY = "2026-11-02";
const at = (hhmm: string) => Date.parse(`${DAY}T${hhmm}:00-03:00`);
const labels = (slots: number[]) => slots.map((s) => formatSlotTime(s));
const longAgo = Date.parse("2026-10-01T00:00:00Z");

describe("computeAvailableSlots", () => {
  it("gera a grade inteira quando o barbeiro está livre", () => {
    const slots = computeAvailableSlots({
      dateKey: DAY, hours, durationMinutes: 30, rules, busy: [], now: longAgo,
    });
    expect(labels(slots)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]);
  });

  it("serviço de 60 min precisa caber inteiro antes do fechamento", () => {
    const slots = computeAvailableSlots({
      dateKey: DAY, hours, durationMinutes: 60, rules, busy: [], now: longAgo,
    });
    expect(labels(slots).at(-1)).toBe("11:00");
  });

  it("remove horários que cruzam agendamentos ou bloqueios", () => {
    const slots = computeAvailableSlots({
      dateKey: DAY,
      hours,
      durationMinutes: 60,
      rules,
      busy: [{ startsAt: at("10:00"), endsAt: at("10:30") }],
      now: longAgo,
    });
    // 09:30–10:30 e 10:00–11:00 cruzam o bloqueio 10:00–10:30.
    expect(labels(slots)).toEqual(["09:00", "10:30", "11:00"]);
  });

  it("respeita a antecedência mínima configurada", () => {
    const slots = computeAvailableSlots({
      dateKey: DAY,
      hours,
      durationMinutes: 30,
      rules: { slotIntervalMinutes: 30, minLeadMinutes: 60 },
      busy: [],
      now: at("09:10"),
    });
    expect(labels(slots)[0]).toBe("10:30");
  });

  it("usa o intervalo de grade configurado", () => {
    const slots = computeAvailableSlots({
      dateKey: DAY,
      hours: { openTime: "09:00", closeTime: "10:00", isClosed: false },
      durationMinutes: 30,
      rules: { slotIntervalMinutes: 15, minLeadMinutes: 0 },
      busy: [],
      now: longAgo,
    });
    expect(labels(slots)).toEqual(["09:00", "09:15", "09:30"]);
  });

  it("dia fechado ou sem horário cadastrado não tem horários", () => {
    expect(
      computeAvailableSlots({
        dateKey: DAY, hours: { ...hours, isClosed: true }, durationMinutes: 30, rules, busy: [], now: longAgo,
      }),
    ).toEqual([]);
    expect(
      computeAvailableSlots({ dateKey: DAY, hours: null, durationMinutes: 30, rules, busy: [], now: longAgo }),
    ).toEqual([]);
  });
});

describe("hoursForDate", () => {
  it("resolve o dia da semana no fuso de São Paulo", () => {
    const week = [
      { weekday: 0, openTime: "09:00", closeTime: "19:00", isClosed: true },
      { weekday: 1, openTime: "10:00", closeTime: "18:00", isClosed: false },
    ];
    expect(hoursForDate("2026-11-02", week)?.openTime).toBe("10:00");
    expect(hoursForDate("2026-11-01", week)?.isClosed).toBe(true);
    expect(hoursForDate("2026-11-03", week)).toBeNull();
  });
});

describe("effectiveDayHours (barbearia ∩ escala ∩ feriados)", () => {
  const shopWeek = [
    { weekday: 0, openTime: "09:00", closeTime: "19:00", isClosed: true },
    { weekday: 1, openTime: "09:00", closeTime: "19:00", isClosed: false },
    { weekday: 2, openTime: "09:00", closeTime: "19:00", isClosed: false },
  ];
  it("sem escala segue a barbearia", () => {
    expect(effectiveDayHours({ dateKey: "2026-11-02", shopWeek })).toEqual({
      openTime: "09:00", closeTime: "19:00", isClosed: false,
    });
  });
  it("interseção com a escala do barbeiro", () => {
    const barberWeek = [{ weekday: 1, startTime: "13:00", endTime: "21:00", isOff: false }];
    expect(effectiveDayHours({ dateKey: "2026-11-02", shopWeek, barberWeek })).toEqual({
      openTime: "13:00", closeTime: "19:00", isClosed: false,
    });
  });
  it("folga do barbeiro, dia fechado e feriado fecham o dia", () => {
    const barberWeek = [{ weekday: 2, startTime: "09:00", endTime: "19:00", isOff: true }];
    expect(effectiveDayHours({ dateKey: "2026-11-03", shopWeek, barberWeek })?.isClosed).toBe(true);
    expect(effectiveDayHours({ dateKey: "2026-11-01", shopWeek })?.isClosed).toBe(true);
    expect(
      effectiveDayHours({ dateKey: "2026-11-02", shopWeek, closedDates: new Set(["2026-11-02"]) })?.isClosed,
    ).toBe(true);
  });
  it("escala fora do funcionamento fecha o dia", () => {
    const barberWeek = [{ weekday: 1, startTime: "19:30", endTime: "22:00", isOff: false }];
    expect(effectiveDayHours({ dateKey: "2026-11-02", shopWeek, barberWeek })?.isClosed).toBe(true);
  });
});
