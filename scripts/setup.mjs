#!/usr/bin/env node
// Terminal de configuração das chaves da Barbearia do Moura.
//
//   npm run setup               → menu interativo
//   npm run setup -- --from-env → lê as variáveis do ambiente (CI), sem perguntas
//
// Grava em .dev.vars (local, fora do git) e/ou envia como secrets do Worker
// na Cloudflare (`wrangler secret bulk`). Nunca imprime os valores secretos.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import {
  LOCAL_ONLY_KEYS,
  SECRET_KEYS,
  generateSecret,
  maskSecret,
  mergeEnv,
  normalizePhoneList,
  parseEnvFile,
  serializeEnv,
  webhookUrls,
} from "./lib/env-file.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEV_VARS = path.join(ROOT, ".dev.vars");
const PROD_URL_KEY = "PRODUCTION_APP_BASE_URL";
const args = new Set(process.argv.slice(2));

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  teal: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  ok: (s) => `\x1b[32m${s}\x1b[0m`,
  warn: (s) => `\x1b[33m${s}\x1b[0m`,
};

function loadLocal() {
  return existsSync(DEV_VARS) ? parseEnvFile(readFileSync(DEV_VARS, "utf8")) : new Map();
}

// --- Entrada no terminal (texto e oculto) -----------------------------------

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
let muted = false;
rl._writeToOutput = function writeToOutput(text) {
  if (!muted) rl.output.write(text);
  else if (text.includes("\n")) rl.output.write("\n");
};

function ask(question, fallback = "") {
  const hint = fallback ? c.dim(` [${fallback}]`) : "";
  return new Promise((resolve) =>
    rl.question(`${question}${hint}: `, (answer) => resolve(answer.trim() || fallback)),
  );
}

/** Pergunta escondendo a digitação; Enter vazio mantém o valor atual. */
function askSecret(question, current) {
  const hint = current ? c.dim(` [atual ${maskSecret(current)} — Enter mantém]`) : "";
  return new Promise((resolve) => {
    rl.output.write(`${question}${hint}: `);
    muted = true;
    rl.question("", (answer) => {
      muted = false;
      resolve(answer.trim() || current || "");
    });
  });
}

async function askYesNo(question, fallback = true) {
  const answer = (await ask(`${question} (s/n)`, fallback ? "s" : "n")).toLowerCase();
  return answer.startsWith("s") || answer.startsWith("y");
}

// --- Seções ------------------------------------------------------------------

async function sectionApp(env) {
  console.log(`\n${c.bold("App")}`);
  const local = await ask("URL local", env.get("APP_BASE_URL") || "http://localhost:3000");
  const prod = await ask(
    "URL de produção (ex.: https://barbearia-do-moura.<conta>.workers.dev)",
    env.get(PROD_URL_KEY) || "",
  );
  let admins = env.get("ADMIN_PHONE_NUMBERS") || "";
  for (;;) {
    const raw = await ask("WhatsApp dos admins (DDD + número, separados por vírgula)", admins);
    const parsed = normalizePhoneList(raw);
    if (parsed.ok) {
      admins = parsed.value;
      break;
    }
    console.log(c.warn(`  Número inválido: ${parsed.invalid}. Use DDD + número, ex.: 11987654321.`));
  }
  return {
    APP_BASE_URL: local,
    [PROD_URL_KEY]: prod,
    ADMIN_PHONE_NUMBERS: admins,
    BETTER_AUTH_SECRET: env.get("BETTER_AUTH_SECRET") || generateSecret(),
    CRON_SECRET: env.get("CRON_SECRET") || generateSecret(),
  };
}

async function sectionWhatsmiau(env) {
  console.log(`\n${c.bold("WhatsMiau")} ${c.dim("(login por código no WhatsApp e lembretes)")}`);
  return {
    WHATSMIAU_BASE_URL: await ask("URL da API", env.get("WHATSMIAU_BASE_URL") || "https://api.whatsmiau.dev"),
    WHATSMIAU_API_KEY: await askSecret("Chave da API (apikey)", env.get("WHATSMIAU_API_KEY")),
    WHATSMIAU_WEBHOOK_SECRET: env.get("WHATSMIAU_WEBHOOK_SECRET") || generateSecret(24),
  };
}

