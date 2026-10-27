// Testes ligados ao diff do branch (pre-push do lefthook e `npm run test:related`).
// Compara com o merge-base do branch padrão do remoto e roda `vitest related --run` nos
// arquivos alterados. Sem nada relacionado no diff, não roda nada.
// Argumentos extras vão direto para o vitest (ex.: --testTimeout=60000); `--list` só
// mostra o que rodaria.
//
// `vitest related` segue só import estático. Dois casos que ele não enxerga entram por
// busca no código dos testes (os dois já deixaram falha chegar ao CI):
// - import() dinâmico (`await import("./delete")` depois de vi.resetModules);
// - testes que leem arquivos do disco (content/blog/*.mdx, supabase/migrations/*.sql),
//   achados pelos dois primeiros segmentos do caminho: "content/blog" ou
//   path.join(..., "content", "blog").
// O CI roda a suíte completa de qualquer forma.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const lines = (s) => s.split("\n").filter(Boolean);
const CODE = /\.(c|m)?(t|j)sx?$/;
// Nomes que aparecem em import() de muitos testes sem relação entre si.
const GENERIC = new Set(["index", "page", "layout", "route", "utils", "types", "config", "constants"]);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function base() {
  for (const ref of ["origin/HEAD", "origin/main", "origin/master"]) {
    try {
      return git("merge-base", "HEAD", ref);
    } catch {
      // ref ausente: tenta a próxima
    }
  }
  return null;
}

const from = base();
if (!from) {
  console.log("test-related: sem branch padrão no remoto; nada a comparar.");
  process.exit(0);
}

const changed = lines(git("diff", "--name-only", "--diff-filter=d", from, "HEAD")).filter(existsSync);
const code = changed.filter((f) => CODE.test(f));

const patterns = [];
for (const f of changed) {
  if (CODE.test(f)) {
    const stem = path.basename(f).replace(/(\.(c|m)?(t|j)sx?)$/, "");
    if (!GENERIC.has(stem)) patterns.push(new RegExp(`import\\(\\s*["'][^"']*/${esc(stem)}["']`));
  } else {
    const [a, b] = f.split("/");
    if (!b || !f.includes("/", a.length + 1)) continue; // só arquivos em pasta de 2+ níveis
    patterns.push(new RegExp(`${esc(a)}/${esc(b)}\\b|["']${esc(a)}["']\\s*,\\s*["']${esc(b)}["']`));
  }
}

const extra = patterns.length
  ? lines(git("ls-files", "*.test.ts", "*.test.tsx", "*.test.mts"))
      .filter((t) => !changed.includes(t) && existsSync(t))
      .filter((t) => {
        const src = readFileSync(t, "utf8");
        return patterns.some((p) => p.test(src));
      })
  : [];

const targets = [...code, ...extra];
if (targets.length === 0) {
  console.log("test-related: nada no diff liga a testes; testes pulados.");
  process.exit(0);
}

console.log(
  `test-related: ${code.length} arquivo(s) de código alterado(s) desde ${from.slice(0, 8)}` +
    (extra.length ? `, mais ${extra.length} teste(s) por import() dinâmico ou leitura de arquivo.` : "."),
);
const args = process.argv.slice(2);
if (args.includes("--list")) {
  console.log(targets.join("\n"));
  process.exit(0);
}
const r = spawnSync("npx", ["vitest", "related", "--run", "--passWithNoTests", ...args, ...targets], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(r.status ?? 1);
