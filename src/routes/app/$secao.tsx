import { createFileRoute, notFound } from '@tanstack/react-router'
import { PlaceholderScreen } from '~/ui/layouts/PlaceholderScreen'
import { placeholderOf } from '~/ui/layouts/placeholders'

export const Route = createFileRoute('/app/$secao')({
  beforeLoad: ({ params }) => {
    if (!placeholderOf('app', params.secao)) throw notFound()
  },
  component: Esqueleto,
})

// Esqueleto das abas do cliente (Agendar T17; Plano, Perfil e Reservas T32; Notificações T30). Um arquivo
// próprio (`app/agendar.tsx`) tem prioridade sobre esta rota genérica.
function Esqueleto() {
  const { secao } = Route.useParams()
  const info = placeholderOf('app', secao)
  if (!info) return null
  return <PlaceholderScreen title={info.title} owner={info.owner} />
}
