import type { FormEvent, ReactNode } from 'react'
import { Button } from './Button'
import { LoadingSkeleton } from './states'
import { cn } from './cn'

export interface TableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: 'left' | 'right'
}

interface TableProps<T> {
  /** Obrigatório: descreve a tabela para leitor de tela e aparece como título. */
  caption: string
  columns: readonly TableColumn<T>[]
  rows: readonly T[]
  getRowId: (row: T) => string
  loading?: boolean
  /** Mostrado quando não há linhas (com a próxima ação, como em EmptyState). */
  empty: ReactNode
}

/**
 * Tabela do backoffice (desktop). Linha não é clicável: a ação fica em um link/botão dentro da célula,
 * assim o teclado e o leitor de tela chegam nela sem truque (PRD §4.1).
 */
export function Table<T>({ caption, columns, rows, getRowId, loading, empty }: TableProps<T>) {
  if (loading) return <LoadingSkeleton lines={5} label={`Carregando ${caption}…`} />
  if (rows.length === 0) return <>{empty}</>
  return (
    <div className="overflow-x-auto rounded-lg border border-borda">
      <table className="w-full border-collapse text-left text-base">
        <caption className="p-3 text-left text-lg font-semibold text-texto">{caption}</caption>
        <thead className="bg-elevada text-sm text-suave">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn('px-3 py-2 font-semibold', c.align === 'right' && 'text-right')}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-borda bg-superficie">
          {rows.map((row) => (
            <tr key={getRowId(row)} className="hover:bg-elevada">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'px-3 py-3 align-middle',
                    c.align === 'right' && 'text-right tabular-nums',
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface FiltersProps {
  label: string
  children: ReactNode
  onApply: () => void
  onClear: () => void
}

/** Barra de filtros do backoffice: formulário de busca com Aplicar/Limpar; Enter aplica. */
export function Filters({ label, children, onApply, onClear }: FiltersProps) {
  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onApply()
  }
  return (
    <form
      role="search"
      aria-label={label}
      onSubmit={enviar}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-borda bg-superficie p-3"
    >
      {children}
      <div className="ml-auto flex gap-2">
        <Button type="submit">Aplicar</Button>
        <Button variant="secundario" onClick={onClear}>
          Limpar
        </Button>
      </div>
    </form>
  )
}
