import type { Page } from '@playwright/test'
import { expect, test } from './helpers/teste'
import { defaultBrand } from '~/ui/brand/brand-config'
import { entrarComo, semViolacoesDeAcessibilidade } from './helpers/sessao'

const VERSAO = defaultBrand.boasVindas.versao
const CHAVE = 'barbearia:boas-vindas'

const lerMarca = (page: Page) => page.evaluate((k) => window.localStorage.getItem(k), CHAVE)

test.describe('boas-vindas (P01, D0048)', () => {
  test('primeira visita: aparecem, com "Pular" em todas as telas, e só uma vez', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/boas-vindas$/)
    const telas = defaultBrand.boasVindas.telas
    expect(telas.length).toBeGreaterThanOrEqual(2)

    for (let i = 0; i < telas.length; i++) {
      await expect(page.getByRole('heading', { level: 1, name: telas[i]!.titulo })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Pular' })).toBeVisible()
      if (i < telas.length - 1) await page.getByRole('button', { name: 'Próxima' }).click()
    }
    // Última tela oferece entrar ou ver os planos.
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ver planos' })).toBeVisible()

    await page.getByRole('button', { name: 'Pular' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1, name: defaultBrand.nome })).toBeVisible()
    expect(await lerMarca(page)).toBe(VERSAO)

    // Recarregar e voltar à entrada: nunca mais.
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: defaultBrand.nome })).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: defaultBrand.nome })).toBeVisible()
    await expect(page).not.toHaveURL(/boas-vindas/)
  })

  test('concluir pelo "Entrar" também marca como vista e leva ao login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/boas-vindas$/)
    const total = defaultBrand.boasVindas.telas.length
    for (let i = 0; i < total - 1; i++) await page.getByRole('button', { name: 'Próxima' }).click()
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/entrar$/)
    expect(await lerMarca(page)).toBe(VERSAO)
  })

  test('"Voltar" navega entre as telas sem perder o "Pular"', async ({ page }) => {
    await page.goto('/boas-vindas')
    await page.getByRole('button', { name: 'Próxima' }).click()
    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(
      page.getByRole('heading', { level: 1, name: defaultBrand.boasVindas.telas[0]!.titulo }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pular' })).toBeVisible()
  })

  test('nunca aparecem para quem está logado (vai direto ao seu contexto)', async ({
    page,
    context,
    baseURL,
  }) => {
    await entrarComo(context, ['cliente'], baseURL!)
    await page.goto('/')
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('navigation', { name: 'Navegação do cliente' })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: defaultBrand.boasVindas.telas[0]!.titulo }),
    ).toHaveCount(0)
    expect(await lerMarca(page)).toBeNull()
  })

  test('logado como equipe vai à agenda, também sem boas-vindas', async ({
    page,
    context,
    baseURL,
  }) => {
    await entrarComo(context, ['barbeiro'], baseURL!)
    await page.goto('/')
    await expect(page).toHaveURL(/\/equipe$/)
  })

  test('não aparecem quando a entrada é um deep link (nem ao passar pela entrada depois)', async ({
    page,
  }) => {
    await page.goto('/servicos')
    await expect(page.getByRole('heading', { level: 1, name: 'Serviços' })).toBeVisible()
    await expect(page).not.toHaveURL(/boas-vindas/)

    // Navegar até a entrada, dentro da mesma visita, também não dispara as boas-vindas.
    await page.getByRole('link', { name: defaultBrand.nome }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1, name: defaultBrand.nome })).toBeVisible()
    await expect(page).not.toHaveURL(/boas-vindas/)
    expect(await lerMarca(page)).toBeNull()
  })

  test('deep link que exige login vai ao login e preserva o destino, sem boas-vindas no caminho', async ({
    page,
  }) => {
    await page.goto('/app/reservas')
    await expect(page).toHaveURL(/\/entrar\?destino=%2Fapp%2Freservas$/)
    await expect(page).not.toHaveURL(/boas-vindas/)
  })

  test('reaparecem uma vez quando a versão sobe', async ({ page }) => {
    // O aparelho viu uma versão antiga.
    await page.addInitScript(([chave]) => window.localStorage.setItem(chave!, '0'), [
      CHAVE,
    ] as const)
    await page.goto('/')
    await expect(page).toHaveURL(/\/boas-vindas$/)
    await page.getByRole('button', { name: 'Pular' }).click()
    expect(await lerMarca(page)).toBe(VERSAO)
  })

  test('versão igual à atual não reaparece', async ({ page }) => {
    await page.addInitScript(([chave, versao]) => window.localStorage.setItem(chave!, versao!), [
      CHAVE,
      VERSAO,
    ] as const)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: defaultBrand.nome })).toBeVisible()
    await expect(page).not.toHaveURL(/boas-vindas/)
  })

  test('funciona sem localStorage (navegação privada): mostra, deixa pular e não entra em loop', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('bloqueado', 'SecurityError')
        },
      })
    })
    await page.goto('/')
    await expect(page).toHaveURL(/\/boas-vindas$/)
    await page.getByRole('button', { name: 'Pular' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1, name: defaultBrand.nome })).toBeVisible()
    await expect(page).not.toHaveURL(/boas-vindas/)
  })

  test('revisão: a página das boas-vindas continua abrindo depois (Como funciona)', async ({
    page,
  }) => {
    await page.goto('/boas-vindas')
    await expect(
      page.getByRole('heading', { level: 1, name: defaultBrand.boasVindas.telas[0]!.titulo }),
    ).toBeVisible()
  })

  test('acessibilidade: sem violações WCAG A/AA nas boas-vindas e na entrada', async ({ page }) => {
    await page.goto('/boas-vindas')
    await expect(page.getByRole('button', { name: 'Pular' })).toBeVisible()
    await semViolacoesDeAcessibilidade(page)

    await page.getByRole('button', { name: 'Pular' }).click()
    await expect(page.getByRole('heading', { level: 1, name: defaultBrand.nome })).toBeVisible()
    await semViolacoesDeAcessibilidade(page)
  })
})
