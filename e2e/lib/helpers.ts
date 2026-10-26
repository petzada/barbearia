import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { parseEnvFile } from "../../scripts/lib/env-file.mjs";

/** Primeiro admin de ADMIN_PHONE_NUMBERS (.dev.vars) ou E2E_ADMIN_PHONE, sem o DDI. */
export function adminPhone(): string {
  const fromFile = existsSync(".dev.vars") ? parseEnvFile(readFileSync(".dev.vars", "utf8")).get("ADMIN_PHONE_NUMBERS") : undefined;
  const raw = (process.env.E2E_ADMIN_PHONE ?? fromFile ?? "").split(",")[0].replace(/\D/g, "");
  if (!raw) throw new Error("Defina ADMIN_PHONE_NUMBERS no .dev.vars (npm run setup) ou E2E_ADMIN_PHONE.");
  return raw.startsWith("55") && raw.length > 11 ? raw.slice(2) : raw;
}

/** SQL direto no D1 descartável do E2E (o mesmo que o `next dev` usa). */
export function d1(sql: string) {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "DB", "--local", "--persist-to", ".wrangler/e2e", "--command", sql],
    { stdio: "pipe" },
  );
}

/** Login por código no WhatsApp (AUTH_DEV_OTP) + onboarding (nome e aceite dos termos). */
export async function login(page: Page, phone: string, name: string) {
  await page.goto("/login");
  await page.getByLabel("WhatsApp").fill(phone);
  await page.getByRole("button", { name: "Receber código no WhatsApp" }).click();
  await expect(page.getByRole("heading", { name: "Digite o código" })).toBeVisible();
  await page.keyboard.type("123456");
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  // Conta já cadastrada (outro teste): pula o onboarding.
  if (!page.url().includes("/bem-vindo")) return;
  await page.getByLabel("Nome e sobrenome").fill(name);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Termos e privacidade" })).toBeVisible();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Concluir cadastro" }).click();
  await expect(page.getByRole("heading", { name: /Tudo pronto/ })).toBeVisible();
}
