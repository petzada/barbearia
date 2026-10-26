"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export const PREV_PATH_KEY = "bdm:prev-path";
const CURRENT_PATH_KEY = "bdm:current-path";

/** Registra a rota anterior do app (sessionStorage) a cada troca de página. */
export function recordNavigation(storage: Pick<Storage, "getItem" | "setItem">, path: string): void {
  const current = storage.getItem(CURRENT_PATH_KEY);
  if (current === path) return;
  if (current) storage.setItem(PREV_PATH_KEY, current);
  storage.setItem(CURRENT_PATH_KEY, path);
}

export function NavigationTracker() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      recordNavigation(window.sessionStorage, `${pathname}${window.location.search}`);
    } catch {
      // sessionStorage indisponível (modo privado restrito): o "Voltar" usa o fallback.
    }
  }, [pathname]);
  return null;
}
