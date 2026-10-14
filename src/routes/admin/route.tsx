import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AcessoNegadoDaArea } from '~/ui/layouts/AcessoNegadoDaArea'
import { AreaCarregando } from '~/ui/layouts/AreaCarregando'
import { AdminShell } from '~/ui/layouts/Shells'
import { guardArea } from '~/ui/navigation/guard'

export const Route = createFileRoute('/admin')({
  ssr: false,
  pendingComponent: AreaCarregando,
  beforeLoad: ({ location }) => guardArea('admin', location),
  component: LayoutAdmin,
})

function LayoutAdmin() {
  const { access } = Route.useRouteContext()
  if (access === 'negado') return <AcessoNegadoDaArea />
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  )
}
