import { Link } from '@tanstack/react-router'
import { AccessDenied } from '../components/states'

/** Acesso negado de uma área (guarda só de UX; o servidor já recusa a operação, PRD §4.4). */
export function AcessoNegadoDaArea() {
  return (
    <main id="conteudo" tabIndex={-1} className="mx-auto max-w-md pt-10 outline-none">
      <AccessDenied
        action={
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-md bg-primaria px-4 font-semibold text-sobre-primaria"
          >
            Voltar ao início
          </Link>
        }
      />
    </main>
  )
}
