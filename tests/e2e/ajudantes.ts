import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'
import pg from 'pg'

const ARQUIVO_DE_MENSAGENS = '.dev/e2e-mensagens.jsonl'

/** Telefone brasileiro único por chamada (testes rodam em paralelo nos dois viewports). */
export function telefoneUnico(): { digitado: string; e164: string } {
  const sufixo = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-8)
  return { digitado: `(11) 9${sufixo.slice(0, 4)}-${sufixo.slice(4)}`, e164: `+55119${sufixo}` }
}

/** Último código enviado a `e164` (o provedor falso grava a mensagem num arquivo; produção nunca faz isso). */
export async function lerCodigo(e164: string, depoisDe = 0): Promise<string> {
  await expect
    .poll(
      () => {
        const linhas = readFileSync(ARQUIVO_DE_MENSAGENS, 'utf8').split('\n').filter(Boolean)
        const msgs = linhas.map((l) => JSON.parse(l) as { toE164: string; text: string }).filter((m) => m.toE164 === e164)
        return msgs.length > depoisDe ? (/^(\d{6}) /.exec(msgs[msgs.length - 1]?.text ?? '')?.[1] ?? '') : ''
      },
      { timeout: 15_000, message: `código para ${e164}` },
    )
    .toMatch(/^\d{6}$/)
  const linhas = readFileSync(ARQUIVO_DE_MENSAGENS, 'utf8').split('\n').filter(Boolean)
  const msgs = linhas.map((l) => JSON.parse(l) as { toE164: string; text: string }).filter((m) => m.toE164 === e164)
  return /^(\d{6}) /.exec(msgs[msgs.length - 1]?.text ?? '')?.[1] ?? ''
}

export function contarMensagens(e164: string): number {
  return readFileSync(ARQUIVO_DE_MENSAGENS, 'utf8')
    .split('\n')
    .filter(Boolean)
    .filter((l) => (JSON.parse(l) as { toE164: string }).toE164 === e164).length
}

/** Login completo pela tela A01 (primeiro acesso: código → nome → aceite) e retorno ao `voltar`. */
export async function entrarPelaTela(page: Page, telefone: { digitado: string; e164: string }, nome: string, voltar: string) {
  await page.goto(`/entrar?voltar=${encodeURIComponent(voltar)}`)
  await page.getByTestId('telefone').fill(telefone.digitado)
  await page.getByTestId('enviar-codigo').click()
  await page.getByTestId('codigo').fill(await lerCodigo(telefone.e164))
  await page.getByTestId('confirmar-codigo').click()
  await page.getByTestId('nome').fill(nome)
  await page.getByTestId('aceite').check()
  await page.getByTestId('concluir').click()
}

/** SQL direto no banco `_test` (preparar cenário que a tela não cria, como o primeiro admin). */
export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(texto: string, valores: unknown[] = []) {
  const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL_TEST'], max: 1 })
  try {
    return (await pool.query<T>(texto, valores)).rows
  } finally {
    await pool.end()
  }
}
