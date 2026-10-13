import { config } from 'dotenv'
import { exigirBancoDescartavel } from '../../src/platform/db/safety'

// D0082: a suíte de integração usa só o banco barbearia_test do Postgres do Railway.
// Se a URL não terminar em _test/_dev, a suíte inteira recusa rodar antes de qualquer conexão.
config({ path: '.env.local', quiet: true })

const url = process.env['DATABASE_URL_TEST']
if (!url) {
  throw new Error('DATABASE_URL_TEST ausente. Rode "pnpm db:bootstrap" (veja o AGENTS.md).')
}
const nome = exigirBancoDescartavel(url)
if (!nome.endsWith('_test')) {
  throw new Error(`Testes de integração exigem um banco _test; recebido "${nome}".`)
}
