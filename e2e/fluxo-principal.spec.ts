import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { parseEnvFile } from "../scripts/lib/env-file.mjs";

/** Primeiro admin de ADMIN_PHONE_NUMBERS (.dev.vars) ou E2E_ADMIN_PHONE, sem o DDI. */
function adminPhone(): string {
  const fromFile = existsSync(".dev.vars") ? parseEnvFile(readFileSync(".dev.vars", "utf8")).get("ADMIN_PHONE_NUMBERS") : undefined;
  const raw = (process.env.E2E_ADMIN_PHONE ?? fromFile ?? "").split(",")[0].replace(/\D/g, "");
  if (!raw) throw new Error("Defina ADMIN_PHONE_NUMBERS no .dev.vars (npm run setup) ou E2E_ADMIN_PHONE.");
  return raw.startsWith("55") && raw.length > 11 ? raw.slice(2) : raw;
}

const ADMIN_PHONE = adminPhone();
const CLIENT_PHONE = "11988887777";
const SERVICE = "Degradê E2E";
// Intl separa "R$" do valor com espaço não separável.
const PRICE = /R\$\s50,00/;

const STAFF_PAGES = [
  "/barbeiro",
  "/barbeiro/agenda",
  "/barbeiro/bloqueios",
  "/barbeiro/ganhos",
  "/admin",
  "/admin/financeiro?aba=recebimentos",
  "/admin/financeiro?aba=comissoes",
  "/admin/agenda",
  "/admin/clube",
  "/admin/gestao",
  "/admin/gestao/servicos",
  "/admin/gestao/equipe",
  "/admin/gestao/horarios",
  "/admin/gestao/planos",
  "/admin/gestao/avaliacoes",
  "/admin/gestao/whatsapp",
];

/** SQL direto no D1 descartável do E2E (o mesmo que o `next dev` usa). */
function d1(sql: string) {
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "DB", "--local", "--persist-to", ".wrangler/e2e", "--command", sql],
    { stdio: "pipe" },
  );
}

/** Login por código no WhatsApp (AUTH_DEV_OTP) + onboarding (nome e aceite dos termos). */
async function login(page: Page, phone: string, name: string) {
  await page.goto("/login");
  await page.getByLabel("WhatsApp").fill(phone);
  await page.getByRole("button", { name: "Receber código no WhatsApp" }).click();
  await expect(page.getByRole("heading", { name: "Digite o código" })).toBeVisible();
  await page.keyboard.type("123456");
  await page.waitForURL("**/bem-vindo");
  await page.getByLabel("Nome e sobrenome").fill(name);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Termos e privacidade" })).toBeVisible();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Concluir cadastro" }).click();
  await expect(page.getByRole("heading", { name: /Tudo pronto/ })).toBeVisible();
}

test("landing mostra a barbearia e o caminho para agendar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Barbearia do Moura");
  await expect(page.getByRole("link", { name: "Agendar horário" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Já tenho conta" })).toBeVisible();
  // Planos fixos do Clube (seed da migration 0004).
  for (const plan of ["Black", "Gold Limitado", "Premium"]) {
    await expect(page.getByRole("heading", { name: plan, level: 2 })).toBeVisible();
  }
  await expect(page.getByText(/4 por mês · terças e quartas/i)).toBeVisible();
});

test("gestão cria serviço, cliente agenda, barbeiro conclui e o faturamento aparece", async ({ browser }) => {
  const adminContext = await browser.newContext(test.info().project.use);
  const admin = await adminContext.newPage();

  await test.step("admin entra pelo WhatsApp e abre o hub de gestão", async () => {
    await login(admin, ADMIN_PHONE, "Moura Admin");
    await admin.getByRole("link", { name: "Ir para o início" }).click();
    await admin.waitForURL("**/admin");
    await expect(admin.getByRole("heading", { name: "Painel", level: 1 })).toBeVisible();
    await admin.goto("/admin/gestao");
    await expect(admin.getByRole("heading", { name: "Gestão", level: 1 })).toBeVisible();
  });

  await test.step("admin cadastra um serviço", async () => {
    await admin.getByRole("link", { name: /^Serviços/ }).click();
    await admin.getByRole("button", { name: "Novo serviço" }).click();
    const sheet = admin.getByRole("dialog", { name: "Novo serviço" });
    await sheet.getByLabel("Nome").fill(SERVICE);
    await sheet.getByRole("button", { name: "45 min" }).click();
    await sheet.getByLabel("Preço").click();
    await admin.keyboard.type("5000");
    await expect(sheet.getByLabel("Preço")).toHaveValue(PRICE);
    await sheet.getByRole("button", { name: "Criar serviço" }).click();
    await expect(sheet).toBeHidden();
    await expect(admin.getByRole("button", { name: new RegExp(`^${SERVICE} 45 min · R\\$\\s50,00`) })).toBeVisible();
  });

  const clientContext = await browser.newContext(test.info().project.use);
  const client = await clientContext.newPage();

  await test.step("cliente agenda pagando na barbearia", async () => {
    await login(client, CLIENT_PHONE, "Carlos Cliente");
    await client.getByRole("link", { name: "Agendar meu primeiro horário" }).click();
    // Um único barbeiro: a etapa de barbeiro é pulada.
    await client.getByRole("button", { name: new RegExp(`^${SERVICE}`) }).click();
    await expect(client.getByRole("heading", { name: "Quando você quer vir?" })).toBeVisible();
    await client.locator("main").getByRole("button", { name: /^\d\d:\d\d$/ }).first().click();
    const sheet = client.getByRole("dialog", { name: "Confirme seu horário" });
    await expect(sheet.getByRole("radio", { name: /Pagar na barbearia/ })).toBeChecked();
    await sheet.getByRole("button", { name: /^Confirmar · R\$\s50,00$/ }).click();
    await client.waitForURL(/\/agendamentos\/[^/]+\/confirmado/);
  });

  // O atendimento só pode ser concluído depois do início: traz o horário para agora.
  const now = Date.now();
  d1(
    `UPDATE schedule_entries SET starts_at = ${now - 60_000}, ends_at = ${now + 44 * 60_000} ` +
      `WHERE type = 'appointment' AND status = 'booked'`,
  );

  await test.step("barbeiro conclui o atendimento no Hoje", async () => {
    await admin.goto("/barbeiro");
    await admin.getByRole("button", { name: /Carlos Cliente/ }).click();
    const sheet = admin.getByRole("dialog");
    await sheet.getByRole("button", { name: "Concluir" }).click();
    await expect(admin.getByText(/Atendimento concluído/)).toBeVisible();
  });

  await test.step("admin vê o faturamento do dia", async () => {
    await admin.goto("/admin?periodo=hoje");
    await expect(admin.getByRole("region", { name: "Indicadores do período" })).toContainText(PRICE);
    await admin.goto("/admin/financeiro?periodo=hoje");
    await expect(admin.locator("main")).toContainText(PRICE);
  });

  await test.step("todas as telas de barbeiro e gestão abrem sem erro", async () => {
    const errors: string[] = [];
    admin.on("pageerror", (error) => errors.push(error.message));
    for (const path of STAFF_PAGES) {
      const response = await admin.goto(path);
      expect(response?.status(), path).toBeLessThan(400);
      await expect(admin.getByRole("heading", { level: 1 }).first(), path).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  await adminContext.close();
  await clientContext.close();
});
