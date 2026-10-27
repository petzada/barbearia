import { useEffect, useSyncExternalStore, useTransition } from "react";

/**
 * Contador global de esperas do app (ações, navegação, carregamento de rota).
 * Enquanto houver alguma, o `LoadingOverlay` cobre a tela com o logo animado.
 */
let count = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Marca o início de uma espera; a função devolvida a encerra (idempotente). */
export function acquireBusy(): () => void {
  count++;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    count--;
    emit();
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useIsBusy(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => count > 0,
    () => false,
  );
}

/** Mantém o overlay ligado enquanto `active` for verdadeiro. */
export function useBusy(active: boolean): void {
  useEffect(() => (active ? acquireBusy() : undefined), [active]);
}

/** `useTransition` que liga o overlay enquanto a transição estiver pendente. */
export function useBusyTransition() {
  const transition = useTransition();
  useBusy(transition[0]);
  return transition;
}
