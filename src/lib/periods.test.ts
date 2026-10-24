import { describe, expect, it } from "vitest";
import { resolvePeriod } from "./periods";

const now = new Date("2026-03-10T15:00:00Z");

describe("resolvePeriod", () => {
  it("resolve os atalhos de período em SP", () => {
    expect(resolvePeriod("hoje", now)).toMatchObject({ from: "2026-03-10", to: "2026-03-10" });
    expect(resolvePeriod("7d", now)).toMatchObject({ from: "2026-03-04", to: "2026-03-10" });
    expect(resolvePeriod("mes", now)).toMatchObject({ from: "2026-03-01", to: "2026-03-10" });
    expect(resolvePeriod("mes-anterior", now)).toMatchObject({ from: "2026-02-01", to: "2026-02-28" });
  });
  it("valor desconhecido vira 'este mês'", () => {
    expect(resolvePeriod("xyz", now).key).toBe("mes");
    expect(resolvePeriod(undefined, now).key).toBe("mes");
  });
  it("mês anterior em janeiro volta para dezembro", () => {
    expect(resolvePeriod("mes-anterior", new Date("2026-01-15T12:00:00Z"))).toMatchObject({
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });
});
