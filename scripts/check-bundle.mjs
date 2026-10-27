// `pnpm check:bundle` (depois de `pnpm build`): o cliente não leva nada do servidor.
//
// COM controle positivo: antes de dizer "limpo", prova que o detector enxerga os tokens — (1) numa pasta temporária
// com um token plantado e (2) no bundle do SERVIDOR (dist/server), onde os tokens têm que existir. Se o controle
// falhar, o teste não vale nada e o script falha em vez de passar em falso.
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { TOKENS_PROIBIDOS_NO_CLIENTE, varrerPasta } from './lib/bundle-scan.mjs'

const CLIENTE = 'dist/client'
const SERVIDOR = 'dist/server'

function falhar(mensagem) {
  console.error(`check:bundle FALHOU: ${mensagem}`)
  process.exit(1)
}

if (!existsSync(CLIENTE) || !existsSync(SERVIDOR)) falhar('rode "pnpm build" antes.')

// Controle positivo 1: um token plantado tem que ser achado.
const pasta = mkdtempSync(join(tmpdir(), 'bundle-controle-'))
try {
  writeFileSync(join(pasta, 'app.js'), 'const x = "chaves_idempotencia"')
  const plantado = varrerPasta(pasta, TOKENS_PROIBIDOS_NO_CLIENTE)
  if (!plantado.some((a) => a.token === 'chaves_idempotencia')) falhar('o detector não achou o token plantado.')
} finally {
  rmSync(pasta, { recursive: true, force: true })
}

// Controle positivo 2: no servidor os tokens existem (se nem lá aparecem, o build mudou e o teste perdeu o sentido).
const noServidor = new Set(varrerPasta(SERVIDOR, TOKENS_PROIBIDOS_NO_CLIENTE).map((a) => a.token))
for (const essencial of ['dispatchOperation', 'chaves_idempotencia', 'DATABASE_URL']) {
  if (!noServidor.has(essencial)) falhar(`o token "${essencial}" não existe nem em ${SERVIDOR}: controle inválido.`)
}

const vazados = varrerPasta(CLIENTE, TOKENS_PROIBIDOS_NO_CLIENTE)
if (vazados.length > 0) {
  falhar(`código de servidor no bundle do navegador:\n${vazados.map((v) => `  ${v.arquivo}: ${v.token}`).join('\n')}`)
}
console.log(`check:bundle ok: ${TOKENS_PROIBIDOS_NO_CLIENTE.length} tokens ausentes de ${CLIENTE} (e presentes em ${SERVIDOR}).`)
