import type { Page } from '@playwright/test'
import { expect, test } from './helpers/teste'
import { alvosPequenos, semViolacoesDeAcessibilidade } from './helpers/sessao'

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

async function abrir(page: Page) {
  await page.goto('/_dev/ui')
  await expect(page.getByRole('heading', { level: 1, name: 'Catálogo de interface' })).toBeVisible()
  // O catálogo carrega por lazy: espera os handlers existirem (ver src/ui/catalog/Catalog.tsx).
  await expect(page.locator('main[data-pronto="true"]')).toBeVisible()
}

const secao = (page: Page, id: string) => page.locator(`[data-secao="${id}"]`)

test.describe('catálogo /_dev/ui', () => {
  test('mostra todas as seções de componentes e estados', async ({ page }) => {
    await abrir(page)
    for (const id of SECOES) await expect(secao(page, id), id).toBeVisible()
  })

  test('acessibilidade: sem violações WCAG A/AA e alvos de toque ≥ 44 px', async ({ page }) => {
    await abrir(page)
    await semViolacoesDeAcessibilidade(page)
    expect(await alvosPequenos(page)).toEqual([])
  })

  test('estados de consulta: carregando, vazio com ação, erro com tentar de novo, acesso negado', async ({
    page,
  }) => {
    await abrir(page)
    const s = secao(page, 'estados-consulta')
    await expect(s.getByRole('status').first()).toContainText('Carregando')
    await expect(s.getByRole('button', { name: 'Agendar agora' })).toBeVisible()
    await expect(s.getByRole('alert').filter({ hasText: 'Você não tem acesso' })).toBeVisible()

    await s.getByRole('button', { name: 'Tentar de novo' }).dblclick()
    await expect(s.getByTestId('tentativas')).toHaveText('1')
    await expect(s.getByText('Código de suporte')).toBeVisible()
  })

  test('botão: duplo clique processa uma vez só', async ({ page }) => {
    await abrir(page)
    const s = secao(page, 'botoes')
    await s.getByRole('button', { name: 'Enviar lento' }).dblclick()
    await expect(s.getByRole('button', { name: 'Enviando…' }).last()).toBeVisible()
    await expect(s.getByTestId('cliques-processados')).toHaveText('1')
    await page.waitForTimeout(300)
    await expect(s.getByTestId('cliques-processados')).toHaveText('1')
    await expect(s.getByRole('button', { name: 'Enviar lento' })).toBeVisible()
  })

  test.describe('estados de mutação', () => {
    async function enviar(page: Page, cenario: string) {
      await abrir(page)
      const s = secao(page, 'mutacao')
      await s.getByLabel('Resultado simulado').selectOption({ label: cenario })
      await s.getByRole('button', { name: 'Salvar' }).click()
      return s
    }

    test('enviando: botão bloqueado e anunciado; duplo envio vira uma chamada', async ({
      page,
    }) => {
      await abrir(page)
      const s = secao(page, 'mutacao')
      await s.getByRole('button', { name: 'Salvar' }).dblclick()
      await expect(s.getByRole('button', { name: 'Salvando…' })).toHaveAttribute(
        'aria-busy',
        'true',
      )
      await expect(s.getByText('Confirmado pelo servidor: OK-001')).toBeVisible()
      await expect(s.getByTestId('mut-chamadas')).toHaveText('1')
    })

    test('confirmada só depois do servidor', async ({ page }) => {
      const s = await enviar(page, 'Confirmado')
      await expect(s.getByText('Confirmado pelo servidor')).toHaveCount(0)
      await expect(s.getByText('Confirmado pelo servidor: OK-001')).toBeVisible()
    })

    test('pendente externa: protocolo e próximos passos, sem sucesso', async ({ page }) => {
      const s = await enviar(page, 'Pendente externa')
      await expect(s.getByText('PROT-2026-0001')).toBeVisible()
      await expect(s.getByText('Estamos aguardando a confirmação do banco.')).toBeVisible()
      await expect(s.getByText('Confirmado pelo servidor')).toHaveCount(0)
      // Próxima atualização no fuso da loja: 15:30Z = 12:30 em São Paulo.
      await expect(s.getByText(/12:30/)).toBeVisible()
    })

    test('conflito: alternativas reais e escolha aplica a alternativa', async ({ page }) => {
      const s = await enviar(page, 'Conflito')
      await expect(s.getByText('Este horário não está mais disponível.')).toBeVisible()
      await s.getByRole('button', { name: 'Amanhã às 10:00' }).click()
      await expect(s.getByLabel('Nome', { exact: true })).toHaveValue('Ana (10:00)')
    })

    test('erro de validação: mensagem no campo e entrada preservada', async ({ page }) => {
      await abrir(page)
      const s = secao(page, 'mutacao')
      await s.getByLabel('Resultado simulado').selectOption({ label: 'Erro de validação' })
      await s.getByLabel('Nome', { exact: true }).fill('Zé')
      await s.getByRole('button', { name: 'Salvar' }).click()
      await expect(s.getByText('O nome precisa ter ao menos 3 letras.')).toBeVisible()
      await expect(s.getByLabel('Nome', { exact: true })).toHaveValue('Zé')
      await expect(s.getByLabel('Nome', { exact: true })).toHaveAttribute('aria-invalid', 'true')
      await expect(s.getByText('Suas informações foram mantidas.')).toBeVisible()
    })

    test('falha de rede: mensagem segura e tentar de novo reaproveita a chave', async ({
      page,
    }) => {
      const s = await enviar(page, 'Falha de rede')
      await expect(s.getByText(/Não foi possível falar com o servidor/)).toBeVisible()
      await s.getByRole('button', { name: 'Tentar de novo' }).click()
      await expect(s.getByTestId('mut-chamadas')).toHaveText('2')
      await expect(s.getByTestId('mut-chaves')).toHaveText('1')
    })

    test('erro do servidor retentável mostra o código de suporte', async ({ page }) => {
      const s = await enviar(page, 'Erro do servidor')
      await expect(s.getByText('Algo deu errado. Tente novamente em instantes.')).toBeVisible()
      await expect(s.getByText('demo-1234')).toBeVisible()
    })
  })

  test('campos: telefone com máscara e valor só com dígitos; código só numérico', async ({
    page,
  }) => {
    await abrir(page)
    const s = secao(page, 'campos')
    await s.getByLabel('WhatsApp').pressSequentially('11987654321')
    await expect(s.getByLabel('WhatsApp')).toHaveValue('(11) 98765-4321')
    await expect(s.getByTestId('telefone-digitos')).toHaveText('11987654321')
    await s.getByLabel('Código de 6 dígitos').pressSequentially('12a34b56789')
    await expect(s.getByLabel('Código de 6 dígitos')).toHaveValue('123456')
    await expect(s.getByText('Erro: Informe um e-mail válido.')).toBeVisible()
  })

  test('dia e horário: seleção por clique e por teclado (setas e Espaço)', async ({ page }) => {
    await abrir(page)
    const s = secao(page, 'data-hora')
    await s.getByRole('radio', { name: /quinta-feira, 22 de outubro/ }).click()
    await expect(s.getByTestId('dia-escolhido')).toHaveText('2026-10-22')

    const dias = s.getByRole('radiogroup', { name: 'Escolha o dia' })
    await dias.getByRole('radio', { name: /22 de outubro/ }).focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Space')
    await expect(s.getByTestId('dia-escolhido')).toHaveText('2026-10-23')

    await expect(s.getByRole('radio', { name: '09:30, indisponível' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await s.getByRole('radio', { name: '09:30, indisponível' }).click({ force: true })
    await expect(s.getByTestId('horario-escolhido')).toHaveText('—')
    await s.getByRole('radio', { name: '10:00', exact: true }).click()
    await expect(s.getByTestId('horario-escolhido')).toHaveText('h3')
  })

  test('dinheiro e datas formatados pelos componentes, no fuso da loja', async ({ page }) => {
    await abrir(page)
    const s = secao(page, 'formatacao')
    await expect(s.getByText('R$ 129,90').first()).toBeVisible()
    await expect(s.getByText('R$ 1.299,90')).toBeVisible()
    await expect(s.getByText('-R$ 5,00')).toBeVisible()
    await expect(s.getByText(/sábado, 17 de outubro,? (às )?14:30/).first()).toBeVisible()
    // 02:30Z de 31/12 ainda é 30/12 no horário de Brasília.
    await expect(s.getByText(/quarta-feira, 30 de dezembro de 2026,? (às )?23:30/)).toBeVisible()
    await expect(s.getByText('13:30')).toBeVisible() // Manaus
  })

  test('confirmação com consequências: Esc cancela, confirmar espera o servidor', async ({
    page,
  }) => {
    await abrir(page)
    const s = secao(page, 'feedback')
    await s.getByRole('button', { name: 'Cancelar reserva…' }).click()
    const dialogo = page.getByRole('dialog', { name: 'Cancelar esta reserva?' })
    await expect(dialogo).toBeVisible()
    await expect(dialogo.getByText('O que vai acontecer')).toBeVisible()
    await expect(
      dialogo.getByText('O horário volta a ficar disponível para outras pessoas.'),
    ).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialogo).toBeHidden()
    await expect(s.getByTestId('resultado-confirmacao')).toHaveText('Nada confirmado ainda')

    await s.getByRole('button', { name: 'Cancelar reserva…' }).click()
    await dialogo.getByRole('button', { name: 'Cancelar reserva' }).dblclick()
    await expect(s.getByTestId('resultado-confirmacao')).toHaveText(
      'Cancelamento confirmado pelo servidor',
    )
    await expect(dialogo).toBeHidden()
  })

  test('toast: sucesso é anunciado como status e erro como alerta', async ({ page }) => {
    await abrir(page)
    const s = secao(page, 'feedback')
    await s.getByRole('button', { name: 'Toast de sucesso' }).click()
    await expect(
      page.locator('[aria-live="polite"]', { hasText: 'Reserva confirmada' }),
    ).toBeVisible()
    await s.getByRole('button', { name: 'Toast de erro' }).click()
    await expect(
      page.locator('[aria-live="assertive"]', { hasText: 'Não foi possível salvar' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Fechar aviso' }).last().click()
  })

  test('backoffice: tabela com legenda, filtro por teclado e vazio com ação', async ({ page }) => {
    await abrir(page)
    const s = secao(page, 'backoffice')
    await expect(s.getByRole('table', { name: 'Clientes' })).toBeVisible()
    await expect(s.getByRole('row')).toHaveCount(4)
    await s.getByLabel('Buscar por nome').fill('bruno')
    await s.getByLabel('Buscar por nome').press('Enter')
    await expect(s.getByRole('row')).toHaveCount(2)
    await expect(s.getByText('R$ 45,00')).toBeVisible()
    await s.getByLabel('Buscar por nome').fill('zzz')
    await s.getByRole('button', { name: 'Aplicar' }).click()
    await expect(s.getByText('Nenhum cliente encontrado')).toBeVisible()
    await s.getByRole('button', { name: 'Limpar busca' }).click()
    await expect(s.getByRole('row')).toHaveCount(4)
  })

  test('navegação: sino com contador e "Como funciona" reaproveita as boas-vindas', async ({
    page,
  }) => {
    await abrir(page)
    const s = secao(page, 'navegacao')
    await expect(s.getByRole('link', { name: 'Notificações', exact: true })).toBeVisible()
    await expect(s.getByRole('link', { name: 'Notificações, 3 não lidas' })).toBeVisible()
    await expect(s.getByRole('link', { name: 'Notificações, 120 não lidas' })).toContainText('99+')
    const como = s.getByTestId('como-funciona')
    await expect(como.getByRole('button', { name: 'Pular' })).toBeVisible()
    await como.getByRole('button', { name: 'Próxima' }).click()
    await expect(como.getByRole('heading', { name: 'Planos e benefícios' })).toBeVisible()
  })

  test('tudo funciona sem localStorage (aba privada)', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('bloqueado', 'SecurityError')
        },
      })
    })
    await abrir(page)
    await expect(secao(page, 'mutacao')).toBeVisible()
  })
})
