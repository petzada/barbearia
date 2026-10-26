import { eq } from "drizzle-orm";
import type { Db } from "./db";
import { user } from "./db/schema";
import { DomainError } from "./errors";
import { TERMS_VERSION } from "@/content/legal";

/** Aceitou a versão vigente dos Termos de Uso e da Política de Privacidade. */
export function hasAcceptedCurrentTerms(u: { termsVersion: string | null }): boolean {
  return u.termsVersion === TERMS_VERSION;
}

/** Registra o aceite (data + versão) — exige marcação explícita do usuário. */
export async function acceptTerms(
  db: Db,
  userId: string,
  input: { accepted: boolean },
  now: Date = new Date(),
): Promise<void> {
  if (input.accepted !== true) {
    throw new DomainError("invalid", "Para continuar, marque que leu e aceita os Termos e a Política de Privacidade.");
  }
  const [row] = await db
    .update(user)
    .set({ termsAcceptedAt: now, termsVersion: TERMS_VERSION })
    .where(eq(user.id, userId))
    .returning({ id: user.id });
  if (!row) throw new DomainError("not_found", "Conta não encontrada.");
}

/** Bloqueia operações que dependem do aceite (ex.: assinar o Clube). */
export async function assertAcceptedTerms(db: Db, userId: string): Promise<void> {
  const row = await db.query.user.findFirst({ where: eq(user.id, userId), columns: { termsVersion: true } });
  if (!row || !hasAcceptedCurrentTerms(row)) {
    throw new DomainError("forbidden", "Aceite os Termos de Uso e a Política de Privacidade para continuar.");
  }
}
