import { createFileRoute } from '@tanstack/react-router'
import { ServicosPublicos } from '~/modules/catalog/ui/ServicosPublicos'

export const Route = createFileRoute('/(publico)/servicos/')({ component: ServicosPublicos })
