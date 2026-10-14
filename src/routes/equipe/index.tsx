import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderScreen } from '~/ui/layouts/PlaceholderScreen'

export const Route = createFileRoute('/equipe/')({
  component: () => <PlaceholderScreen title="Agenda" owner="T14" />,
})
