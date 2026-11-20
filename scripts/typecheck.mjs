// Typecheck incremental (`pnpm typecheck` e pre-push do lefthook).
// `next typegen` (tipos das rotas em .next/types) só roda quando os tipos não existem ou
// algum arquivo de src/app ou o next.config é mais novo que eles. Depois, `tsc --noEmit`
// incremental (tsBuildInfoFile no tsconfig).
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { runBin } from "./lib/bin.mjs";

const root = path.resolve(import.meta.dirname, "..");
const marker = path.join(root, ".next/types/routes.d.ts");

// Maior mtime da árvore, pastas incluídas (criar, renomear ou apagar rota muda a pasta).
function newest(dir) {
  let max = statSync(dir).mtimeMs;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    max = Math.max(max, e.isDirectory() ? newest(p) : statSync(p).mtimeMs);
  }
  return max;
}

function typegenNeeded() {
  if (!existsSync(marker)) return true;
  const generated = statSync(marker).mtimeMs;
  const sources = Math.max(newest(path.join(root, "src/app")), statSync(path.join(root, "next.config.ts")).mtimeMs);
  return sources > generated;
}

if (typegenNeeded()) {
  const code = runBin("next", "next", ["typegen"]);
  if (code !== 0) process.exit(code);
}
process.exit(runBin("typescript", "tsc", ["--noEmit"]));
