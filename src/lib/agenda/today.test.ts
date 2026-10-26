import { describe, expect, it } from "vitest";
import { formatClock, greetingSP, isPendingAppointment, minutesOfDaySP, timelineHourRange } from "./today";

describe("Hoje do barbeiro", () => {
  it("pendente = atendimento ainda marcado", () => {
    expect(isPendingAppointment({ type: "appointment", status: "booked" })).toBe(true);
    expect(isPendingAppointment({ type: "appointment", status: "completed" })).toBe(false);
    expect(isPendingAppointment({ type: "appointment", status: "no_show" })).toBe(false);
    expect(isPendingAppointment({ type: "block", status: "booked" })).toBe(false);
  });
  it("horário de Brasília em 24h", () => {
    expect(minutesOfDaySP("2026-10-26T17:30:00Z")).toBe(14 * 60 + 30);
    expect(formatClock(14 * 60 + 5)).toBe("14:05");
    expect(formatClock(0)).toBe("00:00");
  });
  it("saudação por período do dia em SP", () => {
    expect(greetingSP(new Date("2026-10-26T11:00:00Z"))).toBe("Bom dia"); // 08:00
    expect(greetingSP(new Date("2026-10-26T18:00:00Z"))).toBe("Boa tarde"); // 15:00
    expect(greetingSP(new Date("2026-10-26T23:30:00Z"))).toBe("Boa noite"); // 20:30
  });
  it("faixa de horas cobre expediente, atendimentos e o agora", () => {
    expect(timelineHourRange({ openTime: "09:00", closeTime: "19:00", items: [] })).toEqual({ startHour: 9, endHour: 19 });
    expect(
      timelineHourRange({ openTime: "09:00", closeTime: "19:00", items: [{ startMin: 19 * 60, endMin: 19 * 60 + 45 }], nowMin: 8 * 60 + 20 }),
    ).toEqual({ startHour: 8, endHour: 20 });
  });
});
