import type { ReactNode } from 'react'
import { Button } from './Button'
import { Card } from './Card'
import { DateTimeText } from './format'
import { Icon, type IconName } from './Icon'
import { cn } from './cn'

/** Vazio com próxima ação (PRD §4.1): `action` é obrigatório de propósito. */
export function EmptyState({
  title,
  description,
  action,
  icon = 'vazio',
}: {
  title: string
  description?: string
  action: ReactNode
  icon?: IconName
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-elevada text-suave">
        <Icon name={icon} size={32} />
      </span>
      <h2 className="text-lg font-semibold text-texto">{title}</h2>
      {description ? <p className="max-w-sm text-suave">{description}</p> : null}
      <div className="mt-1">{action}</div>
    </div>
  )
}

/** Erro recuperável com "Tentar de novo" (PRD §4.1). A mensagem deve ser a `message` segura do servidor. */
export function ErrorState({
  title = 'Não foi possível carregar',
  message,
  onRetry,
  correlationId,
}: {
  title?: string
  message: string
  onRetry: () => void | Promise<unknown>
  /** Código de suporte do erro (`correlationId`); não é dado pessoal. */
  correlationId?: string
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-elevada text-perigo">
        <Icon name="erro" size={32} />
      </span>
      <h2 className="text-lg font-semibold text-texto">{title}</h2>
      <p className="max-w-sm text-suave">{message}</p>
      <Button variant="secundario" onClick={onRetry}>
        Tentar de novo
      </Button>
      {correlationId ? (
        <p className="text-sm text-suave">
          Código de suporte: <span className="tabular-nums">{correlationId}</span>
        </p>
      ) : null}
    </div>
  )
}

/** Esqueleto de carregamento anunciado ao leitor de tela. */
export function LoadingSkeleton({
  lines = 3,
  variant = 'texto',
  label = 'Carregando…',
}: {
  lines?: number
  variant?: 'texto' | 'cartoes'
  label?: string
}) {
  const itens = Array.from({ length: lines }, (_, i) => i)
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">{label}</span>
      {itens.map((i) =>
        variant === 'cartoes' ? (
          <div
            key={i}
            aria-hidden="true"
            className="h-24 animate-[ui-pulsar_1.4s_ease-in-out_infinite] rounded-lg bg-elevada"
          />
        ) : (
          <div
            key={i}
            aria-hidden="true"
            className={cn(
              'h-4 animate-[ui-pulsar_1.4s_ease-in-out_infinite] rounded-sm bg-elevada',
              i === itens.length - 1 && itens.length > 1 ? 'w-2/3' : 'w-full',
            )}
          />
        ),
      )}
    </div>
  )
}

/** Acesso negado: explica e leva a um lugar válido (nunca revela se o recurso existe). */
export function AccessDenied({
  title = 'Você não tem acesso a esta tela',
  description = 'Entre com uma conta que tenha permissão ou volte para o início.',
  action,
}: {
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-elevada text-alerta">
        <Icon name="privacidade" size={32} />
      </span>
      <h2 className="text-lg font-semibold text-texto">{title}</h2>
      <p className="max-w-sm text-suave">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}

/**
 * Efeito externo em andamento (D0055): mostra o protocolo e o que acontece em seguida. Nunca fala em
 * sucesso: a confirmação só chega quando o servidor a registra (PRD §4.1).
 */
export function PendingExternal({
  title = 'Em andamento',
  protocol,
  nextSteps,
  nextUpdateAt,
}: {
  title?: string
  protocol: string | null
  nextSteps: readonly string[]
  /** Próxima consulta sugerida pelo servidor (ISO 8601). */
  nextUpdateAt?: string | null
}) {
  return (
    <Card as="section" aria-label={title} role="status" className="border-info">
      <div className="flex items-start gap-3">
        <span className="text-info">
          <Icon name="relogio" size={28} />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-texto">{title}</h2>
          {protocol ? (
            <p className="text-texto">
              Protocolo: <strong className="tabular-nums">{protocol}</strong>
            </p>
          ) : null}
          {nextSteps.length > 0 ? (
            <div>
              <p className="text-sm font-semibold text-suave">O que acontece agora</p>
              <ul className="mt-1 list-disc pl-5 text-texto">
                {nextSteps.map((passo) => (
                  <li key={passo}>{passo}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {nextUpdateAt ? (
            <p className="text-sm text-suave">
              Próxima atualização: <DateTimeText value={nextUpdateAt} format="completo" />
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
