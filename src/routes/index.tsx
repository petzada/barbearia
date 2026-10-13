import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: PaginaInicial,
})

// Página provisória do T01; a home real e o shell chegam em T05.
function PaginaInicial() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6">
      <h1 className="text-3xl font-bold text-destaque">Barbearia</h1>
      <p>Em construção.</p>
    </main>
  )
}
