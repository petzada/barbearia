// Índice central dos schemas Drizzle. Cada módulo tem o seu schema.ts; aqui só se acrescenta export (PRD §11.4).
// Imports relativos: o drizzle-kit lê este arquivo sem resolver o alias `~/`.
export * from './barbearias'
export * from '../../audit/schema'
export * from '../../idempotency/schema'
export * from '../../../modules/identity/schema'
