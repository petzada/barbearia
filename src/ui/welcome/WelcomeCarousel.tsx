import { useState } from 'react'
import { useBrand } from '../brand/BrandProvider'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { cn } from '../components/cn'

export type WelcomeExit = 'pular' | 'entrar' | 'planos'

interface WelcomeCarouselProps {
  /** Chamado ao pular, concluir ou escolher um destino; quem usa decide para onde ir e marca como visto. */
  onExit: (saida: WelcomeExit) => void
  /** `revisao` é o "Como funciona" do Perfil: mesmo conteúdo, sem tom de primeira visita. */
  mode?: 'primeira-visita' | 'revisao'
}

/**
 * Boas-vindas (P01): 2–3 telas vindas da configuração da marca, com "Pular" sempre visível. É o mesmo
 * componente de Perfil → Como funciona (D0048), por isso não toca em armazenamento nem em rota.
 */
export function WelcomeCarousel({ onExit, mode = 'primeira-visita' }: WelcomeCarouselProps) {
  const marca = useBrand()
  const telas = marca.boasVindas.telas
  const [indice, setIndice] = useState(0)
  const tela = telas[indice]
  if (!tela) return null
  const ultima = indice === telas.length - 1

  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-md flex-col px-4 pb-6',
        mode === 'revisao' ? 'min-h-[70dvh]' : 'min-h-dvh',
      )}
    >
      <div className="flex items-center justify-between py-2">
        <span className="text-sm font-semibold text-suave">
          {mode === 'revisao' ? 'Como funciona' : marca.nomeCurto}
        </span>
        <Button variant="fantasma" onClick={() => onExit('pular')}>
          Pular
        </Button>
      </div>

      <section
        aria-label="Boas-vindas"
        aria-live="polite"
        className="flex flex-1 flex-col items-center justify-center gap-5 text-center"
      >
        <span className="grid size-28 place-items-center rounded-full bg-elevada text-primaria">
          <Icon name={tela.icone} size={56} />
        </span>
        <h1 className="text-3xl font-bold text-texto">{tela.titulo}</h1>
        <p className="max-w-xs text-lg text-suave">{tela.texto}</p>
      </section>

      <div className="flex flex-col gap-4">
        <ol className="flex justify-center gap-2" aria-label="Progresso">
          {telas.map((t, i) => (
            <li
              key={t.id}
              aria-current={i === indice ? 'step' : undefined}
              aria-label={`Tela ${i + 1} de ${telas.length}`}
              className={cn(
                'h-2 rounded-full transition-all',
                i === indice ? 'w-6 bg-primaria' : 'w-2 bg-borda-forte',
              )}
            />
          ))}
        </ol>

        {ultima ? (
          <div className="flex flex-col gap-2">
            <Button fullWidth onClick={() => onExit('entrar')}>
              Entrar
            </Button>
            <Button variant="secundario" fullWidth onClick={() => onExit('planos')}>
              Ver planos
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            {indice > 0 ? (
              <Button variant="secundario" onClick={() => setIndice(indice - 1)}>
                Voltar
              </Button>
            ) : null}
            <Button fullWidth onClick={() => setIndice(indice + 1)}>
              Próxima
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
