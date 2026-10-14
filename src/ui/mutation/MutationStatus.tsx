import type { ReactNode } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Icon } from '../components/Icon'
import { PendingExternal } from '../components/states'
import type { UseMutation } from './useMutation'

export interface ConflictAlternative {
  id: string
  /** Texto pronto (ex.: "Hoje às 15:30 com o Carlos"); a tela monta a partir de dados do servidor. */
  label: string
  onChoose: () => void | Promise<unknown>
}

interface MutationStatusProps<TInput, TData> {
  mutation: UseMutation<TInput, TData>
  /** Próximos passos mostrados no estado pendente (D0055). */
  pendingNextSteps?: readonly string[]
  /**
   * Alternativas reais para o conflito (outros horários, cotação atual). O contrato de erro não leva
   * alternativas: a tela as busca no servidor (ex.: nova disponibilidade) e passa aqui.
   */
  conflictAlternatives?: readonly ConflictAlternative[]
  /** Conteúdo do estado confirmado; só aparece depois que o servidor devolveu `ok`. */
  renderDone?: (data: TData) => ReactNode
}

/**
 * Apresentação padrão dos estados de mutação: enviando, pendente externa (com protocolo), conflito (com
 * alternativas) e falha (mensagem segura, formulário preservado e "Tentar de novo" quando cabe).
 */
export function MutationStatus<TInput, TData>({
  mutation,
  pendingNextSteps = [],
  conflictAlternatives = [],
  renderDone,
}: MutationStatusProps<TInput, TData>) {
  const { state } = mutation
  switch (state.phase) {
    case 'idle':
      return null
    case 'sending':
      return (
        <p role="status" className="flex items-center gap-2 text-suave">
          <Icon name="girar" size={18} className="animate-[ui-girar_0.9s_linear_infinite]" />
          Enviando…
        </p>
      )
    case 'done':
      return <div role="status">{renderDone ? renderDone(state.data) : null}</div>
    case 'pending':
      return (
        <PendingExternal
          protocol={state.protocol}
          nextSteps={pendingNextSteps}
          nextUpdateAt={state.nextUpdateAt}
        />
      )
    case 'conflict':
      return (
        <Card as="section" role="alert" aria-label="Conflito" className="border-alerta">
          <div className="flex items-start gap-3">
            <span className="text-alerta">
              <Icon name="alerta" size={26} />
            </span>
            <div className="flex flex-1 flex-col gap-3">
              <p className="font-semibold text-texto">{state.error.message}</p>
              {conflictAlternatives.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-suave">Você pode escolher</p>
                  <ul className="flex flex-col gap-2">
                    {conflictAlternatives.map((a) => (
                      <li key={a.id}>
                        <Button variant="secundario" fullWidth onClick={a.onChoose}>
                          {a.label}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      )
    case 'failed':
      return (
        <Card as="section" role="alert" aria-label="Falha" className="border-perigo">
          <div className="flex items-start gap-3">
            <span className="text-perigo">
              <Icon name="erro" size={26} />
            </span>
            <div className="flex flex-1 flex-col gap-2">
              <p className="font-semibold text-texto">{state.error.message}</p>
              <p className="text-sm text-suave">Suas informações foram mantidas.</p>
              {state.error.retryable ? (
                <div>
                  <Button variant="secundario" onClick={() => mutation.retry()}>
                    Tentar de novo
                  </Button>
                </div>
              ) : null}
              {state.error.correlationId ? (
                <p className="text-sm text-suave">
                  Código de suporte:{' '}
                  <span className="tabular-nums">{state.error.correlationId}</span>
                </p>
              ) : null}
            </div>
          </div>
        </Card>
      )
  }
}
