export type FormatoData =
  'completo' | 'completoComAno' | 'data' | 'dataCurta' | 'hora' | 'diaDaSemana'

const OPCOES: Record<FormatoData, Intl.DateTimeFormatOptions> = {
  // "sexta-feira, 17 de outubro às 14:30"
  completo: { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' },
  completoComAno: {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
  data: { day: 'numeric', month: 'long', year: 'numeric' },
  dataCurta: { day: '2-digit', month: '2-digit', year: 'numeric' },
  hora: { hour: '2-digit', minute: '2-digit' },
  diaDaSemana: { weekday: 'long' },
}

const cache = new Map<string, Intl.DateTimeFormat>()

function formatador(formato: FormatoData, timeZone: string): Intl.DateTimeFormat {
  const chave = `${formato}|${timeZone}`
  let f = cache.get(chave)
  if (!f) {
    f = new Intl.DateTimeFormat('pt-BR', { ...OPCOES[formato], timeZone, hourCycle: 'h23' })
    cache.set(chave, f)
  }
  return f
}

/** Formata um instante no fuso informado (só apresentação; o instante vem pronto do servidor). */
export function formatarData(instante: Date, formato: FormatoData, timeZone: string): string {
  return formatador(formato, timeZone).format(instante)
}

/**
 * Rótulo de um dia local (`2026-10-17`) que o servidor já escolheu. O dia é lido como UTC só para
 * nomear o dia da semana e o mês; nenhum fuso é aplicado porque a data local não é um instante.
 */
export function formatarDiaLocal(
  dataLocal: string,
  opcoes: Intl.DateTimeFormatOptions,
): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataLocal)
  if (!m) return null
  const [, ano, mes, dia] = m
  const base = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia), 12))
  return new Intl.DateTimeFormat('pt-BR', { ...opcoes, timeZone: 'UTC' }).format(base)
}
