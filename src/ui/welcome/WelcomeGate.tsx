import { useNavigate } from '@tanstack/react-router'
import { useEffect, type ReactNode } from 'react'
import { useBrand } from '../brand/BrandProvider'
import { LoadingSkeleton } from '../components/states'
import { homeOf } from '../navigation/access'
import { useUiSession } from '../session/ui-session'
import { enteredByDeepLink } from './initial-entry'
import { readSeenWelcomeVersion, shouldShowWelcome } from './welcome-rules'

type Decisao = 'aguardando' | 'logado' | 'boas-vindas' | 'seguir'

/**
 * Porteiro da entrada ("/"): logado vai ao seu contexto; visitante novo (ou de versão antiga) vai às
 * boas-vindas; os demais seguem para o conteúdo. Roda no navegador porque depende de localStorage e da
 * sessão; até decidir, mostra um esqueleto (a página nunca pisca o conteúdo e redireciona).
 */
export function WelcomeGate({ children }: { children: ReactNode }) {
  const marca = useBrand()
  const navigate = useNavigate()
  const { status, session } = useUiSession()

  let decisao: Decisao = 'aguardando'
  if (status === 'ready') {
    if (session) decisao = 'logado'
    else if (
      shouldShowWelcome({
        loggedIn: false,
        deepLink: enteredByDeepLink(),
        seenVersion: readSeenWelcomeVersion(),
        currentVersion: marca.boasVindas.versao,
      })
    ) {
      decisao = 'boas-vindas'
    } else decisao = 'seguir'
  }

  const destinoLogado = homeOf(session)
  useEffect(() => {
    if (decisao === 'logado') void navigate({ href: destinoLogado, replace: true })
    if (decisao === 'boas-vindas') void navigate({ href: '/boas-vindas', replace: true })
  }, [decisao, destinoLogado, navigate])

  if (decisao === 'seguir') return <>{children}</>
  return (
    <div className="mx-auto w-full max-w-md p-4">
      <LoadingSkeleton lines={4} label="Abrindo…" />
    </div>
  )
}
