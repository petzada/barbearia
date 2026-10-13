import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'
import { ok, type CommandMeta, type Result } from '~/contracts'
import { policies } from '~/platform/authz'
import {
  OperationRegistry,
  createOperationFactory,
  type OperationInput,
  type OperationOutput,
} from '~/platform/context'
import { remoteOperation, type RemoteOperation } from '~/platform/context/client'

// Os tipos são checados por `pnpm typecheck`; o runtime só confirma que o arquivo executa.
const { defineQuery, defineCommand } = createOperationFactory({
  publicAllowlist: [],
  registry: new OperationRegistry(),
})

const consultar = defineQuery({
  name: 'tipos.consultar',
  input: z.object({ limite: z.number().int().default(10) }),
  policy: policies.authenticated(),
  handler: () => Promise.resolve(ok({ quando: new Date('2027-01-31T15:00:00Z'), total: 3 })),
})

const cancelar = defineCommand({
  name: 'tipos.cancelar',
  input: z.object({ reservaId: z.string() }),
  policy: policies.anyRole('cliente'),
  handler: () => Promise.resolve(ok({ reservaId: 'r1', canceladaEm: new Date() }, 2)),
})

describe('tipagem do cliente remoto', () => {
  it('consulta: entrada pré-parse (default opcional) e saída em JSON (Date vira string)', () => {
    expectTypeOf<OperationInput<typeof consultar>>().toEqualTypeOf<{
      limite?: number | undefined
    }>()
    expectTypeOf<OperationOutput<typeof consultar>>().toEqualTypeOf<{
      quando: string
      total: number
    }>()
    expectTypeOf<RemoteOperation<typeof consultar>>().returns.resolves.toEqualTypeOf<
      Result<{ quando: string; total: number }>
    >()
    expect(consultar.kind).toBe('query')
  })

  it('comando: a entrada inclui o envelope (idempotencyKey obrigatória, expectedRevision opcional)', () => {
    expectTypeOf<OperationInput<typeof cancelar>>().toEqualTypeOf<
      { reservaId: string } & CommandMeta
    >()
    expectTypeOf<OperationInput<typeof cancelar>['idempotencyKey']>().toEqualTypeOf<string>()
    expect(cancelar.kind).toBe('command')
  })

  it('o nome passado ao cliente é checado contra o nome literal da operação', () => {
    expect(typeof remoteOperation<typeof consultar>).toBe('function')
    // @ts-expect-error: nome diferente do `name` literal da operação
    const errado = () => remoteOperation<typeof consultar>('tipos.outraCoisa')
    expect(typeof errado).toBe('function') // não é chamado: só a checagem de tipo importa
    const certo = () => remoteOperation<typeof consultar>('tipos.consultar')
    expect(typeof certo).toBe('function')
  })
})
