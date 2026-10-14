import { createFileRoute } from '@tanstack/react-router'
import { BarbeirosPublicos } from '~/modules/catalog/ui/BarbeirosPublicos'

export const Route = createFileRoute('/(publico)/barbeiros/')({ component: BarbeirosPublicos })
