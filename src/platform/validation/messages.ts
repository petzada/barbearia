import { z } from 'zod'

// Mensagens de validação em pt-BR e SEM eco do valor recebido: um campo errado pode ser OTP, token ou
// telefone, e a mensagem vai para a resposta e para o log (PRD §7.8). Mensagens explícitas do schema
// (`z.string().min(3, 'texto')`) têm precedência sobre este mapa.
function minimoOuMaximo(issue: z.core.$ZodRawIssue, limite: 'minimo' | 'maximo'): string {
  const valor = limite === 'minimo' ? issue['minimum'] : issue['maximum']
  const quantidade = typeof valor === 'number' || typeof valor === 'bigint' ? String(valor) : null
  const origem = issue['origin']
  if (quantidade === null)
    return limite === 'minimo' ? 'Valor abaixo do permitido.' : 'Valor acima do permitido.'
  if (origem === 'string') {
    return limite === 'minimo'
      ? `Informe ao menos ${quantidade} caractere(s).`
      : `Informe no máximo ${quantidade} caractere(s).`
  }
  if (origem === 'array' || origem === 'set') {
    return limite === 'minimo'
      ? `Informe ao menos ${quantidade} item(ns).`
      : `Informe no máximo ${quantidade} item(ns).`
  }
  return limite === 'minimo'
    ? `O valor deve ser no mínimo ${quantidade}.`
    : `O valor deve ser no máximo ${quantidade}.`
}

export function mensagemSegura(issue: z.core.$ZodRawIssue): string {
  switch (issue.code) {
    case 'invalid_type':
      return issue.input === undefined ? 'Campo obrigatório.' : 'Valor em formato inválido.'
    case 'too_small':
      return minimoOuMaximo(issue, 'minimo')
    case 'too_big':
      return minimoOuMaximo(issue, 'maximo')
    case 'invalid_format':
      return 'Formato inválido.'
    case 'invalid_value':
      return 'Valor não permitido.'
    case 'unrecognized_keys':
      return 'Campo não reconhecido.'
    default:
      return 'Valor inválido.'
  }
}

let configurado = false

/** Idempotente. Chamada por `validation/index.ts` e pelos construtores de operação. */
export function configurarMensagensDeValidacao(): void {
  if (configurado) return
  z.config({ customError: mensagemSegura })
  configurado = true
}
