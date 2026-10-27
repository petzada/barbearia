import { exigirBancoDescartavel } from '../../../src/platform/db/safety'

/**
 * D0082: a sessão falsa de E2E grava no banco; só um `*_test` serve. Reaproveita a trava do projeto (recusa
 * `railway` e qualquer nome fora de `_dev`/`_test`) e ainda recusa `_dev`, que guarda dados de desenvolvimento.
 * Sem fixar o nome do banco da worktree: na main ele é `barbearia_test`.
 */
export function exigirBancoDeTesteE2E(url: string | undefined): string {
  if (!url) {
    throw new Error('E2E_FAKE_SESSION exige DATABASE_URL_TEST (rode "pnpm db:bootstrap").')
  }
  const nome = exigirBancoDescartavel(url)
  if (!nome.endsWith('_test')) {
    throw new Error(`E2E_FAKE_SESSION exige um banco _test; recebido "${nome}".`)
  }
  return nome
}
