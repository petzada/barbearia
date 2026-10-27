import { describe, expect, it } from 'vitest'
import { dispatchBrowserOperation } from '../../src/platform/context/dispatch.server'

// D0015 / T02 (ressalva a): o endpoint único do dispatcher confere a origem ANTES de qualquer operação.
const requisicao = (cabecalhos: Record<string, string>) =>
  new Request('http://localhost:3000/_serverFn/abc', { method: 'POST', headers: cabecalhos })

describe('dispatchBrowserOperation: CSRF por Origin', () => {
  it('origem de outro site → AUTH.ORIGIN_INVALID (403) sem despachar a operação', async () => {
    const r = await dispatchBrowserOperation('identity.me', {}, requisicao({ origin: 'https://evil.example' }))
    expect(r).toMatchObject({ status: 'error', code: 'AUTH.ORIGIN_INVALID', httpStatus: 403 })
  })

  it('sem Origin e sem Sec-Fetch-Site → recusada; com Sec-Fetch-Site same-origin → passa', async () => {
    const sem = await dispatchBrowserOperation('modulo.naoExiste', {}, requisicao({}))
    expect(sem).toMatchObject({ status: 'error', code: 'AUTH.ORIGIN_INVALID' })
    const cross = await dispatchBrowserOperation('modulo.naoExiste', {}, requisicao({ 'sec-fetch-site': 'cross-site' }))
    expect(cross).toMatchObject({ code: 'AUTH.ORIGIN_INVALID' })
    const mesma = await dispatchBrowserOperation('modulo.naoExiste', {}, requisicao({ 'sec-fetch-site': 'same-origin' }))
    expect(mesma).toMatchObject({ code: 'SYSTEM.OPERATION_NOT_FOUND' }) // passou da origem e chegou ao registro
  })

  it('mesma origem passa (inclusive atrás de proxy com x-forwarded-*)', async () => {
    const direta = await dispatchBrowserOperation('modulo.naoExiste', {}, requisicao({ origin: 'http://localhost:3000' }))
    expect(direta).toMatchObject({ code: 'SYSTEM.OPERATION_NOT_FOUND' })
    const proxy = new Request('http://interno:8080/_serverFn/abc', {
      method: 'POST',
      headers: { origin: 'https://app.barbearia.exemplo', 'x-forwarded-host': 'app.barbearia.exemplo', 'x-forwarded-proto': 'https' },
    })
    expect(await dispatchBrowserOperation('modulo.naoExiste', {}, proxy)).toMatchObject({ code: 'SYSTEM.OPERATION_NOT_FOUND' })
  })
})
