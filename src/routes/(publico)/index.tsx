import { createFileRoute } from '@tanstack/react-router'
import { useBrand } from '~/ui/brand/BrandProvider'
import { Card } from '~/ui/components/Card'
import { AppLink } from '~/ui/layouts/navigation-parts'
import { WelcomeGate } from '~/ui/welcome/WelcomeGate'

export const Route = createFileRoute('/(publico)/')({
  component: EntradaPublica,
})

// Entrada do app (D0001: sem landing page). O porteiro decide entre redirecionar o logado, mostrar as
// boas-vindas ou seguir. O conteúdo de Planos, Serviços e Barbeiros é de T07 e T06.
function EntradaPublica() {
  const marca = useBrand()
  return (
    <WelcomeGate>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-texto">{marca.nome}</h1>
        <p className="text-lg text-suave">{marca.descricao}</p>
        <Card title="Conheça a barbearia">
          <ul className="flex flex-col gap-1">
            {[
              { to: '/planos', texto: 'Ver planos e benefícios' },
              { to: '/servicos', texto: 'Ver serviços' },
              { to: '/barbeiros', texto: 'Conhecer os barbeiros' },
            ].map((l) => (
              <li key={l.to}>
                <AppLink
                  to={l.to}
                  className="flex min-h-11 items-center font-semibold text-primaria underline-offset-4 hover:underline"
                >
                  {l.texto}
                </AppLink>
              </li>
            ))}
          </ul>
        </Card>
        <AppLink
          to="/entrar"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primaria px-4 font-semibold text-sobre-primaria"
        >
          Entrar para agendar
        </AppLink>
      </div>
    </WelcomeGate>
  )
}
