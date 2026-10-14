import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderScreen } from '~/ui/layouts/PlaceholderScreen'

export const Route = createFileRoute('/app/')({
  component: () => <PlaceholderScreen title="Início" owner="T32" />,
})
