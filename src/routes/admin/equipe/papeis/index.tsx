import { createFileRoute } from '@tanstack/react-router'
import { PapeisAdmin } from '~/modules/identity/ui/PapeisAdmin'

// D04-papéis — conceder e revogar papéis de equipe (admin, desktop, auth recente na operação).
export const Route = createFileRoute('/admin/equipe/papeis/')({
  component: PapeisAdmin,
})
