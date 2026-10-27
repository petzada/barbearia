import { Link, useRouter } from '@tanstack/react-router'
import { Badge, Card, EmptyState, ErrorState } from '~/ui'
import type { listPublicBarbers } from '../client'

type Resultado = Awaited<ReturnType<typeof listPublicBarbers>>

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('')
}

/** O `loader` da rota entrega o resultado na primeira resposta (SSR); aqui só se apresenta ou se tenta de novo. */
export function BarbeirosPublicos({ resultado }: { resultado: Resultado }) {
  const router = useRouter()

  if (resultado.status === 'error') {
    return (
      <ErrorState
        message={resultado.message}
        correlationId={resultado.correlationId}
        onRetry={() => router.invalidate()}
      />
    )
  }
  if (resultado.status !== 'ok') return null

  const equipe = resultado.data.barbeiros
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 border-b border-borda pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.18em] text-primaria uppercase">Equipe</p>
          <h1 className="mt-2 text-3xl font-bold text-texto sm:text-4xl">Barbeiros</h1>
        </div>
        <p className="max-w-sm text-sm text-suave">
          Conheça nossos barbeiros e os serviços que cada um realiza.
        </p>
      </header>

      {equipe.length === 0 ? (
        <Card>
          <EmptyState
            title="A equipe será apresentada em breve"
            description="Os perfis públicos aparecem aqui depois que a barbearia os cadastra."
            action={
              <Link to="/servicos" className="font-semibold text-primaria underline">
                Ver serviços
              </Link>
            }
            icon="barbeiros"
          />
        </Card>
      ) : (
        <section
          aria-label="Barbeiros da equipe"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {equipe.map((barbeiro) => (
            <Card key={barbeiro.id} className="overflow-hidden p-0">
              <div className="relative flex h-36 items-end overflow-hidden bg-elevada p-5">
                <div
                  aria-hidden="true"
                  className="absolute -right-8 -top-12 size-44 rounded-full border border-primaria/30"
                />
                {barbeiro.fotoUrl ? (
                  <img
                    src={barbeiro.fotoUrl}
                    alt={`Foto de ${barbeiro.nome}`}
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="grid size-20 place-items-center rounded-full border border-primaria/40 bg-superficie text-2xl font-bold text-primaria shadow-card"
                  >
                    {iniciais(barbeiro.nome)}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-4 p-5">
                <div>
                  <h2 className="text-xl font-bold text-texto">{barbeiro.nome}</h2>
                  {barbeiro.bio ? <p className="mt-2 text-sm text-suave">{barbeiro.bio}</p> : null}
                </div>
                <div>
                  <p className="text-xs font-bold tracking-wide text-suave uppercase">Atende</p>
                  {barbeiro.servicos.length ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {barbeiro.servicos.map((servico) => (
                        <li key={servico}>
                          <Badge tone="neutro">{servico}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-suave">Serviços em atualização.</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  )
}
