import { closeDatabase } from '~/platform/db'
import { startWorker } from '~/platform/jobs'
import { logger } from '~/platform/logging'
import { loadEnv } from '~/platform/validation'

// Entrada do processo worker (PRD §7.5, D0016): pg-boss (jobs), dispatcher do outbox e handlers dos módulos.
// loadEnv() falha cedo, listando só os NOMES das variáveis inválidas (PRD §7.8).
loadEnv()

const PRAZO_DE_ENCERRAMENTO_MS = 30_000

async function main(): Promise<void> {
  const worker = await startWorker()
  let encerrando = false
  const encerrar = (sinal: string): void => {
    if (encerrando) return
    encerrando = true
    logger.info({ sinal }, 'worker: encerrando com graça (esperando os jobs em andamento)')
    worker
      .stop(PRAZO_DE_ENCERRAMENTO_MS)
      .then(() => closeDatabase())
      .then(() => process.exit(0))
      .catch((erro: unknown) => {
        logger.error({ err: erro }, 'worker: falha ao encerrar')
        process.exit(1)
      })
  }
  process.on('SIGINT', () => encerrar('SIGINT'))
  process.on('SIGTERM', () => encerrar('SIGTERM'))
}

main().catch((erro: unknown) => {
  logger.fatal({ err: erro }, 'worker: falha ao iniciar')
  process.exit(1)
})
