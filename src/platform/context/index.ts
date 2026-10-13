// API de operações para o servidor. O que o navegador importa é `./client` (só tipos + `remoteOperation`).
export { defineEvent } from './events'
export type { EventDefinition, EventInit } from './events'
export {
  createOperationFactory,
  defineCommand,
  defineQuery,
  OperationDefinitionError,
} from './operation'
export type {
  AnyOperation,
  CommandDefinition,
  ContextFor,
  ExecutionEnvironment,
  Operation,
  OperationFactoryOptions,
  OperationInput,
  OperationOutput,
  QueryDefinition,
  RecentAuthRequirement,
} from './operation'
export { defaultRegistry, OperationRegistry } from './registry'
export {
  correlationIdFromHeader,
  createRequestContext,
  createSystemContext,
  newCorrelationId,
} from './request-context'
export type { CreateContextInput } from './request-context'
export { getSessionResolver, resetSessionResolver, setSessionResolver } from './session-resolver'
