import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AcessoNegadoDaArea } from '~/ui/layouts/AcessoNegadoDaArea'
import { AreaCarregando } from '~/ui/layouts/AreaCarregando'
import { StaffShell } from '~/ui/layouts/Shells'
import { guardArea } from '~/ui/navigation/guard'

export const Route = createFileRoute('/equipe')({
  ssr: false,
  pendingComponent: AreaCarregando,
  beforeLoad: ({ location }) => guardArea('equipe', location),
  component: LayoutEquipe,
})

function LayoutEquipe() {
  const { access, session } = Route.useRouteContext()
  if (access === 'negado') return <AcessoNegadoDaArea />
  return (
    <StaffShell session={session}>
      <Outlet />
    </StaffShell>
  )
}
