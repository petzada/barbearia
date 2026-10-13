import { expect, test } from '@playwright/test'

// Roda nos projetos `mobile` e `desktop` do playwright.config.ts.
test('abre a página inicial', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Barbearia' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
})
