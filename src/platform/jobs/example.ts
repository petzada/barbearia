import { logger } from '../logging'
import { registerJobHandler } from './handlers'
import { getJobQueue } from './queue'
import { defineQueue } from './queues'

/** Job de exemplo: prova que o worker sobe, consome e encerra (critério de aceite do T03). Sem efeito de negócio. */
export const EXAMPLE_QUEUE = defineQueue({ name: 'system.exemplo' })

export interface ExamplePayload {
  readonly mensagem: string
}

export function registerExampleJob(): void {
  registerJobHandler<ExamplePayload>(EXAMPLE_QUEUE, ({ payload, ctx, jobId }) => {
    logger.info(
      {
        event: 'worker.exemplo',
        jobId,
        correlationId: ctx.correlationId,
        mensagem: payload.mensagem,
      },
      'job de exemplo processado',
    )
    return Promise.resolve()
  })
}

/** Usado por `pnpm ops:example-job` e pelos testes. */
export function enqueueExampleJob(mensagem: string): Promise<{ jobId: string | null }> {
  return getJobQueue().enqueue<ExamplePayload>({ queue: EXAMPLE_QUEUE.name, payload: { mensagem } })
}
