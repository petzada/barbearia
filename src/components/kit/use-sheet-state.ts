"use client";

import { useCallback, useState } from "react";

/**
 * Estado de uma folha/diálogo que edita um item.
 *
 * O componente da folha nunca pode ser desmontado (nem trocar de `key`)
 * enquanto está aberto ou fechando: o modal do Base UI deixaria a trava de
 * rolagem e de cliques presa na página. Por isso:
 * - `item` guarda o último item aberto (continua visível durante a animação de saída);
 * - `key` muda só ao abrir (zera o formulário), nunca ao fechar.
 */
export function useSheetState<T>() {
  const [state, setState] = useState<{ item: T | null; open: boolean; key: number }>({
    item: null,
    open: false,
    key: 0,
  });

  const show = useCallback((item: T) => {
    setState((s) => ({ item, open: true, key: s.key + 1 }));
  }, []);

  const hide = useCallback(() => {
    setState((s) => (s.open ? { ...s, open: false } : s));
  }, []);

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) hide();
    },
    [hide],
  );

  return { item: state.item, open: state.open, key: state.key, show, hide, onOpenChange };
}
