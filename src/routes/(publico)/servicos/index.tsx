import { createFileRoute } from '@tanstack/react-router'
import { listPublicCatalog } from '~/modules/catalog/client'
import { ServicosPublicos } from '~/modules/catalog/ui/ServicosPublicos'
import { ErroDeCarregamento } from '~/modules/catalog/ui/ErroDeCarregamento'

export const Route = createFileRoute('/(publico)/servicos/')({
  loader: () => listPublicCatalog({}),
  component: ServicosDaRota,
  errorComponent: ErroDeCarregamento,
})

function ServicosDaRota() {
  return <ServicosPublicos resultado={Route.useLoaderData()} />
}
