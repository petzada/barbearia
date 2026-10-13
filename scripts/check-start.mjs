// Verifica `pnpm start` de ponta a ponta: sobe o servidor de produção (exige `pnpm build` antes) e
// confere que GET / (SSR) e todo CSS/JS referenciado na página respondem 200 com o tipo certo.
//
// - O filho usa porta efêmera e só imprime "PRONTO <url>" depois do listen; o pai consulta apenas essa
//   URL. Assim, outro processo numa porta fixa não consegue passar pelo servidor verificado.
// - O encerramento é gracioso: o pai fecha o stdin do filho e espera ele sair (nada de kill() nem
//   process.exit() em handles abertos, que derrubavam o Node no Windows com UV_HANDLE_CLOSING).
import { spawn } from 'node:child_process'
import { lstatSync, rmdirSync, symlinkSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'

const TEMPO_PARA_FICAR_PRONTO_MS = 20_000
const TEMPO_PARA_ENCERRAR_MS = 10_000
const LINK_DE_TESTE = resolve('dist/client/check-symlink')

const filho = spawn(process.execPath, ['scripts/start-web.mjs'], {
  env: { ...process.env, PORT: '0', CHECK_START: '1', NODE_ENV: 'production' },
  stdio: ['pipe', 'pipe', 'inherit'],
})
const saiu = new Promise((resolver) => filho.once('exit', (codigo) => resolver(codigo)))

/** Remove só o link (nunca o alvo): unlink no Linux, rmdir no junction do Windows. */
function removerLinkDeTeste() {
  try {
    lstatSync(LINK_DE_TESTE)
  } catch {
    return
  }
  try {
    unlinkSync(LINK_DE_TESTE)
  } catch {
    rmdirSync(LINK_DE_TESTE)
  }
}

function exigir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem)
}

function esperar(promessa, ms, mensagem) {
  let temporizador
  const limite = new Promise((_, rejeitar) => {
    temporizador = setTimeout(() => rejeitar(new Error(mensagem)), ms)
  })
  return Promise.race([promessa, limite]).finally(() => clearTimeout(temporizador))
}

/** Resolve com a URL impressa pelo filho depois do listen; rejeita se ele sair antes (ex.: porta em uso). */
function urlDoServidor() {
  return new Promise((resolver, rejeitar) => {
    createInterface({ input: filho.stdout }).on('line', (linha) => {
      const encontrada = /^PRONTO (http:\/\/localhost:\d+)$/.exec(linha)
      if (encontrada?.[1]) resolver(encontrada[1])
    })
    saiu.then((codigo) =>
      rejeitar(new Error(`o servidor encerrou antes de ficar pronto (código ${codigo})`)),
    )
  })
}

async function conferirEstaticos(base) {
  const pagina = await fetch(base)
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
    const resposta = await fetch(`${base}${ativo}`)
    exigir(resposta.status === 200, `GET ${ativo} retornou ${resposta.status}`)
    const tipo = resposta.headers.get('content-type') ?? ''
    exigir(
      ativo.endsWith('.css') ? tipo.startsWith('text/css') : tipo.startsWith('text/javascript'),
      `GET ${ativo} com content-type inesperado: ${tipo}`,
    )
    await resposta.arrayBuffer()
  }
  return ativos.length
}

async function conferirProtecoes(base) {
  const traversal = await fetch(`${base}/assets/..%2f..%2fserver%2fserver.js`)
  exigir(
    traversal.status !== 200 || !(await traversal.text()).includes('createStartHandler'),
    'path traversal serviu dist/server',
  )

  // Symlink (junction no Windows) dentro de dist/client apontando para fora não pode ser servido.
  removerLinkDeTeste() // resto de uma execução interrompida
  symlinkSync(resolve('dist/server'), LINK_DE_TESTE, 'junction')
  const viaLink = await fetch(`${base}/check-symlink/server.js`)
  exigir(
    viaLink.status !== 200 || !(await viaLink.text()).includes('createStartHandler'),
    'symlink dentro de dist/client serviu arquivo de fora',
  )
}

async function main() {
  const base = await esperar(
    urlDoServidor(),
    TEMPO_PARA_FICAR_PRONTO_MS,
    'o servidor não ficou pronto a tempo',
  )
  const quantidade = await conferirEstaticos(base)
  await conferirProtecoes(base)
  console.log(`ok: GET / e ${quantidade} ativos estáticos responderam 200 em ${base}`)
}

try {
  await main()
} catch (erro) {
  console.error(`check:start falhou: ${erro instanceof Error ? erro.message : String(erro)}`)
  process.exitCode = 1
} finally {
  removerLinkDeTeste()
  filho.stdin.end() // sinal de encerramento gracioso
  try {
    const codigo = await esperar(saiu, TEMPO_PARA_ENCERRAR_MS, 'o servidor não encerrou a tempo')
    if (codigo !== 0 && codigo !== null) {
      console.error(`check:start: o servidor encerrou com código ${codigo}`)
      process.exitCode = 1
    }
  } catch (erro) {
    console.error(`check:start falhou: ${erro instanceof Error ? erro.message : String(erro)}`)
    filho.kill()
    process.exitCode = 1
  }
}
