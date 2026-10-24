import { asc, eq } from "drizzle-orm";
import type { Db } from "./db";
import { services } from "./db/schema";
import { assertAdmin, type Actor } from "./actor";
import { DomainError } from "./errors";
import { serviceFormSchema, type ServiceFormInput } from "@/lib/validations/servico";

export type Service = typeof services.$inferSelect;

export async function listServices(
  db: Db,
  opts: { includeInactive?: boolean } = {},
): Promise<Service[]> {
  return db
    .select()
    .from(services)
    .where(opts.includeInactive ? undefined : eq(services.active, true))
    .orderBy(asc(services.sortOrder), asc(services.name));
}

export async function getService(db: Db, id: string): Promise<Service | undefined> {
  return db.query.services.findFirst({ where: eq(services.id, id) });
}

export async function upsertService(
  db: Db,
  actor: Actor,
  input: ServiceFormInput,
): Promise<Service> {
  assertAdmin(actor);
  const parsed = serviceFormSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("invalid", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { id, ...values } = parsed.data;
  if (id) {
    const [row] = await db.update(services).set(values).where(eq(services.id, id)).returning();
    if (!row) throw new DomainError("not_found", "Serviço não encontrado.");
    return row;
  }
  const [row] = await db.insert(services).values(values).returning();
  return row;
}
