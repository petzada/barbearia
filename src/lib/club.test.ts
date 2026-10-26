import { describe, expect, it } from "vitest";
import { clubCoversService, clubCoversSlot, clubWeekdayHint, type BookingClub } from "./club";

const gold: BookingClub = {
  planName: "Gold Limitado",
  remaining: 2,
  total: 4,
  coveredServiceIds: ["svc-corte", "svc-barba", "svc-combo"],
  allowedWeekdays: [2, 3],
  periodEnd: Date.parse("2026-12-01T13:00:00Z"),
};
const at = (iso: string) => Date.parse(iso);

describe("cobertura do clube no wizard", () => {
  it("cobre só terças e quartas dentro do ciclo", () => {
    expect(clubCoversSlot(gold, "svc-corte", at("2026-11-03T12:00:00Z"))).toBe(true); // terça
    expect(clubCoversSlot(gold, "svc-corte", at("2026-11-02T12:00:00Z"))).toBe(false); // segunda
    expect(clubCoversSlot(gold, "svc-corte", at("2026-12-01T13:00:00Z"))).toBe(false); // fim do ciclo
  });
  it("sem atendimentos restantes ou serviço fora do plano não cobre", () => {
    expect(clubCoversService({ ...gold, remaining: 0 }, "svc-corte")).toBe(false);
    expect(clubCoversService(gold, "svc-outro")).toBe(false);
    expect(clubCoversService(null, "svc-corte")).toBe(false);
  });
  it("dica de dias", () => {
    expect(clubWeekdayHint(gold)).toBe("Seu plano cobre terças e quartas");
    expect(clubWeekdayHint({ ...gold, allowedWeekdays: [] })).toBeNull();
  });
});
