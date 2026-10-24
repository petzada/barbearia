import { and, asc, eq, or } from "drizzle-orm";
import type { Db } from "./db";
import { user } from "./db/schema";
import { assertAdmin, type Actor } from "./actor";
import { DomainError } from "./errors";
import { teamMemberSchema, type TeamMemberInput } from "@/lib/validations/profile";
import { normalizeBrazilPhone } from "@/lib/phone";

export type BookableBarber = { id: string; name: string; image: string | null };

export async function listBookableBarbers(db: Db): Promise<BookableBarber[]> {
  return db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(user)
    .where(and(eq(user.isBarber, true), eq(user.acceptingBookings, true)))
    .orderBy(asc(user.name));
}

export async function listBarbers(db: Db): Promise<BookableBarber[]> {
  return db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(user)
    .where(eq(user.isBarber, true))
    .orderBy(asc(user.name));
}

export type TeamMember = {
  id: string;
  name: string;
  image: string | null;
  phoneNumber: string | null;
  isBarber: boolean;
  isAdmin: boolean;
  acceptingBookings: boolean;
  commissionPercent: number;
};

const teamColumns = {
  id: user.id,
  name: user.name,
  image: user.image,
  phoneNumber: user.phoneNumber,
  isBarber: user.isBarber,
  isAdmin: user.isAdmin,
  acceptingBookings: user.acceptingBookings,
  commissionPercent: user.commissionPercent,
};

export async function listTeam(db: Db, actor: Actor): Promise<TeamMember[]> {
  assertAdmin(actor);
  return db
    .select(teamColumns)
    .from(user)
    .where(or(eq(user.isBarber, true), eq(user.isAdmin, true)))
    .orderBy(asc(user.name));
}

/** Busca um cliente pelo WhatsApp para promovê-lo a barbeiro/admin. */
export async function findUserByPhone(
  db: Db,
  actor: Actor,
  rawPhone: string,
): Promise<TeamMember | null> {
  assertAdmin(actor);
  const phone = normalizeBrazilPhone(rawPhone);
  if (!phone.isValid || !phone.normalized) {
    throw new DomainError("invalid", phone.reason ?? "Telefone inválido.");
  }
  const row = await db
    .select(teamColumns)
    .from(user)
    .where(eq(user.phoneNumber, `+${phone.normalized}`))
    .get();
  return row ?? null;
}

export async function updateTeamMember(
  db: Db,
  actor: Actor,
  input: TeamMemberInput,
): Promise<void> {
  assertAdmin(actor);
  const parsed = teamMemberSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError("invalid", parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { userId, ...values } = parsed.data;
  if (userId === actor.id && !values.isAdmin) {
    throw new DomainError(
      "invalid",
      "Você não pode remover o seu próprio acesso de gestão.",
    );
  }
  const [row] = await db.update(user).set(values).where(eq(user.id, userId)).returning({ id: user.id });
  if (!row) throw new DomainError("not_found", "Pessoa não encontrada.");
}
