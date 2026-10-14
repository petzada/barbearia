import { userInfo } from 'node:os'
import { createSystemContext } from '../src/platform/context/request-context'
import { closeDatabase, getDeployBarbearia } from '../src/platform/db'
import { getRecoveryStatus, setRecoveryMode } from '../src/platform/recovery'
import { systemClock } from '../src/platform/time/clock'
import { loadEnv } from '../src/platform/validation/env'
import { carregarEnvLocal } from './lib/env'

// D0078: único caminho para ligar/desligar o modo recuperação. Roda com a DATABASE_URL do ambiente em que o
// operador está (deploy incluído); não existe rota nem operação de usuário para isto.
//   pnpm ops:recovery on --reason "restore do backup de 2027-01-30" [--restored-at 2027-01-30T03:00:00Z]
//   pnpm ops:recovery off --reason "conciliação concluída e autorizada (H06)"
//   pnpm ops:recovery status
const USO = `uso: pnpm ops:recovery on|off --reason "<motivo>" [--restored-at <ISO>] [--operator <nome>]
     pnpm ops:recovery status`

function valorDe(args: readonly string[], flag: string): string | undefined {
  const i = args.indexOf(flag)
  return i === -1 ? undefined : args[i + 1]
}

function formatar(status: Awaited<ReturnType<typeof getRecoveryStatus>>): string {
  if (!status.active) return 'modo recuperação: DESLIGADO'
  const ponto = status.restoredPoint ? status.restoredPoint.toISOString() : 'não informado'
  return `modo recuperação: LIGADO (ponto restaurado: ${ponto}; por: ${status.activatedBy ?? '?'}; motivo: ${status.reason ?? '?'})`
}

async function main(): Promise<void> {
  carregarEnvLocal()
  loadEnv()
  const [comando, ...args] = process.argv.slice(2)
  if (comando !== 'on' && comando !== 'off' && comando !== 'status') {
    throw new Error(USO)
  }
  const barbearia = await getDeployBarbearia()
  const ctx = createSystemContext({ barbeariaId: barbearia.id, clock: systemClock })
  try {
    if (comando === 'status') {
      console.log(formatar(await getRecoveryStatus(ctx)))
      return
    }
    const motivo = valorDe(args, '--reason')
    if (!motivo?.trim()) throw new Error(`--reason é obrigatório.\n${USO}`)
    const restauradoEm = valorDe(args, '--restored-at')
    const ponto = restauradoEm ? new Date(restauradoEm) : undefined
    if (ponto && Number.isNaN(ponto.getTime()))
      throw new Error('--restored-at não é uma data ISO válida.')
    const status = await setRecoveryMode(ctx, {
      active: comando === 'on',
      operator: valorDe(args, '--operator') ?? userInfo().username,
      reason: motivo,
      ...(ponto ? { restoredPoint: ponto } : {}),
    })
    console.log(formatar(status))
  } finally {
    await closeDatabase()
  }
}

main().catch((erro: unknown) => {
  console.error(`ops:recovery falhou: ${erro instanceof Error ? erro.message : String(erro)}`)
  process.exit(1)
})
