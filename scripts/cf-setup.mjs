#!/usr/bin/env node
// Provisiona a infraestrutura da Barbearia do Moura na Cloudflare (idempotente).
//
//   npm run cf:setup              → cria/reaproveita D1 e R2, grava o database_id,
//                                   aplica as migrations remotas e gera os tipos
//   npm run cf:setup -- --dry-run → só mostra o que seria feito
//
// Requer `npx wrangler login` (ou CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID).

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findD1, hasR2Bucket, readD1DatabaseId, setD1DatabaseId } from "./lib/jsonc.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRANGLER = path.join(ROOT, "wrangler.jsonc");
const D1_NAME = "barbearia-do-moura";
const R2_NAME = "barbearia-do-moura-media";
const dryRun = process.argv.includes("--dry-run");

function wrangler(args, { capture = true } = {}) {
  const printable = `npx wrangler ${args.join(" ")}`;
  if (dryRun) {
    console.log(`  [dry-run] ${printable}`);
    return { status: 0, stdout: "", stderr: "" };
  }
  console.log(`  $ ${printable}`);
  const out = spawnSync("npx", ["wrangler", ...args], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  return { status: out.status ?? 1, stdout: out.stdout ?? "", stderr: out.stderr ?? "" };
}

function fail(message, detail = "") {
  console.error(`\n✗ ${message}${detail ? `\n${detail}` : ""}`);
  process.exit(1);
}

console.log(`Barbearia do Moura · Cloudflare${dryRun ? " (dry-run)" : ""}\n`);

// 1. Autenticação
const who = wrangler(["whoami"]);
if (!dryRun && (who.status !== 0 || /not authenticated/i.test(who.stdout + who.stderr))) {
  fail("wrangler não autenticado.", "Rode `npx wrangler login` ou defina CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID.");
}

// 2. D1 (reaproveita se já existir)
console.log("D1");
let wranglerText = readFileSync(WRANGLER, "utf8");
let databaseId = readD1DatabaseId(wranglerText);
const list = wrangler(["d1", "list", "--json"]);
const existing = dryRun ? null : findD1(JSON.parse(list.stdout || "[]"), D1_NAME);
if (existing) {
  console.log(`  ✓ reaproveitando "${D1_NAME}" (${existing})`);
  databaseId = existing;
} else if (!dryRun) {
  const created = wrangler(["d1", "create", D1_NAME]);
  if (created.status !== 0) fail(`não foi possível criar o D1 "${D1_NAME}".`, created.stderr);
  databaseId = created.stdout.match(/"database_id"\s*:\s*"([0-9a-f-]{36})"/i)?.[1]
    ?? created.stdout.match(/database_id\s*=\s*"([0-9a-f-]{36})"/i)?.[1]
    ?? null;
  if (!databaseId) fail("D1 criado, mas o database_id não foi encontrado na saída.", created.stdout);
  console.log(`  ✓ criado "${D1_NAME}" (${databaseId})`);
} else if (databaseId) {
  console.log(`  [dry-run] reaproveitaria "${D1_NAME}" se existir (wrangler.jsonc aponta para ${databaseId})`);
} else {
  wrangler(["d1", "create", D1_NAME]);
}
if (databaseId && !dryRun) {
  const next = setD1DatabaseId(wranglerText, databaseId);
  if (next !== wranglerText) {
    writeFileSync(WRANGLER, next);
    wranglerText = next;
    console.log("  ✓ database_id gravado no wrangler.jsonc");
  }
}

// 3. R2 (reaproveita se já existir)
console.log("R2");
const buckets = wrangler(["r2", "bucket", "list"]);
if (!dryRun && hasR2Bucket(buckets.stdout, R2_NAME)) {
  console.log(`  ✓ reaproveitando bucket "${R2_NAME}"`);
} else {
  const created = wrangler(["r2", "bucket", "create", R2_NAME]);
  if (!dryRun && created.status !== 0 && !/already exists/i.test(created.stderr + created.stdout)) {
    fail(`não foi possível criar o bucket "${R2_NAME}".`, created.stderr);
  }
  if (!dryRun) console.log(`  ✓ bucket "${R2_NAME}" pronto`);
}

// 4. Migrations remotas + tipos
console.log("Migrations");
const migrate = wrangler(["d1", "migrations", "apply", "DB", "--remote"], { capture: false });
if (migrate.status !== 0) fail("falha ao aplicar as migrations no D1 remoto.");
const types = wrangler(["types", "--env-interface", "CloudflareEnv", "cloudflare-env.d.ts"], { capture: false });
if (types.status !== 0) fail("falha ao gerar os tipos (wrangler types).");

console.log(`\n✓ Infraestrutura pronta. Próximos passos:
  1. npm run setup        (chaves: WhatsMiau, AbacatePay, Google; destino Produção)
  2. npm run deploy`);
