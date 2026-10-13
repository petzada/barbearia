import { eq } from 'drizzle-orm'
import { loadEnv } from '../validation/env'
import { getDatabase } from './runtime'
import { barbearias, type Barbearia } from './schema/barbearias'

let memoizada: Barbearia | undefined

/**
 * Barbearia deste deploy (D0019), resolvida uma vez a partir de `BARBEARIA_SLUG`. É a única fonte do
 * `barbeariaId` do contexto: o navegador nunca o informa.
 */
export async function getDeployBarbearia(): Promise<Barbearia> {
  if (memoizada) return memoizada
  const slug = loadEnv().BARBEARIA_SLUG
  const [linha] = await getDatabase().select().from(barbearias).where(eq(barbearias.slug, slug))
  if (!linha) {
    throw new Error(
      `A barbearia "${slug}" não existe no banco. Rode "pnpm db:seed" (veja o AGENTS.md).`,
    )
  }
  memoizada = linha
  return linha
}

/** Só para testes: esquece a barbearia memoizada. */
export function resetDeployBarbearia(): void {
  memoizada = undefined
}
