import { createFileRoute, Outlet } from '@tanstack/react-router'
import { PublicShell } from '~/ui/layouts/Shells'
import { usePathname } from '~/ui/layouts/navigation-parts'

export const Route = createFileRoute('/(publico)')({
  component: PublicLayout,
})

function PublicLayout() {
  const pathname = usePathname()
  // As boas-vindas ocupam a tela inteira (sem cabeçalho nem abas): o botão "Pular" já é a saída.
  if (pathname.startsWith('/boas-vindas')) {
    return (
      <main id="conteudo" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
    )
  }
  return (
    <PublicShell>
      <Outlet />
    </PublicShell>
  )
}
