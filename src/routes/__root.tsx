/// <reference types="vite/client" />
import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router'
import { useEffect, type ReactNode } from 'react'
import { getBrand } from '~/ui/brand/brand-config'
import { BrandProvider, BrandStyle } from '~/ui/brand/BrandProvider'
import { ToastProvider } from '~/ui/components/Toast'
import { registerServiceWorker } from '~/ui/pwa/register-service-worker'
// Efeito de módulo: guarda a primeira URL da visita para o porteiro das boas-vindas (D0048).
import '~/ui/welcome/initial-entry'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => {
    const marca = getBrand()
    return {
      meta: [
        { charSet: 'utf-8' },
        // viewport-fit=cover: a barra de abas respeita a área segura do iPhone (PWA em tela cheia).
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { title: marca.nome },
        { name: 'description', content: marca.descricao },
        { name: 'theme-color', content: marca.corTema },
        { name: 'application-name', content: marca.nomeCurto },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: marca.nomeCurto },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: marca.icones.icone192 },
        { rel: 'apple-touch-icon', href: marca.icones.apple180 },
      ],
    }
  },
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  const marca = getBrand()
  useEffect(() => {
    registerServiceWorker()
    // Sinal de que o React assumiu a página: os testes E2E esperam por ele antes de interagir (sem ele,
    // o clique chega antes dos handlers e a navegação vira uma carga completa de página).
    document.documentElement.dataset['hidratado'] = 'true'
  }, [])
  return (
    <RootDocument>
      <BrandProvider brand={marca}>
        <ToastProvider>
          <Outlet />
        </ToastProvider>
      </BrandProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <BrandStyle brand={getBrand()} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <main
      id="conteudo"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-4 text-center"
    >
      <h1 className="text-2xl font-bold text-texto">Página não encontrada</h1>
      <p className="text-suave">O endereço não existe ou foi movido.</p>
      <Link
        to="/"
        className="mx-auto inline-flex min-h-11 items-center rounded-md bg-primaria px-4 font-semibold text-sobre-primaria"
      >
        Ir para o início
      </Link>
    </main>
  )
}
