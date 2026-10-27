import { createFileRoute } from '@tanstack/react-router'

// Endpoints do login (OTP do WhatsApp, Google, sessão). O código de servidor é carregado só quando a rota é chamada
// (import dinâmico, como no dispatcher) e nunca vai para o bundle do navegador.
async function tratar(request: Request): Promise<Response> {
  const { handleAuthRequest } = await import('~/modules/identity/infra/auth-handler.server')
  return handleAuthRequest(request)
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => tratar(request),
      POST: ({ request }) => tratar(request),
    },
  },
})