async function sectionAbacatePay(env) {
  console.log(`\n${c.bold("AbacatePay")} ${c.dim("(Pix e cartão do clube — checkout transparente)")}`);
  const mode = (await ask("Modo da chave: teste ou produção (t/p)", "t")).toLowerCase().startsWith("p") ? "produção" : "teste";
  console.log(c.dim(`  Use as chaves do modo ${mode} criadas em Integração no painel do AbacatePay.`));
  console.log(c.dim("  A chave pública (pk_…) e a chave da API precisam ser do MESMO modo."));
  const updates = {
    ABACATEPAY_API_KEY: await askSecret("Chave da API", env.get("ABACATEPAY_API_KEY")),
    ABACATEPAY_PUBLIC_KEY: await ask("Chave pública do cartão (pk_…)", env.get("ABACATEPAY_PUBLIC_KEY") || ""),
    ABACATEPAY_WEBHOOK_SECRET: env.get("ABACATEPAY_WEBHOOK_SECRET") || generateSecret(24),
  };
  if (await askYesNo("Configurar chave HMAC opcional da assinatura do webhook?", false)) {
    updates.ABACATEPAY_WEBHOOK_HMAC_KEY = await askSecret("Chave HMAC", env.get("ABACATEPAY_WEBHOOK_HMAC_KEY"));
  }
  return updates;
}

async function sectionGoogle(env) {
  console.log(`\n${c.bold("Google OAuth")} ${c.dim("(login secundário)")}`);
  return {
    GOOGLE_CLIENT_ID: await ask("Client ID", env.get("GOOGLE_CLIENT_ID") || ""),
    GOOGLE_CLIENT_SECRET: await askSecret("Client secret", env.get("GOOGLE_CLIENT_SECRET")),
  };
}

// --- Destinos ----------------------------------------------------------------

function wranglerAuthenticated() {
  const out = spawnSync("npx", ["wrangler", "whoami"], { cwd: ROOT, encoding: "utf8" });
  return out.status === 0 && !/not authenticated/i.test(`${out.stdout}${out.stderr}`);
}

function pushToCloudflare(env) {
  const payload = {};
  for (const key of SECRET_KEYS) {
    const value = key === "APP_BASE_URL" ? env.get(PROD_URL_KEY) || env.get(key) : env.get(key);
    if (value) payload[key] = value;
  }
  for (const key of LOCAL_ONLY_KEYS) delete payload[key];
  const file = path.join(tmpdir(), `barbearia-secrets-${process.pid}.json`);
  writeFileSync(file, JSON.stringify(payload), { mode: 0o600 });
  try {
    execFileSync("npx", ["wrangler", "secret", "bulk", file], { cwd: ROOT, stdio: "inherit" });
    return Object.keys(payload);
  } finally {
    unlinkSync(file);
  }
}

