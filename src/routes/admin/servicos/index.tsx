import { createFileRoute } from '@tanstack/react-router'
import { AdminServicos } from '~/modules/catalog/ui/AdminServicos'

export const Route = createFileRoute('/admin/servicos/')({ component: AdminServicos })
