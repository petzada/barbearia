"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PREV_PATH_KEY } from "@/components/navigation-tracker";

/** Rota anterior do app válida para voltar (não externa, não a própria página). */
export function previousAppPath(stored: string | null, currentPath: string): string | null {
  if (!stored || !stored.startsWith("/") || stored.startsWith("//")) return null;
  const pathOnly = stored.split(/[?#]/)[0];
  if (pathOnly === currentPath) return null;
  return stored;
}

/**
 * "Voltar" das páginas legais: retorna à tela do app em que o usuário estava
 * (registrada pelo NavigationTracker; os links "#secao" do índice não contam).
 * Sem tela anterior (link externo, aba nova), vai para `fallbackHref`.
 */
export function BackToPrevious({ fallbackHref = "/" }: { fallbackHref?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        let stored: string | null = null;
        try {
          stored = window.sessionStorage.getItem(PREV_PATH_KEY);
        } catch {
          stored = null;
        }
        router.push(previousAppPath(stored, window.location.pathname) ?? fallbackHref);
      }}
      className="-ml-1 inline-flex h-11 w-fit items-center gap-1 text-sm font-semibold text-cta-ink"
    >
      <ChevronLeft className="size-5" aria-hidden />
      Voltar
    </button>
  );
}
