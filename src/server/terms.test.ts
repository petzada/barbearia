import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/test/d1";
import { createUser, sp } from "@/test/factories";
import { plans, user } from "./db/schema";
import { acceptTerms, assertAcceptedTerms, hasAcceptedCurrentTerms } from "./terms";
import { startSubscriptionCheckout } from "./payments/service";
import type { PaymentGateway } from "./payments/abacatepay";
import { TERMS_VERSION } from "@/content/legal";

let t: TestDb;
beforeAll(async () => {
  t = await createTestDb();
});
beforeEach(() => t.reset());
afterAll(() => t.dispose());

describe("aceite dos termos", () => {
  it("registra data e versão só com aceite explícito", async () => {
    const u = await createUser(t.db, { termsVersion: null, termsAcceptedAt: null });
    await expect(acceptTerms(t.db, u.id, { accepted: false })).rejects.toMatchObject({ code: "invalid" });
    const now = sp("2026-10-26", "10:00");
    await acceptTerms(t.db, u.id, { accepted: true }, now);
    const [row] = await t.db.select().from(user).where(eq(user.id, u.id));
    expect(row).toMatchObject({ termsVersion: TERMS_VERSION, termsAcceptedAt: now });
    expect(hasAcceptedCurrentTerms(row)).toBe(true);
  });

  it("versão antiga exige novo aceite", () => {
    expect(hasAcceptedCurrentTerms({ termsVersion: "2026-01-01" })).toBe(false);
    expect(hasAcceptedCurrentTerms({ termsVersion: null })).toBe(false);
  });

  it("assinar o clube exige aceite da versão vigente", async () => {
    const u = await createUser(t.db, { termsVersion: "2026-01-01" });
    await expect(assertAcceptedTerms(t.db, u.id)).rejects.toMatchObject({ code: "forbidden" });
    const plan = (await t.db.query.plans.findFirst({ where: eq(plans.slug, "premium") }))!;
    const gw = { createProduct: vi.fn(), createSubscriptionCheckout: vi.fn() } as unknown as PaymentGateway;
    await expect(
      startSubscriptionCheckout(t.db, u, gw, { appBaseUrl: "https://app" }, plan.id),
    ).rejects.toThrow(/Termos de Uso/);
    expect(gw.createSubscriptionCheckout).not.toHaveBeenCalled();
  });
});
