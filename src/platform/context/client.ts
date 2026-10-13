import type { Result } from '~/contracts/result'
import { executeOperationFn } from './dispatcher'
import type { AnyOperation, OperationInput, OperationOutput } from './operation'

export type RemoteOperation<TOp extends AnyOperation> = (
  input: OperationInput<TOp>,
) => Promise<Result<OperationOutput<TOp>>>

/**
 * Chamada tipada de uma operação a partir do navegador (ou de um `loader`). Seguro para o bundle do cliente:
 * só importa o TIPO da operação, nunca o módulo do servidor.
 *
 * ```ts
 * // modules/scheduling/client.ts
 * import type { cancelarReserva } from './server'
 * export const cancelarReservaRemoto = remoteOperation<typeof cancelarReserva>('scheduling.cancelarReserva')
 * const r = await cancelarReservaRemoto({ reservaId, idempotencyKey: newIdempotencyKey(), expectedRevision: 3 })
 * ```
 * O nome é checado pelo tipo contra o `name` literal da operação.
 */
export function remoteOperation<TOp extends AnyOperation>(name: TOp['name']): RemoteOperation<TOp> {
  return async (input) => {
    const resultado = await executeOperationFn({ data: { operation: name, input: input ?? {} } })
    return resultado as Result<OperationOutput<TOp>>
  }
}
