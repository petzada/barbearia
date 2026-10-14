import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ClientShell } from '~/ui/layouts/Shells'
import { AcessoNegadoDaArea } from '~/ui/layouts/AcessoNegadoDaArea'
import { AreaCarregando } from '~/ui/layouts/AreaCarregando'
import { guardArea } from '~/ui/navigation/guard'

export const Route = createFileRoute('/app')({
  // A sessão vem do navegador (cookie/servidor via UiSessionSource): a guarda roda só no cliente.
  ssr: false,
  pendingComponent: AreaCarregando,
  beforeLoad: ({ location }) => guardArea('app', location),
  component: LayoutCliente,
})

function LayoutCliente() {
  const { access, session } = Route.useRouteContext()
  if (access === 'negado') return <AcessoNegadoDaArea />
  return (
    <ClientShell session={session}>
      <Outlet />
    </ClientShell>
  )
}
