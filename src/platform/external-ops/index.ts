export {
  defineExternalOperation,
  ExternalNotAppliedError,
  ExternalTimeoutError,
  getExternalOperation,
  resetExternalOperations,
} from './definition'
export type {
  ExternalCallContext,
  ExternalOperationDefinition,
  ReconcileOutcome,
  ResolvedExternalOperation,
} from './definition'
export {
  advanceOperation,
  EXTERNAL_OPS_QUEUE,
  registerExternalOperationsJobs,
  runExternalOperation,
} from './run'
export type {
  ExternalOperationDeps,
  ExternalOperationOutcome,
  ExternalOperationRequest,
} from './run'
export { EXTERNAL_OPERATION_STATES, operacoesExternas } from './schema'
export type { ExternalOperationState, LinhaOperacaoExterna } from './schema'
