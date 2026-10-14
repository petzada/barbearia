import { Badge } from '../components/Badge'
import { Card } from '../components/Card'

/**
 * Esqueleto das telas de negócio. T05 entrega a navegação; cada task dona substitui o esqueleto criando o
 * arquivo de rota real (que tem prioridade sobre a rota genérica `$secao`). Nada aqui é regra de negócio.
 */
export function PlaceholderScreen({ title, owner }: { title: string; owner: string }) {
  return (
    <Card as="article" aria-labelledby="titulo-tela">
      <div className="flex flex-col items-start gap-2">
        <Badge tone="info">Em construção</Badge>
        <h1 id="titulo-tela" className="text-2xl font-bold text-texto">
          {title}
        </h1>
        <p className="text-suave">Esta tela chega na task {owner}.</p>
      </div>
    </Card>
  )
}
