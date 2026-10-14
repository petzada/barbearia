import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useBrand } from '~/ui/brand/BrandProvider'
import { WelcomeCarousel, type WelcomeExit } from '~/ui/welcome/WelcomeCarousel'
import { markWelcomeSeen } from '~/ui/welcome/welcome-rules'

export const Route = createFileRoute('/(publico)/boas-vindas/')({
  component: BoasVindas,
})

const DESTINOS: Record<WelcomeExit, string> = { pular: '/', entrar: '/entrar', planos: '/planos' }

function BoasVindas() {
  const marca = useBrand()
  const navigate = useNavigate()

  // D0048: concluir ou pular grava a versão vista; as telas só voltam quando a versão sobe.
  function sair(saida: WelcomeExit) {
    markWelcomeSeen(marca.boasVindas.versao)
    void navigate({ href: DESTINOS[saida], replace: true })
  }

  return <WelcomeCarousel onExit={sair} />
}
