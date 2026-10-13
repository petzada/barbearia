import type { EnqueueResult, JobQueue, JobRequest } from '../ports/job-queue'

/** Fake em memória: registra os jobs e deduplica por (fila, singletonKey). Não simula rollback de transação. */
export class FakeJobQueue implements JobQueue {
  readonly jobs: Array<JobRequest & { jobId: string }> = []
  private sequence = 0

  enqueueInTx<TPayload>(_tx: unknown, job: JobRequest<TPayload>): Promise<EnqueueResult> {
    return this.enqueue(job)
  }

  enqueue<TPayload>(job: JobRequest<TPayload>): Promise<EnqueueResult> {
    const duplicado =
      job.singletonKey !== undefined &&
      this.jobs.some((j) => j.queue === job.queue && j.singletonKey === job.singletonKey)
    if (duplicado) return Promise.resolve({ jobId: null })
    this.sequence += 1
    const jobId = `job-${this.sequence}`
    this.jobs.push({ ...job, jobId })
    return Promise.resolve({ jobId })
  }

  cancelByKey(input: { queue: string; singletonKey: string }): Promise<void> {
    const restantes = this.jobs.filter(
      (j) => !(j.queue === input.queue && j.singletonKey === input.singletonKey),
    )
    this.jobs.splice(0, this.jobs.length, ...restantes)
    return Promise.resolve()
  }
}
