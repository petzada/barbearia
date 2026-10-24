import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Miniflare } from "miniflare";
import { sql } from "drizzle-orm";
import { createDb, type Db } from "@/server/db";

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "../../drizzle/migrations");

const splitStatements = (file: string) =>
  readFileSync(path.join(MIGRATIONS_DIR, file), "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

const migrationFiles = () =>
  readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

/** Migrations de dados (INSERT) são reaplicadas a cada reset. */
const isSeedStatement = (s: string) => /^(--[^\n]*\n\s*)*insert\b/i.test(s);

export type TestDb = {
  db: Db;
  d1: D1Database;
  /** Recria o banco do zero (migrations + seed). */
  reset: () => Promise<void>;
  dispose: () => Promise<void>;
};

/**
 * D1 real (workerd via Miniflare) com as mesmas migrations de produção.
 * Use um por arquivo de teste: `const t = await createTestDb()` no beforeAll.
 */
export async function createTestDb(): Promise<TestDb> {
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
    d1Databases: { DB: crypto.randomUUID() },
  });
  const d1 = (await mf.getD1Database("DB")) as unknown as D1Database;
  const db = createDb(d1);
  const statements = migrationFiles().flatMap(splitStatements);
  const seeds = statements.filter(isSeedStatement);
  for (const statement of statements) {
    await db.run(sql.raw(statement));
  }
  const tables = (
    await d1
      .prepare(
        "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '_cf_%' and name not like 'd1_%'",
      )
      .all<{ name: string }>()
  ).results.map((r) => r.name);

  async function reset() {
    await d1.batch([
      d1.prepare("PRAGMA defer_foreign_keys = ON"),
      ...tables.map((name) => d1.prepare(`DELETE FROM "${name}"`)),
      ...seeds.map((s) => d1.prepare(s)),
    ]);
  }

  return { db, d1, reset, dispose: () => mf.dispose() };
}
