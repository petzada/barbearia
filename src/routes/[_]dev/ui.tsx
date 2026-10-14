import { createFileRoute, notFound } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { LoadingSkeleton } from '~/ui/components/states'

// Catálogo só em desenvolvimento. `import.meta.env.MODE` vira "production" no build: o ramo some, o
// import dinâmico do catálogo não entra no bundle e a rota responde 404 (PRD §4: nada de ferramenta
// interna exposta). Não usar `DEV`: ele herda o NODE_ENV do .env.local (ver src/ui/session/ui-session.ts).
const Catalogo =
  import.meta.env.MODE === 'development'
    ? lazy(() => import('~/ui/catalog/Catalog').then((m) => ({ default: m.Catalog })))
    : null

export const Route = createFileRoute('/_dev/ui')({
  beforeLoad: () => {
    if (import.meta.env.MODE !== 'development') throw notFound()
  },
  component: PaginaCatalogo,
})

function PaginaCatalogo() {
  if (!Catalogo) return null
  return (
    <Suspense fallback={<LoadingSkeleton lines={4} />}>
      <Catalogo />
    </Suspense>
  )
}
