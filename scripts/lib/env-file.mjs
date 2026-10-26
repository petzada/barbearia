// Helpers puros do terminal de configuração (sem dependências).
import { randomBytes } from "node:crypto";

/** Lê um arquivo KEY=valor (.dev.vars) preservando a ordem. */
export function parseEnvFile(text) {
  const entries = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    entries.set(key, value);
  }
  return entries;
}

/** Mescla valores novos: vazio/undefined mantém o atual. */
export function mergeEnv(current, updates) {
  const next = new Map(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null || value === "") continue;
    next.set(key, String(value));
  }
  return next;
}

const needsQuotes = (v) => /[\s#"']/.test(v);

/** Serializa com cabeçalho; aspas só quando necessário. */
export function serializeEnv(entries) {
  const lines = ["# Gerado por `npm run setup`. Não versionar (arquivo no .gitignore).", ""];
  for (const [key, value] of entries) {
    lines.push(`${key}=${needsQuotes(value) ? JSON.stringify(value) : value}`);
  }
  return `${lines.join("\n")}\n`;
}

/** Mostra só o começo e o fim de um segredo. */
export function maskSecret(value) {
  if (!value) return "(vazio)";
  if (value.length <= 8) return "•".repeat(value.length);
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

/** Telefone brasileiro → "55DDDNUMERO" (ou null se inválido). */
export function normalizeBrPhone(raw) {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (!/^55[1-9]\d(?:9\d{8}|\d{8})$/.test(digits)) return null;
  return digits;
}

/** Lista separada por vírgula, normalizada e sem repetição. */
export function normalizePhoneList(raw) {
  const out = [];
  for (const part of String(raw ?? "").split(/[,;\s]+/)) {
    if (!part) continue;
    const phone = normalizeBrPhone(part);
    if (!phone) return { ok: false, invalid: part };
    if (!out.includes(phone)) out.push(phone);
  }
  return { ok: true, value: out.join(",") };
}

export function generateSecret(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/** URLs para cadastrar nos painéis externos. */
export function webhookUrls(baseUrl, env) {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  return {
    whatsmiau: env.get("WHATSMIAU_WEBHOOK_SECRET")
      ? `${base}/api/webhooks/whatsmiau?secret=${encodeURIComponent(env.get("WHATSMIAU_WEBHOOK_SECRET"))}`
      : null,
    abacatepay: env.get("ABACATEPAY_WEBHOOK_SECRET")
      ? `${base}/api/webhooks/abacatepay?webhookSecret=${encodeURIComponent(env.get("ABACATEPAY_WEBHOOK_SECRET"))}`
      : null,
    googleRedirect: `${base}/api/auth/callback/google`,
  };
}

/** Chaves que vão como secret na Cloudflare (o resto é var pública no wrangler.jsonc). */
export const SECRET_KEYS = [
  "BETTER_AUTH_SECRET",
  "CRON_SECRET",
  "ADMIN_PHONE_NUMBERS",
  "APP_BASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "WHATSMIAU_BASE_URL",
  "WHATSMIAU_API_KEY",
  "WHATSMIAU_WEBHOOK_SECRET",
  "ABACATEPAY_API_KEY",
  "ABACATEPAY_WEBHOOK_SECRET",
  "ABACATEPAY_WEBHOOK_HMAC_KEY",
];

/** Só desenvolvimento local — nunca enviado para produção. */
export const LOCAL_ONLY_KEYS = ["AUTH_DEV_OTP"];
