// Somente servidor: importado dinamicamente pelo handler de `dispatcher.ts`.
import { getRequest } from '@tanstack/react-start/server'
import type { JsonValue } from '~/contracts/json'
import type { Result } from '~/contracts/result'
import { getDeployBarbearia } from '../db/deploy-barbearia'
import { SystemErrors } from '../errors/generic'
import { errorToResult } from '../errors/to-result'
import { logger } from '../logging'
import { systemClock } from '../time/clock'
import { loadOperationModules } from './load-operations.server'
import { correlationIdFromHeader } from './request-context'
import { defaultRegistry } from './registry'
import { getSessionResolver } from './session-resolver'

/**
 * Despacha uma operação pelo nome: carrega os módulos, resolve barbearia do deploy e sessão no servidor
 * e executa o pipeline da operação. Nunca lança: todo erro vira `Result` de erro seguro.
 * O status HTTP fica no `Result` (`httpStatus`); a resposta do server function é sempre 200 para que o
 * cliente leia o `Result` em vez de receber uma exceção de rede.
 */
export async function dispatchOperation(
  name: string,
  rawInput: unknown,
  request: Request = getRequest(),
): Promise<Result<JsonValue>> {
  const correlationId = correlationIdFromHeader(request.headers.get('x-correlation-id'))
  try {
    await loadOperationModules()
    const operation = defaultRegistry.get(name)
    if (!operation) {
      logger.warn({ correlationId, operation: name }, 'operação desconhecida')
      return errorToResult(SystemErrors.OPERATION_NOT_FOUND(), correlationId)
    }
    const [barbearia, session] = await Promise.all([
      getDeployBarbearia(),
      getSessionResolver().resolve(request),
    ])
    return (await operation.run(
      { barbeariaId: barbearia.id, clock: systemClock, correlationId, session },
      rawInput,
    )) as Result<JsonValue>
  } catch (error) {
    logger.error({ correlationId, operation: name, err: error }, 'falha ao despachar operação')
    return errorToResult(error, correlationId)
  }
}
