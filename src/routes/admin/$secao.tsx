import { createFileRoute, notFound } from '@tanstack/react-router'
import { PlaceholderScreen } from '~/ui/layouts/PlaceholderScreen'
import { placeholderOf } from '~/ui/layouts/placeholders'

export const Route = createFileRoute('/admin/$secao')({
  beforeLoad: ({ params }) => {
    if (!placeholderOf('admin', params.secao)) throw notFound()
  },
  component: Esqueleto,
})

// Esqueleto das áreas do backoffice (PRD §4.3). Um arquivo próprio (`admin/clientes.tsx`) tem prioridade
// sobre esta rota genérica.
function Esqueleto() {
  const { secao } = Route.useParams()
  const info = placeholderOf('admin', secao)
  if (!info) return null
  return <PlaceholderScreen title={info.title} owner={info.owner} />
}
