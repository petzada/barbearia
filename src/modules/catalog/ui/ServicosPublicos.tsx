import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Badge, Card, EmptyState, ErrorState, LoadingSkeleton, MoneyText } from '~/ui'
import { listPublicCatalog } from '../client'

type Resultado = Awaited<ReturnType<typeof listPublicCatalog>>

export function ServicosPublicos() {
  const [resultado, setResultado] = useState<Resultado | null>(null)

  async function carregar() {
    setResultado(await listPublicCatalog({}))
  }

  useEffect(() => {
    let ativa = true
    void listPublicCatalog({}).then((resposta) => {
      if (ativa) setResultado(resposta)
    })
    return () => {
      ativa = false
    }
  }, [])

  if (!resultado)
    return <LoadingSkeleton lines={4} variant="cartoes" label="Carregando serviços…" />
  if (resultado.status === 'error') {
    return (
      <ErrorState
        message={resultado.message}
        correlationId={resultado.correlationId}
        onRetry={carregar}
      />
    )
  }
  if (resultado.status !== 'ok') return null

  const servicos = resultado.data.servicos
  return (
    <div className="flex flex-col gap-8">
      <header className="relative overflow-hidden rounded-xl border border-borda bg-superficie p-6 sm:p-8">
        <div
          aria-hidden="true"
          className="absolute -right-10 -top-16 size-56 rounded-full border-[24px] border-primaria/10"
        />
        <p className="text-sm font-bold tracking-[0.18em] text-primaria uppercase">Serviços</p>
        <h1 className="mt-2 max-w-xl text-3xl leading-tight font-bold text-texto sm:text-4xl">
          Serviços
        </h1>
        <p className="mt-3 max-w-xl text-suave">
          Veja os serviços e combos da casa, com preço e duração para escolher com tranquilidade.
        </p>
      </header>

      {servicos.length === 0 ? (
        <Card>
          <EmptyState
            title="Estamos preparando o catálogo"
            description="Os serviços da barbearia aparecerão aqui assim que forem cadastrados."
            action={
              <Link to="/barbeiros" className="font-semibold text-primaria underline">
                Conheça a equipe
              </Link>
            }
            icon="servicos"
          />
        </Card>
      ) : (
        <section aria-label="Serviços e combos" className="grid gap-4 md:grid-cols-2">
          {servicos.map((servico) => (
            <Card
              key={servico.id}
              className="flex min-h-52 flex-col justify-between gap-6 border-l-2 border-l-primaria/65 p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-bold text-texto">{servico.nome}</h2>
                  {servico.tipo === 'combo' ? <Badge tone="info">Combo</Badge> : null}
                </div>
                {servico.descricao ? (
                  <p className="mt-2 text-sm text-suave">{servico.descricao}</p>
                ) : null}
                {servico.componentes.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-bold tracking-wide text-suave uppercase">Inclui</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {servico.componentes.map((componente) => (
                        <li key={componente}>
                          <Badge tone="neutro">{componente}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <div className="flex items-end justify-between border-t border-borda pt-4">
                <div>
                  <p className="text-xs font-bold tracking-wide text-suave uppercase">
                    A partir de
                  </p>
                  <p className="mt-1 text-2xl font-bold text-primaria">
                    <MoneyText cents={servico.precoCentavos} />
                  </p>
                </div>
                <p className="rounded-full bg-elevada px-3 py-2 text-sm font-semibold text-texto">
                  {servico.duracaoMinutos} min
                </p>
              </div>
            </Card>
          ))}
        </section>
      )}
      <Card className="flex flex-col items-start gap-3 border-borda-forte/60 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-texto">Já sabe o que quer?</h2>
          <p className="text-sm text-suave">Conheça quem cuida de cada serviço.</p>
        </div>
        <Link
          to="/barbeiros"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-borda-forte bg-elevada px-4 py-2 font-semibold text-texto hover:bg-superficie"
        >
          Ver barbeiros
        </Link>
      </Card>
    </div>
  )
}
