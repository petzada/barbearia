import { createFileRoute } from '@tanstack/react-router'
import { AdminMatriz } from '~/modules/catalog/ui/AdminMatriz'

export const Route = createFileRoute('/admin/equipe/matriz/')({ component: AdminMatriz })
