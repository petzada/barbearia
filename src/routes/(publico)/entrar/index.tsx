import { createFileRoute } from '@tanstack/react-router'
import { EntrarForm } from '~/modules/identity/ui/EntrarForm'
import { caminhoSeguro } from '~/modules/identity/ui/api'

// A01 — entrar. `voltar` é o destino original (deep link); só caminho interno (sem redirect aberto).
export const Route = createFileRoute('/(publico)/entrar/')({
  validateSearch: (busca: Record<string, unknown>) => ({
    voltar: caminhoSeguro(busca['voltar'], '/'),
    erro: typeof busca['erro'] === 'string' ? busca['erro'] : undefined,
  }),
  component: PaginaEntrar,
})

function PaginaEntrar() {
  const { voltar, erro } = Route.useSearch()
  return <EntrarForm voltar={voltar} {...(erro ? { erroInicial: erro } : {})} />
}
