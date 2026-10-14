import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { expect, test } from './helpers/teste'
import { ehMobile, entrarComo, type Papel } from './helpers/sessao'

// Evidência visual do relatório (PRD §11.5): só roda com PRINTS_DIR definido, para não pesar na suíte.
// Ex.: PRINTS_DIR=../T05-prints pnpm test:e2e prints
const pasta = process.env['PRINTS_DIR']
test.skip(!pasta, 'defina PRINTS_DIR para gerar os prints')

const SECOES = [
  'tokens',
  'botoes',
  'campos',
  'data-hora',
  'cartoes',
  'estados-consulta',
  'mutacao',
  'formatacao',
  'feedback',
  'backoffice',
  'navegacao',
]

test('catálogo /_dev/ui: página inteira e cada seção', async ({ page }, info) => {
  const base = join(pasta!, info.project.name)
  mkdirSync(join(base, 'catalogo'), { recursive: true })
  await page.goto('/_dev/ui')
  await expect(page.getByRole('heading', { level: 1, name: 'Catálogo de interface' })).toBeVisible()
  await expect(page.locator('main[data-pronto="true"]')).toBeVisible()
  await page.screenshot({ path: join(base, 'catalogo', '00-pagina-inteira.png'), fullPage: true })
  for (const [i, id] of SECOES.entries()) {
    await page
      .locator(`[data-secao="${id}"]`)
      .screenshot({ path: join(base, 'catalogo', `${String(i + 1).padStart(2, '0')}-${id}.png`) })
  }

  // Estados de mutação e folha de confirmação, depois de interagir.
  const mut = page.locator('[data-secao="mutacao"]')
  for (const [arquivo, cenario] of [
    ['mutacao-conflito', 'Conflito'],
    ['mutacao-pendente', 'Pendente externa'],
    ['mutacao-validacao', 'Erro de validação'],
    ['mutacao-rede', 'Falha de rede'],
  ] as const) {
    await mut.getByLabel('Resultado simulado').selectOption({ label: cenario })
    await mut.getByRole('button', { name: 'Salvar' }).click()
    await expect(mut.getByRole('button', { name: 'Salvar' })).toBeVisible()
    await page.waitForTimeout(700)
    await mut.screenshot({ path: join(base, 'catalogo', `${arquivo}.png`) })
  }
  await page
    .locator('[data-secao="feedback"]')
    .getByRole('button', { name: 'Cancelar reserva…' })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.screenshot({ path: join(base, 'catalogo', 'confirmacao-com-consequencias.png') })
})

const TELAS: Array<{
  arquivo: string
  caminho: string
  papeis: Papel[]
  so?: 'mobile' | 'desktop'
  aguardar: RegExp
}> = [
  { arquivo: 'publico-entrada', caminho: '/', papeis: [], aguardar: /Barbearia/ },
  { arquivo: 'publico-planos', caminho: '/planos', papeis: [], aguardar: /Planos e benefícios/ },
  { arquivo: 'cliente-inicio', caminho: '/app', papeis: ['cliente'], aguardar: /Início/ },
  { arquivo: 'cliente-plano', caminho: '/app/plano', papeis: ['cliente'], aguardar: /Plano/ },
  {
    arquivo: 'cliente-e-equipe-alternancia',
    caminho: '/app',
    papeis: ['cliente', 'barbeiro'],
    aguardar: /Início/,
  },
  { arquivo: 'equipe-barbeiro', caminho: '/equipe', papeis: ['barbeiro'], aguardar: /Agenda/ },
  {
    arquivo: 'equipe-admin-barbeiro',
    caminho: '/equipe',
    papeis: ['barbeiro', 'admin'],
    aguardar: /Agenda/,
  },
  { arquivo: 'equipe-admin', caminho: '/equipe', papeis: ['admin'], aguardar: /Agenda/ },
  {
    arquivo: 'backoffice-painel',
    caminho: '/admin',
    papeis: ['admin'],
    so: 'desktop',
    aguardar: /Painel/,
  },
  {
    arquivo: 'backoffice-clientes',
    caminho: '/admin/clientes',
    papeis: ['admin'],
    so: 'desktop',
    aguardar: /Clientes/,
  },
  {
    arquivo: 'backoffice-aviso-no-celular',
    caminho: '/admin/financeiro',
    papeis: ['admin'],
    so: 'mobile',
    aguardar: /Disponível no computador/,
  },
  {
    arquivo: 'acesso-negado',
    caminho: '/admin',
    papeis: ['cliente'],
    aguardar: /Você não tem acesso/,
  },
]

for (const tela of TELAS) {
  test(`layout: ${tela.arquivo}`, async ({ page, context, baseURL }, info) => {
    if (tela.so === 'mobile') test.skip(!ehMobile(page), 'só no celular')
    if (tela.so === 'desktop') test.skip(ehMobile(page), 'só no computador')
    const base = join(pasta!, info.project.name, 'layouts')
    mkdirSync(base, { recursive: true })
    if (tela.papeis.length > 0) await entrarComo(context, tela.papeis, baseURL!)
    else await page.addInitScript(() => window.localStorage.setItem('barbearia:boas-vindas', '1'))
    await page.goto(tela.caminho)
    await expect(page.getByText(tela.aguardar).first()).toBeVisible()
    await page.screenshot({ path: join(base, `${tela.arquivo}.png`) })
  })
}

test('boas-vindas: três telas', async ({ page }, info) => {
  const base = join(pasta!, info.project.name, 'layouts')
  mkdirSync(base, { recursive: true })
  await page.goto('/')
  await expect(page).toHaveURL(/boas-vindas/)
  for (let i = 1; i <= 3; i++) {
    await page.waitForTimeout(150)
    await page.screenshot({ path: join(base, `boas-vindas-${i}.png`) })
    if (i < 3) await page.getByRole('button', { name: 'Próxima' }).click()
  }
})
