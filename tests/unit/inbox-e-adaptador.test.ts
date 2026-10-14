import { describe, expect, it } from 'vitest'
import {
  BodyTooLargeError,
  CARD_REMOVED,
  readBodyLimited,
  scrubCardData,
} from '../../src/platform/inbox/body'
import { buildDrizzleSql, splitPlaceholders } from '../../src/platform/jobs/tx-adapter'

describe('scrubCardData: número de cartão nunca vai para o inbox', () => {
  it('remove PANs válidos (Visa, Mastercard, Amex), com ou sem separadores', () => {
    for (const pan of [
      '4111111111111111',
      '4111 1111 1111 1111',
      '5555-5555-5555-4444',
      '378282246310005',
    ]) {
      expect(scrubCardData(`cartão ${pan} fim`)).toBe(`cartão ${CARD_REMOVED} fim`)
    }
  })

  it('preserva ids numéricos comuns de provedor (telefone, id de pagamento, timestamp)', () => {
    const corpo = JSON.stringify({
      id: 1234567890,
      remoteJid: '5511987654321@s.whatsapp.net',
      ts: 1798729200000,
      n: '1234567890123456',
    })
    expect(scrubCardData(corpo)).toBe(corpo) // 16 dígitos sem bandeira/Luhn válidos não são cartão
  })

  it('não mexe em número maior que um cartão', () => {
    const grande = '41111111111111111111'
    expect(scrubCardData(grande)).toBe(grande)
  })
})

describe('readBodyLimited', () => {
  const requisicao = (corpo: string, cabecalhos: Record<string, string> = {}) =>
    new Request('https://x.test/', { method: 'POST', body: corpo, headers: cabecalhos })

  it('lê corpo dentro do limite', async () => {
    expect(await readBodyLimited(requisicao('{"a":"ç"}'), 100)).toBe('{"a":"ç"}')
  })

  it('recusa pelo content-length declarado e pelo tamanho real', async () => {
    await expect(
      readBodyLimited(requisicao('x', { 'content-length': '999999' }), 100),
    ).rejects.toBeInstanceOf(BodyTooLargeError)
    await expect(readBodyLimited(requisicao('x'.repeat(101)), 100)).rejects.toBeInstanceOf(
      BodyTooLargeError,
    )
  })

  it('corpo vazio devolve texto vazio', async () => {
    expect(await readBodyLimited(new Request('https://x.test/'), 100)).toBe('')
  })
})

describe('adaptador Drizzle → pg-boss (splitPlaceholders)', () => {
  it('separa texto e parâmetros e repete o mesmo $n quantas vezes aparecer', () => {
    expect(splitPlaceholders('select $1, $2 where a = $1')).toEqual([
      { text: 'select ' },
      { param: 0 },
      { text: ', ' },
      { param: 1 },
      { text: ' where a = ' },
      { param: 0 },
    ])
  })

  it('ignora $n dentro de literais, identificadores, comentários e blocos com dólar', () => {
    const texto = `select '$1', "$2", $$ $3 $$, $tag$ $4 $tag$ /* $5 */ -- $6\n, $7`
    const parametros = splitPlaceholders(texto).filter((p) => 'param' in p)
    expect(parametros).toEqual([{ param: 6 }])
  })

  it("entende aspas simples duplicadas ('') dentro de literal", () => {
    const parametros = splitPlaceholders(`select 'it''s $1', $2`).filter((p) => 'param' in p)
    expect(parametros).toEqual([{ param: 1 }])
  })

  it('recusa SQL que referencia parâmetro inexistente', () => {
    expect(() => buildDrizzleSql('select $2', ['a'])).toThrow(RangeError)
  })
})
