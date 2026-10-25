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

/** Ordem em que os serviços aparecem para o cliente (lista completa de ids). */
export async function reorderServices(db: Db, actor: Actor, orderedIds: string[]): Promise<void> {
  assertAdmin(actor);
  const current = await db.select({ id: services.id }).from(services);
  const known = new Set(current.map((s) => s.id));
  if (orderedIds.length !== known.size || new Set(orderedIds).size !== orderedIds.length || !orderedIds.every((id) => known.has(id))) {
    throw new DomainError("invalid", "Lista de serviços desatualizada. Recarregue a página.");
  }
  const [first, ...rest] = orderedIds.map((id, index) =>
    db.update(services).set({ sortOrder: index }).where(eq(services.id, id)),
  );
  await db.batch([first, ...rest]);
}

/** Liga/desliga um serviço direto na lista. */
export async function setServiceActive(db: Db, actor: Actor, id: string, active: boolean): Promise<void> {
  assertAdmin(actor);
  const [row] = await db.update(services).set({ active }).where(eq(services.id, id)).returning({ id: services.id });
  if (!row) throw new DomainError("not_found", "Serviço não encontrado.");
}
