import "server-only";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { requireOnboardedUser, requireUser, toActor } from "@/server/auth";

/** Banco, ambiente e ator da Server Action (sempre derivados da sessão). */
export async function actionContext(opts: { allowIncompleteProfile?: boolean } = {}) {
  const user = opts.allowIncompleteProfile ? await requireUser() : await requireOnboardedUser();
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  return { db, env, user, actor: toActor(user) };
}
