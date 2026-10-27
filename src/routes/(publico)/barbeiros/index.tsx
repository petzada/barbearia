import { createFileRoute } from '@tanstack/react-router'
import { listPublicBarbers } from '~/modules/catalog/client'
import { BarbeirosPublicos } from '~/modules/catalog/ui/BarbeirosPublicos'
import { ErroDeCarregamento } from '~/modules/catalog/ui/ErroDeCarregamento'

export const Route = createFileRoute('/(publico)/barbeiros/')({
  loader: () => listPublicBarbers({}),
  component: BarbeirosDaRota,
  errorComponent: ErroDeCarregamento,
})

function BarbeirosDaRota() {
  return <BarbeirosPublicos resultado={Route.useLoaderData()} />
}
