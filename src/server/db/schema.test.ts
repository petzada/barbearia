import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "@/test/d1";
import { businessHours, services, shopSettings } from "./schema";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
afterAll(() => t.dispose());

describe("migrations", () => {
  it("aplica o esquema e o seed inicial no D1", async () => {
    const settings = await t.db.select().from(shopSettings);
    expect(settings).toHaveLength(1);
    expect(settings[0].cancelUntilMinutes).toBe(120);
    expect(await t.db.select().from(businessHours)).toHaveLength(7);
    expect((await t.db.select().from(services)).map((s) => s.name)).toEqual([
      "Corte",
      "Barba",
      "Corte + Barba",
    ]);
  });

  it("rejeita horário de funcionamento com fechamento antes da abertura", async () => {
    await expect(
      t.db
        .update(businessHours)
        .set({ openTime: "18:00", closeTime: "09:00", isClosed: false }),
    ).rejects.toThrow();
  });
});
