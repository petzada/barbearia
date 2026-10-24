import { asc, eq } from "drizzle-orm";
import type { Db } from "./db";
import { businessHours, shopSettings } from "./db/schema";
import { assertAdmin, type Actor } from "./actor";
import { DomainError } from "./errors";
import {
  businessHoursFormSchema,
  shopSettingsSchema,
  type BusinessHoursFormInput,
  type ShopSettingsInput,
} from "@/lib/validations/settings";

export type ShopSettings = typeof shopSettings.$inferSelect;
export type BusinessHoursRow = typeof businessHours.$inferSelect;

const DEFAULT_SETTINGS: ShopSettings = {
  id: 1,
  shopName: "Barbearia do Moura",
  phone: null,
  address: null,
  instagram: null,
  slotIntervalMinutes: 30,
  minLeadMinutes: 30,
  bookingWindowDays: 30,
  cancelUntilMinutes: 120,
  updatedAt: new Date(0),
};

export async function getShopSettings(db: Db): Promise<ShopSettings> {
  const row = await db.query.shopSettings.findFirst({
    where: eq(shopSettings.id, 1),
  });
  return row ?? DEFAULT_SETTINGS;
}

export async function updateShopSettings(
  db: Db,
  actor: Actor,
  input: ShopSettingsInput,
): Promise<void> {
  assertAdmin(actor);
  const parsed = shopSettingsSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("invalid", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const values = { id: 1, ...parsed.data };
  await db
    .insert(shopSettings)
    .values(values)
    .onConflictDoUpdate({ target: shopSettings.id, set: parsed.data });
}

export async function getBusinessHours(db: Db): Promise<BusinessHoursRow[]> {
  return db.select().from(businessHours).orderBy(asc(businessHours.weekday));
}

export async function saveBusinessHours(
  db: Db,
  actor: Actor,
  input: BusinessHoursFormInput,
): Promise<void> {
  assertAdmin(actor);
  const parsed = businessHoursFormSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("invalid", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const [first, ...rest] = parsed.data.rows.map((row) =>
    db
      .insert(businessHours)
      .values(row)
      .onConflictDoUpdate({
        target: businessHours.weekday,
        set: { openTime: row.openTime, closeTime: row.closeTime, isClosed: row.isClosed },
      }),
  );
  // batch = transação única no D1: ou salva a semana inteira, ou nada.
  await db.batch([first, ...rest]);
}
