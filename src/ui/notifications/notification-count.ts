import { useSyncExternalStore } from 'react'

// Slot do contador do botão de notificações. A central real é T30 (pendências e lidas); até lá o
// contador fica em zero. T30 chama `setNotificationCount` quando souber o total de não lidas.
let total = 0
const ouvintes = new Set<() => void>()

export function setNotificationCount(novo: number): void {
  const valor = Number.isFinite(novo) ? Math.max(0, Math.trunc(novo)) : 0
  if (valor === total) return
  total = valor
  for (const o of ouvintes) o()
}

export function useNotificationCount(): number {
  return useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte)
      return () => ouvintes.delete(ouvinte)
    },
    () => total,
    () => 0,
  )
}
