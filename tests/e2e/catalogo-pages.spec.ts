import { expect, test } from './helpers/teste'
import { ehMobile, entrarComo } from './helpers/sessao'
import { prepararCatalogoE2E, type CatalogoE2E } from './helpers/catalogo'

let catalogo: CatalogoE2E

test.beforeAll(async () => {
  catalogo = await prepararCatalogoE2E()
})

test('serviços públicos mostram preço, duração e componentes do combo', async ({ page }) => {
  await page.goto('/servicos')
  await expect(page.getByRole('heading', { level: 1, name: 'Serviços' })).toBeVisible()
  await expect(page.getByRole('heading', { name: catalogo.servicoNome })).toBeVisible()
  await expect(page.getByRole('heading', { name: catalogo.comboNome })).toBeVisible()
  const combo = page
    .locator('section[aria-label="Serviços e combos"] > section')
    .filter({ has: page.getByRole('heading', { name: catalogo.comboNome }) })
  await expect(combo.getByText('Inclui')).toBeVisible()
  await expect(combo.getByText('R$ 90,00', { exact: true })).toBeVisible()
  await expect(combo.getByText('45 min', { exact: true })).toBeVisible()
  await expect(page.getByText(/horário|agenda/i)).toHaveCount(0)
})

test('barbeiros públicos exibem somente perfil e serviços habilitados', async ({ page }) => {
  await page.goto('/barbeiros')
  const perfil = page
    .locator('section[aria-label="Barbeiros da equipe"] > section')
    .filter({ has: page.getByRole('heading', { name: catalogo.barbeiroNome }) })
  await expect(perfil.getByRole('heading', { name: catalogo.barbeiroNome })).toBeVisible()
  await expect(perfil.getByText(catalogo.servicoNome, { exact: true })).toBeVisible()
  await expect(page.getByText(/percentual|comissão|telefone|whatsapp|horário/i)).toHaveCount(0)
})

test('admin cadastra serviço e mantém orientação sobre reservas futuras', async ({
  page,
  context,
  baseURL,
}) => {
  test.skip(ehMobile(page), 'cadastro administrativo só está disponível no computador')
  await entrarComo(context, ['admin'], baseURL!)
  await page.goto('/admin/servicos')
  await expect(page.getByRole('heading', { name: 'Serviços e combos' })).toBeVisible()

  const formulario = page.locator('form').first()
  await formulario.getByLabel('Tipo de cadastro').selectOption('simples')
  await formulario.getByLabel('Nome').fill(`Novo E2E ${Date.now()}`)
  await formulario.getByLabel('Preço').fill('47,00')
  await formulario.getByLabel('Duração em minutos').fill('35')
  await formulario.getByRole('button', { name: 'Salvar cadastro' }).click()
  await expect(
    page.getByText('A mudança de preço e duração vale só para novas reservas.').first(),
  ).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Serviço cadastrado' })).toBeVisible()
})

test('matriz admin mostra habilitação e cadastro de vigência', async ({
  page,
  context,
  baseURL,
}) => {
  test.skip(ehMobile(page), 'matriz administrativa só está disponível no computador')
  await entrarComo(context, ['admin'], baseURL!)
  await page.goto('/admin/equipe/matriz')
  await expect(page.getByRole('heading', { name: 'Matriz barbeiro × serviço' })).toBeVisible()
  const celula = page
    .locator('section[aria-label="Habilitações e comissões"] > section')
    .filter({ has: page.getByRole('heading', { name: catalogo.barbeiroNome }) })
    .filter({ hasText: catalogo.servicoNome })
  await expect(celula.getByRole('heading', { name: catalogo.barbeiroNome })).toBeVisible()
  await expect(celula.getByLabel(`Habilitado para ${catalogo.servicoNome}`)).toBeChecked()
  await expect(celula.getByLabel('Percentual avulso')).toHaveValue('35%')
  await expect(celula.getByLabel('Percentual assinante')).toHaveValue('35%')
  await expect(celula.getByLabel('Início da vigência')).toBeVisible()
})
