import type { BrowserContext, Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'

export type Papel = 'cliente' | 'barbeiro' | 'admin'

/**
 * Sessão de teste da interface (só existe em `vite dev`, ver src/ui/session/dev-session.ts). Não
 * autentica nada no servidor: serve para exercitar abas, guardas e layouts antes do login real (T04).
 */
export async function entrarComo(
  context: BrowserContext,
  papeis: readonly Papel[],
  baseURL: string,
) {
  if (process.env['E2E_FAKE_SESSION'] !== '1') {
    throw new Error('Sessão falsa de E2E exige E2E_FAKE_SESSION=1.')
  }
  await context.addCookies([
    { name: 'dev_sessao', value: encodeURIComponent(papeis.join(',')), url: baseURL },
  ])
}

export function ehMobile(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 1024
}

/** Nenhuma violação WCAG A/AA; mostra regras e alvos quando falha. */
export async function semViolacoesDeAcessibilidade(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const resumo = resultado.violations.map((v) => ({
    regra: v.id,
    impacto: v.impact,
    alvos: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
  }))
  expect(resumo).toEqual([])
}

/** Controles visíveis com área de toque menor que 44 px (PRD §4.1). Checkbox conta pelo rótulo. */
export async function alvosPequenos(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const MIN = 44
    const seletor = 'button, a[href], select, input:not([type=hidden]), [role=radio]'
    const pequenos: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>(seletor)) {
      const estilo = getComputedStyle(el)
      if (estilo.visibility === 'hidden' || estilo.display === 'none') continue
      // Link de salto fica fora da tela até receber foco.
      if (el.closest('.sr-only') || el.matches('.sr-only')) continue
      const alvo =
        el instanceof HTMLInputElement && el.type === 'checkbox' ? (el.closest('label') ?? el) : el
      const r = alvo.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      if (Math.round(r.height) < MIN || Math.round(r.width) < MIN) {
        const nome = (el.getAttribute('aria-label') ?? el.textContent ?? el.tagName)
          .trim()
          .slice(0, 40)
        pequenos.push(
          `${el.tagName.toLowerCase()} "${nome}" ${Math.round(r.width)}x${Math.round(r.height)}`,
        )
      }
    }
    return pequenos
  })
}
