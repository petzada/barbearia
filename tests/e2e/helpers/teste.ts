import { expect, test as base } from '@playwright/test'

/**
 * `test` com `page.goto`/`page.reload` que esperam o React assumir a página (atributo `data-hidratado`
 * no <html>, ver src/routes/__root.tsx). Sem isso, o teste clica antes dos handlers existirem e a
 * navegação vira uma carga completa de página, o que mascara o comportamento real do app.
 */
export const test = base.extend({
  page: async ({ page }, fornecer) => {
    const aguardar = () =>
      page.waitForFunction(() => document.documentElement.dataset['hidratado'] === 'true')
    const goto = page.goto.bind(page)
    const reload = page.reload.bind(page)
    page.goto = async (...args) => {
      const resposta = await goto(...args)
      await aguardar()
      return resposta
    }
    page.reload = async (...args) => {
      const resposta = await reload(...args)
      await aguardar()
      return resposta
    }
    await fornecer(page)
  },
})

export { expect }
