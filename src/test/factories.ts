import type { Db } from "@/server/db";
import { user } from "@/server/db/schema";
import type { Actor } from "@/server/actor";

let seq = 0;

export async function createUser(
  db: Db,
  overrides: Partial<typeof user.$inferInsert> = {},
): Promise<Actor & { name: string; phoneNumber: string | null }> {
  seq += 1;
  const id = overrides.id ?? `user-${seq}-${crypto.randomUUID().slice(0, 8)}`;
  const [row] = await db
    .insert(user)
    .values({
      id,
      name: `Pessoa ${seq}`,
      email: `${id}@teste.local`,
      phoneNumber: `+55119${String(10000000 + seq).slice(-8)}`,
      phoneNumberVerified: true,
      profileCompleted: true,
      ...overrides,
    })
    .returning();
  return {
    id: row.id,
    name: row.name,
    phoneNumber: row.phoneNumber,
    isBarber: row.isBarber,
    isAdmin: row.isAdmin,
  };
}

export const createBarber = (db: Db, overrides: Partial<typeof user.$inferInsert> = {}) =>
  createUser(db, { isBarber: true, commissionPercent: 40, ...overrides });

export const createAdmin = (db: Db, overrides: Partial<typeof user.$inferInsert> = {}) =>
  createUser(db, { isAdmin: true, ...overrides });

/** Instante em São Paulo (UTC-3). */
export const sp = (dateKey: string, hhmm: string) => new Date(`${dateKey}T${hhmm}:00-03:00`);
