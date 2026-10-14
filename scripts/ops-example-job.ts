import { enqueueExampleJob, stopBoss } from '../src/platform/jobs'
import { loadEnv } from '../src/platform/validation/env'
import { carregarEnvLocal } from './lib/env'

// Enfileira um job de exemplo para provar o worker: rode `pnpm dev:worker` num terminal e este script noutro.
// O worker deve registrar "job de exemplo processado".
async function main(): Promise<void> {
  carregarEnvLocal()
  loadEnv()
  const mensagem = process.argv[2] ?? 'olá do ops:example-job'
  const { jobId } = await enqueueExampleJob(mensagem)
  console.log(`job de exemplo enfileirado: ${jobId ?? '(deduplicado)'}`)
  await stopBoss({ graceful: false })
}

main().catch((erro: unknown) => {
  console.error(`ops:example-job falhou: ${erro instanceof Error ? erro.message : String(erro)}`)
  process.exit(1)
})