function printChecklist(env) {
  const prodBase = env.get(PROD_URL_KEY) || env.get("APP_BASE_URL");
  const local = webhookUrls(env.get("APP_BASE_URL"), env);
  const prod = webhookUrls(prodBase, env);
  console.log(`\n${c.bold("Checklist")}`);
  for (const key of ["WHATSMIAU_API_KEY", "ABACATEPAY_API_KEY", "ABACATEPAY_PUBLIC_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "ADMIN_PHONE_NUMBERS"]) {
    const value = env.get(key);
    console.log(`  ${value ? c.ok("✓") : c.warn("•")} ${key} ${c.dim(value ? (key === "ADMIN_PHONE_NUMBERS" ? "definido" : maskSecret(value)) : "pendente")}`);
  }
  console.log(`\n${c.bold("Cole nos painéis externos")} ${c.dim("(contêm segredos — não compartilhe)")}`);
  if (prod.whatsmiau) console.log(`  WhatsMiau → webhook connection.update:\n    ${c.teal(prod.whatsmiau)}`);
  if (prod.abacatepay) console.log(`  AbacatePay → Webhooks (eventos transparent.completed, .refunded, .disputed e .lost):\n    ${c.teal(prod.abacatepay)}`);
  console.log(`  Google Cloud → URIs de redirecionamento autorizados:\n    ${c.teal(local.googleRedirect)}\n    ${c.teal(prod.googleRedirect)}`);
}

// --- Fluxos ------------------------------------------------------------------

async function interactive() {
  let env = loadLocal();
  console.log(c.bold("\nBarbearia do Moura · configuração de chaves"));
  console.log(c.dim("Os valores ficam no .dev.vars (fora do git) e/ou nos secrets do Worker na Cloudflare.\n"));
  const sections = [
    ["1", "App (URLs e admins)", sectionApp],
    ["2", "WhatsMiau", sectionWhatsmiau],
    ["3", "AbacatePay", sectionAbacatePay],
    ["4", "Google OAuth", sectionGoogle],
  ];
  for (;;) {
    sections.forEach(([k, label]) => console.log(`  ${k}. ${label}`));
    console.log("  5. Tudo (1–4)\n  0. Salvar e sair");
    const choice = await ask("Opção", "5");
    if (choice === "0") break;
    const chosen = choice === "5" ? sections : sections.filter(([k]) => k === choice);
    if (chosen.length === 0) continue;
    for (const [, , run] of chosen) env = mergeEnv(env, await run(env));
    if (choice === "5") break;
  }
  if (!env.get("BETTER_AUTH_SECRET")) env = mergeEnv(env, { BETTER_AUTH_SECRET: generateSecret() });
  if (!env.get("CRON_SECRET")) env = mergeEnv(env, { CRON_SECRET: generateSecret() });

  console.log(`\n${c.bold("Onde salvar?")}\n  1. Local (.dev.vars)\n  2. Produção (secrets na Cloudflare)\n  3. Os dois`);
  const target = await ask("Destino", "1");
  if (target === "1" || target === "3") {
    writeFileSync(DEV_VARS, serializeEnv(env), { mode: 0o600 });
    console.log(c.ok(`✓ .dev.vars atualizado (${env.size} variáveis)`));
  }
  if (target === "2" || target === "3") {
    if (!wranglerAuthenticated()) {
      console.log(c.warn("! O wrangler não está autenticado. Rode `npx wrangler login` e depois `npm run setup` de novo."));
    } else {
      const sent = pushToCloudflare(env);
      console.log(c.ok(`✓ ${sent.length} secrets enviados para o Worker.`));
    }
  }
  printChecklist(env);
  rl.close();
}

function fromEnv() {
  let env = loadLocal();
  const updates = {};
  for (const key of [...SECRET_KEYS, PROD_URL_KEY, ...LOCAL_ONLY_KEYS]) {
    if (process.env[key]) updates[key] = process.env[key];
  }
  if (updates.ADMIN_PHONE_NUMBERS) {
    const parsed = normalizePhoneList(updates.ADMIN_PHONE_NUMBERS);
    if (!parsed.ok) throw new Error(`ADMIN_PHONE_NUMBERS inválido: ${parsed.invalid}`);
    updates.ADMIN_PHONE_NUMBERS = parsed.value;
  }
  env = mergeEnv(env, updates);
  if (!env.get("BETTER_AUTH_SECRET")) env = mergeEnv(env, { BETTER_AUTH_SECRET: generateSecret() });
  if (!env.get("CRON_SECRET")) env = mergeEnv(env, { CRON_SECRET: generateSecret() });
  if (!args.has("--production-only")) {
    writeFileSync(DEV_VARS, serializeEnv(env), { mode: 0o600 });
    console.log(`✓ .dev.vars atualizado (${env.size} variáveis)`);
  }
  if (args.has("--production") || args.has("--production-only")) {
    if (!wranglerAuthenticated()) throw new Error("wrangler não autenticado (defina CLOUDFLARE_API_TOKEN).");
    console.log(`✓ ${pushToCloudflare(env).length} secrets enviados para o Worker.`);
  }
  rl.close();
}

if (args.has("--from-env")) fromEnv();
else await interactive();
