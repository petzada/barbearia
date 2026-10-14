import { Link, useRouterState } from '@tanstack/react-router'
import type { ComponentProps, ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { cn } from '../components/cn'
import type { NavItem } from '../navigation/tabs'

type AppLinkProps = Omit<ComponentProps<'a'>, 'href'> & { to: string }

/**
 * Link para destino por texto. Rotas que outras tasks ainda vão criar (`/entrar`, `/equipe/gestao`) não
 * estão no tipo gerado do roteador; quando existirem, o link já aponta para elas sem mudar nada aqui.
 */
export function AppLink({ to, ...resto }: AppLinkProps) {
  return <Link {...(resto as object)} to={to as '/'} />
}

/** Caminho atual sem a query: base para marcar o item ativo. */
export function usePathname(): string {
  return useRouterState({ select: (s) => s.location.pathname })
}

export function isActive(pathname: string, item: Pick<NavItem, 'to' | 'exact'>): boolean {
  if (pathname === item.to) return true
  return !item.exact && pathname.startsWith(`${item.to}/`)
}

/** Primeiro foco do teclado: pula o cabeçalho e a navegação (PRD §4.1). */
export function SkipLink() {
  return (
    <a
      href="#conteudo"
      className="sr-only rounded-md bg-primaria px-4 py-2 font-semibold text-sobre-primaria focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
    >
      Pular para o conteúdo
    </a>
  )
}

/** Barra de abas inferior (cliente, equipe, público): item com ícone e rótulo, alvo ≥ 44 px. */
export function TabBar({ items, label }: { items: readonly NavItem[]; label: string }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-borda bg-superficie pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-3xl">
        {items.map((item) => {
          const ativo = isActive(pathname, item)
          return (
            <li key={item.id} className="flex-1">
              <Link
                to={item.to}
                aria-current={ativo ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs font-semibold',
                  ativo ? 'text-primaria' : 'text-suave hover:text-texto',
                )}
              >
                <Icon name={item.icon} size={24} />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Botão de notificações no topo das telas iniciais (D0076). A central em si é T30; aqui só o slot. */
export function NotificationButton({ count, to }: { count: number; to: string }) {
  const rotulo = count > 0 ? `Notificações, ${count} não lidas` : 'Notificações'
  return (
    <Link
      to={to}
      aria-label={rotulo}
      className="relative grid size-11 place-items-center rounded-full text-texto hover:bg-elevada"
    >
      <Icon name="sino" size={24} />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0.5 grid min-w-5 place-items-center rounded-full bg-perigo px-1 text-xs font-bold text-fundo"
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  )
}

/** Alternância Cliente/Equipe das contas com papéis combinados (PRD §4.2). */
export function ContextSwitcher({ current }: { current: 'cliente' | 'equipe' }) {
  const opcoes = [
    { id: 'cliente', label: 'Cliente', to: '/app' },
    { id: 'equipe', label: 'Equipe', to: '/equipe' },
  ] as const
  return (
    <nav aria-label="Alternar contexto">
      <ul className="flex rounded-full border border-borda-forte bg-superficie p-0.5">
        {opcoes.map((o) => (
          <li key={o.id}>
            <Link
              to={o.to}
              aria-current={o.id === current ? 'page' : undefined}
              className={cn(
                'grid min-h-11 min-w-20 place-items-center rounded-full px-4 text-sm font-semibold',
                o.id === current
                  ? 'bg-primaria text-sobre-primaria'
                  : 'text-texto hover:bg-elevada',
              )}
            >
              {o.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function MobileHeader({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-borda bg-fundo/95 backdrop-blur">
      <div className="mx-auto flex min-h-14 max-w-3xl items-center justify-between gap-3 px-4 py-1">
        <div className="min-w-0 text-lg font-bold text-texto">{left}</div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  )
}
