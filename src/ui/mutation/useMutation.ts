import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import {
  MutationController,
  fieldErrorsOf,
  type MutationOptions,
  type MutationState,
} from './mutation-controller'

export interface UseMutation<TInput, TData> {
  state: MutationState<TData>
  /** Bloqueia o botão e o formulário enquanto verdadeiro. */
  isSending: boolean
  submit: (input: TInput) => Promise<MutationState<TData>>
  /** Repete a última entrada com a mesma chave de idempotência (botão "Tentar de novo"). */
  retry: () => Promise<MutationState<TData>>
  reset: () => void
  /** Última entrada enviada: a tela a reaproveita para manter o formulário preenchido após erro. */
  lastInput: TInput | undefined
  /** Mensagens por campo (`fields` do servidor) para passar ao `error` dos inputs. */
  fieldErrors: Record<string, string>
}

/**
 * Liga um `Result` (`ok`/`pending`/`error`) aos estados de tela da mutação (PRD §4.1). A tela decide o que
 * mostrar em cada fase; `MutationStatus` traz a apresentação padrão.
 */
export function useMutation<TInput, TData>(
  options: MutationOptions<TInput, TData>,
): UseMutation<TInput, TData> {
  const [controller] = useState(() => new MutationController<TInput, TData>(options))
  // A ação costuma ser um closure novo a cada render: o controlador sempre chama a mais recente.
  useEffect(() => {
    controller.setOptions(options)
  })

  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)
  const submit = useCallback((input: TInput) => controller.submit(input), [controller])
  const retry = useCallback(() => controller.retry(), [controller])
  const reset = useCallback(() => controller.reset(), [controller])

  return {
    state,
    isSending: state.phase === 'sending',
    submit,
    retry,
    reset,
    lastInput: controller.lastInput,
    fieldErrors: fieldErrorsOf(state),
  }
}
