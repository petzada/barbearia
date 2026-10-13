import { eq } from 'drizzle-orm'
import { parseTimeZone } from '../time'
import type { Env } from '../validation/env'
import { barbearias, type Barbearia } from './schema/barbearias'
import type { Executor } from './types'

export interface SeedBarbeariaInput {
  readonly slug: string
  readonly nome?: string
  readonly fuso?: string
}

/**
 * Cria a barbearia do deploy a partir de `BARBEARIA_SLUG` (D0019). Idempotente: se o slug já existe,
 * devolve a linha como está e NÃO a altera (marca e parâmetros são de T08, não do seed).
 */
export async function seedBarbearia(db: Executor, input: SeedBarbeariaInput): Promise<Barbearia> {
  const fuso = parseTimeZone(input.fuso ?? 'America/Sao_Paulo')
  await db
    .insert(barbearias)
    .values({ slug: input.slug, nome: input.nome ?? input.slug, fuso })
    .onConflictDoNothing({ target: barbearias.slug })
  const [linha] = await db.select().from(barbearias).where(eq(barbearias.slug, input.slug))
  if (!linha) throw new Error(`Não foi possível criar nem encontrar a barbearia "${input.slug}".`)
  return linha
}

export function seedInputFromEnv(env: Env): SeedBarbeariaInput {
  return {
    slug: env.BARBEARIA_SLUG,
    ...(env.BARBEARIA_NOME ? { nome: env.BARBEARIA_NOME } : {}),
    ...(env.BARBEARIA_FUSO ? { fuso: env.BARBEARIA_FUSO } : {}),
  }
}
