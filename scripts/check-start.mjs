// Verifica `pnpm start` de ponta a ponta: sobe o servidor de produção (exige `pnpm build` antes) e
// confere que GET / (SSR) e todo CSS/JS referenciado na página respondem 200 com o tipo certo.
import { spawn } from 'node:child_process'

const PORTA = process.env.CHECK_START_PORT ?? '3199'
const BASE = `http://localhost:${PORTA}`

const processo = spawn(process.execPath, ['scripts/start-web.mjs'], {
  env: { ...process.env, PORT: PORTA, NODE_ENV: 'production' },
  stdio: ['ignore', 'ignore', 'inherit'],
})
const encerrou = new Promise((resolver) => processo.once('exit', resolver))

async function esperarServidor() {
  for (let tentativa = 0; tentativa < 60; tentativa += 1) {
    if (processo.exitCode !== null) throw new Error('o servidor encerrou antes de responder')
    try {
      await fetch(BASE)
      return
    } catch {
      await new Promise((resolver) => setTimeout(resolver, 250))
    }
  }
  throw new Error('o servidor não respondeu em 15 s')
}

function exigir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem)
}

async function main() {
  await esperarServidor()
  const pagina = await fetch(BASE)
  exigir(pagina.status === 200, `GET / retornou ${pagina.status}`)
  const html = await pagina.text()

  const ativos = [...html.matchAll(/(?:href|src)="(\/assets\/[^"]+\.(?:css|js))"/g)].map(
    (m) => m[1],
  )
  exigir(
    ativos.some((a) => a.endsWith('.css')),
    'a página não referencia CSS em /assets',
  )
  exigir(
    ativos.some((a) => a.endsWith('.js')),
    'a página não referencia JS em /assets',
  )

  for (const ativo of ativos) {
    const resposta = await fetch(`${BASE}${ativo}`)
    exigir(resposta.status === 200, `GET ${ativo} retornou ${resposta.status}`)
    const tipo = resposta.headers.get('content-type') ?? ''
    exigir(
      ativo.endsWith('.css') ? tipo.startsWith('text/css') : tipo.startsWith('text/javascript'),
      `GET ${ativo} com content-type inesperado: ${tipo}`,
    )
    await resposta.arrayBuffer()
  }

  const fora = await fetch(`${BASE}/assets/..%2f..%2fserver%2fserver.js`)
  exigir(
    fora.status !== 200 || !(await fora.text()).includes('createStartHandler'),
    'path traversal serviu dist/server',
  )

  console.log(`ok: GET / e ${ativos.length} ativos estáticos responderam 200 em ${BASE}`)
}

let codigo = 0
try {
  await main()
} catch (erro) {
  console.error(`check:start falhou: ${erro instanceof Error ? erro.message : String(erro)}`)
  codigo = 1
} finally {
  processo.kill()
  await encerrou
}
process.exit(codigo)
