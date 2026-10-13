import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

export function criarPool(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString, max: 10 })
}

export function criarDb(pool: pg.Pool) {
  return drizzle(pool)
}
