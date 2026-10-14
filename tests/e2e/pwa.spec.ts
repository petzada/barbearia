import { expect, test } from './helpers/teste'

test.describe('PWA instalável', () => {
  test('a página declara manifest, cor do tema e ícone da tela inicial', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('barbearia:boas-vindas', '1'))
    await page.goto('/')
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      '/manifest.webmanifest',
    )
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      /^#[0-9a-f]{6}$/i,
    )
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      /apple-touch-icon\.png$/,
    )
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      /viewport-fit=cover/,
    )
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  })

  test('manifest servido é JSON válido, standalone, com ícones 192/512/maskable que baixam como PNG', async ({
    request,
  }) => {
    const resposta = await request.get('/manifest.webmanifest')
    expect(resposta.status()).toBe(200)
    const m = (await resposta.json()) as {
      name: string
      display: string
      start_url: string
      icons: Array<{ src: string; sizes: string; purpose?: string }>
    }
    expect(m.name).toBeTruthy()
    expect(m.display).toBe('standalone')
    expect(m.start_url).toBe('/')
    expect(m.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
    expect(m.icons.some((i) => i.purpose === 'maskable')).toBe(true)

    for (const icone of m.icons) {
      const r = await request.get(icone.src)
      expect(r.status(), icone.src).toBe(200)
      expect(r.headers()['content-type']).toContain('image/png')
    }
  })

  test('service worker e página offline são servidos', async ({ request }) => {
    const sw = await request.get('/sw.js')
    expect(sw.status()).toBe(200)
    expect(sw.headers()['content-type']).toMatch(/javascript/)
    const offline = await request.get('/offline.html')
    expect(offline.status()).toBe(200)
    expect(await offline.text()).toContain('Sem conexão')
  })

  test('em desenvolvimento o service worker não é registrado (não atrapalha o HMR)', async ({
    page,
  }) => {
    await page.goto('/planos')
    await expect(page.getByRole('heading', { level: 1, name: 'Planos e benefícios' })).toBeVisible()
    const registros = await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    )
    expect(registros).toBe(0)
  })
})
