import { createFileRoute, notFound } from '@tanstack/react-router'
import { PlaceholderScreen } from '~/ui/layouts/PlaceholderScreen'
import { placeholderOf } from '~/ui/layouts/placeholders'

export const Route = createFileRoute('/equipe/$secao')({
  beforeLoad: ({ params }) => {
    if (!placeholderOf('equipe', params.secao)) throw notFound()
  },
  component: Esqueleto,
})

// Esqueleto das abas da equipe (Atendimentos T25, Ganhos T27, Gestão T34, Notificações T30). Um arquivo
// próprio (`equipe/ganhos.tsx`) tem prioridade sobre esta rota genérica.
function Esqueleto() {
  const { secao } = Route.useParams()
  const info = placeholderOf('equipe', secao)
  if (!info) return null
  return <PlaceholderScreen title={info.title} owner={info.owner} />
}
