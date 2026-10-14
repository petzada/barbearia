import type { Page } from '@playwright/test'
import { expect, test } from './helpers/teste'
import {
  ehMobile,
  entrarComo,
  semViolacoesDeAcessibilidade,
  alvosPequenos,
  type Papel,
} from './helpers/sessao'

const MENU_ADMIN = [
  'Painel',
  'Clientes',
  'Agenda',
  'Equipe',
  'Serviços',
  'Planos',
  'Jornadas',
  'Financeiro',
  'Comissões',
  'Correções',
  'Configurações',
  'Suporte',
  'Privacidade',
]

async function abas(page: Page, nome: string): Promise<string[]> {
  const nav = page.getByRole('navigation', { name: nome })
  await expect(nav).toBeVisible()
  return nav.getByRole('link').allInnerTexts()
}

test.describe('visitante (PRD §4.2)', () => {
  test('barra pública: Planos · Serviços · Barbeiros · Entrar, e cada aba abre sua tela', async ({
    page,
  }) => {
    await page.goto('/planos')
    expect(await abas(page, 'Navegação pública')).toEqual([
      'Planos',
      'Serviços',
      'Barbeiros',
      'Entrar',
    ])
    await expect(page.getByRole('link', { name: 'Planos' })).toHaveAttribute('aria-current', 'page')

    for (const [aba, titulo, url] of [
      ['Serviços', 'Serviços', /\/servicos$/],
      ['Barbeiros', 'Barbeiros', /\/barbeiros$/],
      ['Entrar', 'Entrar', /\/entrar$/],
    ] as const) {
      await page
        .getByRole('navigation', { name: 'Navegação pública' })
        .getByRole('link', { name: aba })
        .click()
      await expect(page).toHaveURL(url)
      await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible()
    }
  })

  test('endereço público desconhecido mostra "não encontrada"', async ({ page }) => {
    await page.goto('/nao-existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })
})

const CASOS_DE_ABAS: Array<{
  descricao: string
  papeis: Papel[]
  inicio: RegExp
  nav: string
  abas: string[]
}> = [
  {
    descricao: 'cliente: Início · Agendar · Plano · Perfil',
    papeis: ['cliente'],
    inicio: /\/app$/,
    nav: 'Navegação do cliente',
    abas: ['Início', 'Agendar', 'Plano', 'Perfil'],
  },
  {
    descricao: 'barbeiro: Agenda · Atendimentos · Ganhos · Perfil',
    papeis: ['barbeiro'],
    inicio: /\/equipe$/,
    nav: 'Navegação da equipe',
    abas: ['Agenda', 'Atendimentos', 'Ganhos', 'Perfil'],
  },
  {
    descricao: 'admin-barbeiro: abas de barbeiro + Gestão',
    papeis: ['barbeiro', 'admin'],
    inicio: /\/equipe$/,
    nav: 'Navegação da equipe',
    abas: ['Agenda', 'Atendimentos', 'Ganhos', 'Gestão', 'Perfil'],
  },
  {
    descricao: 'admin que não é barbeiro: Agenda · Atendimentos · Gestão · Perfil',
    papeis: ['admin'],
    inicio: /\/equipe$/,
    nav: 'Navegação da equipe',
    abas: ['Agenda', 'Atendimentos', 'Gestão', 'Perfil'],
  },
]

test.describe('abas por papel, com sessões de teste (PRD §4.2, D0047)', () => {
  for (const caso of CASOS_DE_ABAS) {
    test(caso.descricao, async ({ page, context, baseURL }) => {
      await entrarComo(context, caso.papeis, baseURL!)
      await page.goto('/')
      await expect(page).toHaveURL(caso.inicio)
      expect(await abas(page, caso.nav)).toEqual(caso.abas)

      // Cada aba é navegável e marca a atual.
      const nav = page.getByRole('navigation', { name: caso.nav })
      for (const aba of caso.abas.slice(1)) {
        await nav.getByRole('link', { name: aba }).click()
        await expect(nav.getByRole('link', { name: aba })).toHaveAttribute('aria-current', 'page')
        await expect(page.getByRole('heading', { level: 1, name: aba })).toBeVisible()
      }
      await nav.getByRole('link', { name: caso.abas[0]! }).click()
      await expect(nav.getByRole('link', { name: caso.abas[0]! })).toHaveAttribute(
        'aria-current',
        'page',
      )
    })
  }

  test('o papel de cliente não mostra aba de equipe nem aba de gestão', async ({
    page,
    context,
    baseURL,
  }) => {
    await entrarComo(context, ['cliente'], baseURL!)
    await page.goto('/app')
    const textos = await abas(page, 'Navegação do cliente')
    expect(textos).not.toContain('Gestão')
    expect(textos).not.toContain('Ganhos')
    await expect(page.getByRole('navigation', { name: 'Alternar contexto' })).toHaveCount(0)
  })

  test('papéis combinados alternam Cliente ↔ Equipe na mesma conta', async ({
    page,
    context,
    baseURL,
  }) => {
    await entrarComo(context, ['cliente', 'barbeiro'], baseURL!)
    await page.goto('/app')
    const troca = page.getByRole('navigation', { name: 'Alternar contexto' })
    await expect(troca.getByRole('link', { name: 'Cliente' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await troca.getByRole('link', { name: 'Equipe' }).click()
    await expect(page).toHaveURL(/\/equipe$/)
    expect(await abas(page, 'Navegação da equipe')).toEqual([
      'Agenda',
      'Atendimentos',
      'Ganhos',
      'Perfil',
    ])
    await expect(troca.getByRole('link', { name: 'Equipe' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    await troca.getByRole('link', { name: 'Cliente' }).click()
    await expect(page).toHaveURL(/\/app$/)
    expect(await abas(page, 'Navegação do cliente')).toEqual([
      'Início',
      'Agendar',
      'Plano',
      'Perfil',
    ])
  })

  test('botão de notificações só nas telas iniciais, com rótulo acessível', async ({
    page,
    context,
    baseURL,
  }) => {
    await entrarComo(context, ['cliente'], baseURL!)
    await page.goto('/app')
    await expect(page.getByRole('link', { name: 'Notificações' })).toBeVisible()
    await page
      .getByRole('navigation', { name: 'Navegação do cliente' })
      .getByRole('link', { name: 'Plano' })
      .click()
    await expect(page.getByRole('heading', { level: 1, name: 'Plano' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Notificações' })).toHaveCount(0)
  })
})

test.describe('guardas de rota só de UX (a segurança real é do servidor)', () => {
  test('sem sessão: vai ao login guardando o destino', async ({ page }) => {
    await page.goto('/app/plano')
    await expect(page).toHaveURL(/\/entrar\?destino=%2Fapp%2Fplano$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible()
  })

  test('sem sessão em /equipe e /admin também vai ao login com o destino', async ({ page }) => {
    await page.goto('/equipe/ganhos')
    await expect(page).toHaveURL(/\/entrar\?destino=%2Fequipe%2Fganhos$/)
    await page.goto('/admin/clientes')
    await expect(page).toHaveURL(/\/entrar\?destino=%2Fadmin%2Fclientes$/)
  })

  test('o destino guarda a query e continua só com caminho interno', async ({ page }) => {
    await page.goto('/app/reservas?aba=futuras')
    await expect(page).toHaveURL(/\/entrar\?destino=%2Fapp%2Freservas%3Faba%3Dfuturas$/)
  })

  test('cliente em /equipe volta ao app; equipe em /app vai à agenda', async ({
    page,
    context,
    baseURL,
  }) => {
    await entrarComo(context, ['cliente'], baseURL!)
    await page.goto('/equipe/ganhos')
    await expect(page).toHaveURL(/\/app$/)

    await context.clearCookies()
    await entrarComo(context, ['barbeiro'], baseURL!)
    await page.goto('/app/plano')
    await expect(page).toHaveURL(/\/equipe$/)
  })

  test('sem papel de admin, /admin mostra acesso negado em vez do backoffice', async ({
    page,
    context,
    baseURL,
  }) => {
    await entrarComo(context, ['barbeiro'], baseURL!)
    await page.goto('/admin')
    await expect(
      page.getByRole('alert').filter({ hasText: 'Você não tem acesso a esta tela' }),
    ).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Menu do backoffice' })).toHaveCount(0)
  })

  test('rota de esqueleto desconhecida dentro da área é "não encontrada"', async ({
    page,
    context,
    baseURL,
  }) => {
    await entrarComo(context, ['cliente'], baseURL!)
    await page.goto('/app/inexistente')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })
})

test.describe('backoffice /admin (D0047)', () => {
  test('no computador: menu lateral com as treze áreas, navegável por teclado', async ({
    page,
    context,
    baseURL,
  }) => {
    test.skip(ehMobile(page), 'cenário de computador')
    await entrarComo(context, ['admin'], baseURL!)
    await page.goto('/admin')

    const menu = page.getByRole('navigation', { name: 'Menu do backoffice' })
    await expect(menu).toBeVisible()
    expect(await menu.getByRole('link').allInnerTexts()).toEqual(MENU_ADMIN)
    await expect(menu.getByRole('link', { name: 'Painel' })).toHaveAttribute('aria-current', 'page')

    // Mouse: cada item abre sua área.
    for (const area of MENU_ADMIN.slice(1)) {
      await menu.getByRole('link', { name: area }).click()
      await expect(page.getByRole('heading', { level: 1, name: area })).toBeVisible()
      await expect(menu.getByRole('link', { name: area })).toHaveAttribute('aria-current', 'page')
    }
  })

  test('teclado: Tab chega ao link de salto e ao menu; Enter abre a área; o foco é visível', async ({
    page,
    context,
    baseURL,
  }) => {
    test.skip(ehMobile(page), 'cenário de computador')
    await entrarComo(context, ['admin'], baseURL!)
    await page.goto('/admin')
    await expect(page.getByRole('navigation', { name: 'Menu do backoffice' })).toBeVisible()

    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused()
    await page.keyboard.press('Tab')
    const primeiro = page
      .getByRole('navigation', { name: 'Menu do backoffice' })
      .getByRole('link', { name: 'Painel' })
    await expect(primeiro).toBeFocused()
    const contorno = await primeiro.evaluate((el) => getComputedStyle(el).outlineStyle)
    expect(contorno).not.toBe('none')

    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/admin\/clientes$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible()
  })

  test('no celular: aviso "Disponível no computador" com o caminho, sem menu lateral', async ({
    page,
    context,
    baseURL,
  }) => {
    test.skip(!ehMobile(page), 'cenário de celular')
    await entrarComo(context, ['admin'], baseURL!)
    await page.goto('/admin/financeiro')

    await expect(
      page.getByRole('heading', { level: 1, name: 'Disponível no computador' }),
    ).toBeVisible()
    await expect(page.getByText('/admin/financeiro', { exact: true })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Menu do backoffice' })).toHaveCount(0)
    // Alternativa no celular: o resumo de gestão do app (G01).
    await expect(page.getByRole('link', { name: 'Ver resumo da gestão no celular' })).toBeVisible()
  })

  test('no celular, todas as rotas /admin mostram o aviso', async ({ page, context, baseURL }) => {
    test.skip(!ehMobile(page), 'cenário de celular')
    await entrarComo(context, ['admin'], baseURL!)
    for (const caminho of ['/admin', '/admin/clientes', '/admin/configuracoes']) {
      await page.goto(caminho)
      await expect(
        page.getByRole('heading', { level: 1, name: 'Disponível no computador' }),
      ).toBeVisible()
      await expect(page.getByText(caminho, { exact: true })).toBeVisible()
    }
  })

  test('mudar a largura da janela troca entre menu e aviso', async ({ page, context, baseURL }) => {
    test.skip(ehMobile(page), 'parte de um viewport de computador')
    await entrarComo(context, ['admin'], baseURL!)
    await page.goto('/admin')
    await expect(page.getByRole('navigation', { name: 'Menu do backoffice' })).toBeVisible()
    await page.setViewportSize({ width: 600, height: 900 })
    await expect(
      page.getByRole('heading', { level: 1, name: 'Disponível no computador' }),
    ).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(page.getByRole('navigation', { name: 'Menu do backoffice' })).toBeVisible()
  })
})

test.describe('acessibilidade dos layouts (axe A/AA) e alvos de toque', () => {
  const PAGINAS: Array<{
    nome: string
    papeis: Papel[]
    caminho: string
    so?: 'mobile' | 'desktop'
  }> = [
    { nome: 'público', papeis: [], caminho: '/planos' },
    { nome: 'entrada', papeis: [], caminho: '/' },
    { nome: 'cliente', papeis: ['cliente'], caminho: '/app' },
    { nome: 'cliente combinado', papeis: ['cliente', 'barbeiro'], caminho: '/app/plano' },
    { nome: 'equipe', papeis: ['barbeiro', 'admin'], caminho: '/equipe' },
    { nome: 'backoffice', papeis: ['admin'], caminho: '/admin/clientes', so: 'desktop' },
    { nome: 'aviso do backoffice', papeis: ['admin'], caminho: '/admin', so: 'mobile' },
    { nome: 'acesso negado', papeis: ['barbeiro'], caminho: '/admin' },
  ]

  for (const p of PAGINAS) {
    test(`${p.nome}: sem violações e com alvos ≥ 44 px`, async ({ page, context, baseURL }) => {
      if (p.so === 'mobile') test.skip(!ehMobile(page), 'só no celular')
      if (p.so === 'desktop') test.skip(ehMobile(page), 'só no computador')
      if (p.nome === 'entrada') {
        // Visita que já viu as boas-vindas.
        await page.addInitScript(() => window.localStorage.setItem('barbearia:boas-vindas', '1'))
      }
      if (p.papeis.length > 0) await entrarComo(context, p.papeis, baseURL!)
      await page.goto(p.caminho)
      await expect(page.locator('h1, [role="alert"]').first()).toBeVisible()
      await semViolacoesDeAcessibilidade(page)
      expect(await alvosPequenos(page)).toEqual([])
    })
  }
})
