import { createFileRoute } from '@tanstack/react-router'
import { TrocarNumeroForm } from '~/modules/identity/ui/TrocarNumeroForm'

// A02 — trocar o WhatsApp (e vincular o Google). Exige sessão: sem ela, a tela leva para /entrar e volta.
export const Route = createFileRoute('/app/perfil/numero/')({
  component: TrocarNumeroForm,
})
