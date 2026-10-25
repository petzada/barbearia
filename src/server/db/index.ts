import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { cache } from "react";
import { schema } from "./schema";

/** Drizzle + acesso ao binding D1 nativo (`$client`) para batches em SQL puro. */
export type Db = DrizzleD1Database<typeof schema> & { $client: D1Database };

export function createDb(d1: D1Database): Db {
  return drizzle(d1, { schema });
}

/** Banco da requisição atual (binding `DB` do wrangler.jsonc). */
export const getDb = cache(async (): Promise<Db> => {
  const { env } = await getCloudflareContext({ async: true });
  return createDb(env.DB);
});
