import { logger } from '~/platform/logging'

// Entrada do processo worker (jobs, outbox, inbox: T03). Por ora só prova que o processo sobe.
logger.info({ event: 'worker.started' }, 'worker iniciado (esqueleto do T01)')
