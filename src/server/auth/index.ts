import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { user } from "../db/schema";
import { getServerEnv } from "../env";
import { createWhatsappGateway } from "../whatsapp/service";
import type { Actor } from "../actor";
import { createAuth } from "./config";
import { MODE_HOME, resolveMode } from "@/lib/modes";

/** Instância do Better Auth da requisição atual (bindings D1 por request). */
export const getAuth = cache(async () => {
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  return createAuth({ db, env, gateway: createWhatsappGateway(env) });
});

export type CurrentUser = typeof user.$inferSelect;

/** Usuário logado lido do banco (flags de papel sempre atualizadas). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const db = await getDb();
  return (await db.query.user.findFirst({ where: eq(user.id, session.user.id) })) ?? null;
});

export const toActor = (u: CurrentUser): Actor => ({
  id: u.id,
  isBarber: u.isBarber,
  isAdmin: u.isAdmin,
});

/** Exige sessão; manda para o login se não houver. */
export async function requireUser(): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  return current;
}

/** Exige sessão + cadastro completo (nome e WhatsApp verificado). */
export async function requireOnboardedUser(): Promise<CurrentUser> {
  const current = await requireUser();
  if (!current.profileCompleted || !current.phoneNumberVerified) redirect("/bem-vindo");
  return current;
}

export async function requireBarberUser(): Promise<CurrentUser> {
  const current = await requireOnboardedUser();
  if (!current.isBarber) redirect(homePathFor(current));
  return current;
}

export async function requireAdminUser(): Promise<CurrentUser> {
  const current = await requireOnboardedUser();
  if (!current.isAdmin) redirect(homePathFor(current));
  return current;
}

/** Área inicial pós-login: gestão > barbeiro > cliente. */
export function homePathFor(u: Pick<CurrentUser, "isAdmin" | "isBarber">): string {
  return MODE_HOME[resolveMode(u)];
}
