import type { KeyboardEvent } from 'react'

/**
 * Navegação por setas dentro de um grupo de opções (`role="radiogroup"`): ← → ↑ ↓ andam, Home/End vão
 * às pontas. Opções desabilitadas são puladas. Devolve o elemento que recebeu o foco.
 */
export function moverFocoComSetas(event: KeyboardEvent<HTMLElement>): HTMLElement | null {
  const teclas: Record<string, 1 | -1 | 'inicio' | 'fim'> = {
    ArrowRight: 1,
    ArrowDown: 1,
    ArrowLeft: -1,
    ArrowUp: -1,
    Home: 'inicio',
    End: 'fim',
  }
  const passo = teclas[event.key]
  if (passo === undefined) return null

  const opcoes = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not([aria-disabled="true"])'),
  )
  if (opcoes.length === 0) return null
  const atual = opcoes.indexOf(document.activeElement as HTMLElement)

  let alvo: number
  if (passo === 'inicio') alvo = 0
  else if (passo === 'fim') alvo = opcoes.length - 1
  else alvo = (Math.max(atual, 0) + passo + opcoes.length) % opcoes.length

  event.preventDefault()
  const elemento = opcoes[alvo] ?? null
  elemento?.focus()
  return elemento
}
