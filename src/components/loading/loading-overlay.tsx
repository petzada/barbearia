"use client";

import Image from "next/image";
import { useBusy, useIsBusy } from "./busy";

/**
 * Película branca (20%) sobre o app inteiro (até atrás das barras do navegador), com o logo
 * centralizado "em ação", enquanto houver alguma espera. Aparece com um
 * pequeno atraso (CSS) para não piscar em respostas instantâneas.
 */
export function LoadingOverlay() {
  const busy = useIsBusy();
  if (!busy) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="loading-overlay fixed inset-x-0 top-0 z-[100] h-lvh min-h-full bg-white/20"
    >
      {/* A película vai até atrás das barras do navegador; o logo fica no centro da área visível. */}
      <div className="flex h-dvh items-center justify-center">
        <Image
          src="/images/logo.webp"
          alt=""
          width={480}
          height={290}
          priority
          className="loading-logo h-auto w-28 select-none drop-shadow-[0_2px_10px_rgba(255,255,255,0.7)]"
          draggable={false}
        />
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

/** Liga o overlay enquanto estiver montado (ex.: dentro de um `loading.tsx`). */
export function BusyWhileMounted() {
  useBusy(true);
  return null;
}
