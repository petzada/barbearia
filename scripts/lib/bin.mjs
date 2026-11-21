// Roda o binário de um pacote instalado direto com o Node, sem npx e sem shell:
// a lista de argumentos não passa pelo cmd do Windows (limite de 8 KB).
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");

export function binPath(pkg, name = pkg) {
  const dir = path.join(root, "node_modules", pkg);
  const { bin } = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"));
  const rel = typeof bin === "string" ? bin : bin?.[name];
  if (!rel) throw new Error(`${pkg} não expõe o binário ${name}`);
  return path.join(dir, rel);
}

/** Executa o binário e devolve o código de saída. */
export function runBin(pkg, name, args) {
  const r = spawnSync(process.execPath, [binPath(pkg, name), ...args], { stdio: "inherit", cwd: root });
  if (r.error) throw r.error;
  return r.status ?? 1;
}
