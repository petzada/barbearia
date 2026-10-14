import { createFileRoute, notFound } from '@tanstack/react-router'
import { PlaceholderScreen } from '~/ui/layouts/PlaceholderScreen'
import { placeholderOf } from '~/ui/layouts/placeholders'

export const Route = createFileRoute('/(publico)/$pagina')({
  beforeLoad: ({ params }) => {
    if (!placeholderOf('publico', params.pagina)) throw notFound()
  },
  component: Esqueleto,
})

// Esqueleto de Planos (T07), Serviços e Barbeiros (T06) e Entrar (T04). Um arquivo de rota próprio
// (`planos.tsx`, `entrar.tsx`...) tem prioridade sobre esta rota genérica.
function Esqueleto() {
  const { pagina } = Route.useParams()
  const info = placeholderOf('publico', pagina)
  if (!info) return null
  return <PlaceholderScreen title={info.title} owner={info.owner} />
}
