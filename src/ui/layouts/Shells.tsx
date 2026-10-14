import { Link } from '@tanstack/react-router'
import { useSyncExternalStore, type ReactNode } from 'react'
import { useBrand } from '../brand/BrandProvider'
import { Icon } from '../components/Icon'
import { cn } from '../components/cn'
import { isStaff, MENU_ADMIN, TABS_CLIENTE, TABS_PUBLICO, staffTabs } from '../navigation/tabs'
import { useNotificationCount } from '../notifications/notification-count'
import { useUiSession, type UiSession } from '../session/ui-session'
import {
  AppLink,
  ContextSwitcher,
  MobileHeader,
  NotificationButton,
  SkipLink,
  TabBar,
  isActive,
  usePathname,
} from './navigation-parts'

function Conteudo({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className={cn('mx-auto w-full max-w-3xl px-4 pt-4 pb-28 outline-none', className)}
    >
      {children}
    </main>
  )
}

/** Visitante: telas públicas com a barra Planos · Serviços · Barbeiros · Entrar (PRD §4.2). */
export function PublicShell({ children }: { children: ReactNode }) {
  const marca = useBrand()
  return (
    <div className="min-h-dvh">
      <SkipLink />
      <MobileHeader
        left={
          <Link to="/" className="inline-flex min-h-11 items-center">
            {marca.nome}
          </Link>
        }
      />
      <Conteudo>{children}</Conteudo>
      <TabBar items={TABS_PUBLICO} label="Navegação pública" />
    </div>
  )
}

/** Cliente: Início · Agendar · Plano · Perfil (D0047), com alternância de contexto se também for equipe. */
export function ClientShell({ session, children }: { session: UiSession; children: ReactNode }) {
  const marca = useBrand()
  const pathname = usePathname()
  const naoLidas = useNotificationCount()
  const combinado = isStaff(session.roles)
  return (
    <div className="min-h-dvh">
      <SkipLink />
      <MobileHeader
        left={marca.nomeCurto}
        right={
          <>
            {combinado ? <ContextSwitcher current="cliente" /> : null}
            {pathname === '/app' ? (
              <NotificationButton count={naoLidas} to="/app/notificacoes" />
            ) : null}
          </>
        }
      />
      <Conteudo>{children}</Conteudo>
      <TabBar items={TABS_CLIENTE} label="Navegação do cliente" />
    </div>
  )
}

/** Equipe: abas por papel (barbeiro, admin-barbeiro, admin) e alternância se também for cliente. */
export function StaffShell({ session, children }: { session: UiSession; children: ReactNode }) {
  const marca = useBrand()
  const pathname = usePathname()
  const naoLidas = useNotificationCount()
  const combinado = session.roles.includes('cliente')
  return (
    <div className="min-h-dvh">
      <SkipLink />
      <MobileHeader
        left={marca.nomeCurto}
        right={
          <>
            {combinado ? <ContextSwitcher current="equipe" /> : null}
            {pathname === '/equipe' ? (
              <NotificationButton count={naoLidas} to="/equipe/notificacoes" />
            ) : null}
          </>
        }
      />
      <Conteudo>{children}</Conteudo>
      <TabBar items={staffTabs(session.roles)} label="Navegação da equipe" />
    </div>
  )
}

const QUERY_DESKTOP = '(min-width: 1024px)'

/** Largura é só conforto de layout: o servidor exige papel admin e autenticação recente (PRD §4.4). */
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (ouvinte) => {
      const mq = window.matchMedia(QUERY_DESKTOP)
      mq.addEventListener('change', ouvinte)
      return () => mq.removeEventListener('change', ouvinte)
    },
    () => window.matchMedia(QUERY_DESKTOP).matches,
    () => true,
  )
}

/** Aviso do backoffice no celular, com o caminho para abrir no computador (PRD §4.2). */
export function DesktopOnlyNotice({ path }: { path: string }) {
  const { session } = useUiSession()
  const podeVerGestao = session ? session.roles.includes('admin') : false
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-10 text-center outline-none"
    >
      <span className="mx-auto grid size-20 place-items-center rounded-full bg-elevada text-primaria">
        <Icon name="computador" size={40} />
      </span>
      <h1 className="text-2xl font-bold text-texto">Disponível no computador</h1>
      <p className="text-suave">
        Esta área é do backoffice e foi feita para a tela do computador. Abra no navegador do
        computador, no endereço:
      </p>
      <p className="rounded-md border border-borda bg-superficie p-3 font-mono text-base break-all text-texto">
        {path}
      </p>
      {podeVerGestao ? (
        <AppLink
          to="/equipe/gestao"
          className="mx-auto inline-flex min-h-11 items-center rounded-md border border-borda-forte px-4 font-semibold text-texto"
        >
          Ver resumo da gestão no celular
        </AppLink>
      ) : null}
    </main>
  )
}

/** Backoffice desktop: menu lateral com as treze áreas (PRD §4.3). No celular, só o aviso. */
export function AdminShell({ children }: { children: ReactNode }) {
  const marca = useBrand()
  const pathname = usePathname()
  const desktop = useIsDesktop()
  const caminho = pathname.startsWith('/admin') ? pathname : '/admin'

  if (!desktop) return <DesktopOnlyNotice path={caminho} />

  return (
    <div className="flex min-h-dvh">
      <SkipLink />
      <aside className="sticky top-0 flex h-dvh w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r border-borda bg-superficie p-4">
        <p className="px-2 text-lg font-bold text-texto">{marca.nome}</p>
        <nav aria-label="Menu do backoffice" className="flex-1">
          <ul className="flex flex-col gap-1">
            {MENU_ADMIN.map((item) => {
              const ativo = isActive(pathname, item)
              return (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    aria-current={ativo ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center gap-3 rounded-md px-3 text-base font-semibold',
                      ativo ? 'bg-primaria text-sobre-primaria' : 'text-texto hover:bg-elevada',
                    )}
                  >
                    <Icon name={item.icon} size={22} />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <Link
          to="/equipe"
          className="flex min-h-11 items-center gap-2 rounded-md border border-borda-forte px-3 font-semibold text-texto hover:bg-elevada"
        >
          <Icon name="setaEsquerda" size={20} />
          Voltar ao app
        </Link>
      </aside>
      <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 p-8 outline-none">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
