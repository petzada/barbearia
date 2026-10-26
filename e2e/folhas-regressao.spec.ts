import { expect, test, type Page } from "@playwright/test";
import { adminPhone, login } from "./lib/helpers";

/**
 * Regressão: depois de editar e salvar numa folha (com o teclado numérico do
 * preço aberto e fechado), a página precisa continuar interativa — sem trava
 * de rolagem nem bloqueio de cliques deixados por um modal desmontado.
 */
type PageLock = { html: string; body: string; pointer: string; inert: number };

/** Estilos que o modal altera ao travar a página (rolagem, cliques, inert). */
function pageLock(page: Page): Promise<PageLock> {
  return page.evaluate(() => {
    const style = (el: Element) => {
      const c = getComputedStyle(el);
      return `${c.overflowY}|${c.position}|${(el as HTMLElement).style.cssText}`;
    };
    return {
      html: style(document.documentElement),
      body: style(document.body),
      pointer: getComputedStyle(document.body).pointerEvents,
      inert: document.querySelectorAll("[inert], [data-base-ui-inert]").length,
    };
  });
}

async function expectUnlocked(page: Page, before: PageLock) {
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // A trava é solta num setTimeout(0) depois da animação de saída.
  await expect.poll(() => pageLock(page)).toEqual(before);
}

test.beforeEach(async ({ page }) => {
  await login(page, adminPhone(), "Admin Regressão");
});

test("Serviços: salvar após digitar o preço não trava a tela", async ({ page }) => {
  await page.goto("/admin/gestao/servicos");
  const before = await pageLock(page);
  await page.getByRole("button", { name: /^Corte\b/ }).first().click();
  const price = page.getByLabel("Preço");
  await price.click();
  await price.press("End");
  await page.keyboard.type("9");
  await price.blur();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Serviço atualizado.")).toBeVisible();
  await expectUnlocked(page, before);

  // Outra folha abre normalmente em seguida.
  await page.getByRole("button", { name: /^Barba\b/ }).first().click();
  await expect(page.getByRole("dialog", { name: "Editar serviço" })).toBeVisible();
  await page.getByRole("button", { name: "Fechar" }).click();
  await expectUnlocked(page, before);
});

test("Planos: salvar após digitar o preço não trava a tela", async ({ page }) => {
  await page.goto("/admin/gestao/planos");
  const before = await pageLock(page);
  await page.getByRole("listitem").filter({ hasText: "Black" }).getByRole("button", { name: "Editar" }).click();
  const price = page.getByLabel("Preço");
  await price.click();
  await price.press("End");
  await price.blur();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expectUnlocked(page, before);
  await page.getByRole("listitem").filter({ hasText: "Premium" }).getByRole("button", { name: "Editar" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
