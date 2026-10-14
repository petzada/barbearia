import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderScreen } from '~/ui/layouts/PlaceholderScreen'

export const Route = createFileRoute('/admin/')({
  component: () => <PlaceholderScreen title="Painel" owner="T34" />,
})
