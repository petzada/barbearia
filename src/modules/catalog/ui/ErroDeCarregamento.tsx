import { useRouter } from '@tanstack/react-router'
import { ErrorState } from '~/ui'

/** Falha inesperada do `loader` (rede, servidor fora): a tela segue com a mensagem segura e "Tentar de novo". */
export function ErroDeCarregamento() {
  const router = useRouter()
  return (
    <ErrorState
      message="Tente de novo em instantes. Se o problema continuar, fale com a barbearia."
      onRetry={() => router.invalidate()}
    />
  )
}
