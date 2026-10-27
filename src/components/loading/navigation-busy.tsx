"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { acquireBusy } from "./busy";

/** Teto de segurança: uma navegação cancelada não pode travar a tela. */
const MAX_WAIT_MS = 15_000;

/** Destino interno de um clique que vai trocar de página, ou null. */
export function internalNavigationTarget(
  event: Pick<MouseEvent, "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">,
  anchor: Pick<HTMLAnchorElement, "href" | "target" | "hasAttribute">,
  current: Pick<Location, "origin" | "pathname" | "search">,
): string | null {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return null;
  let url: URL;
  try {
    url = new URL(anchor.href);
  } catch {
    return null;
  }
  if (url.origin !== current.origin) return null;
  const next = `${url.pathname}${url.search}`;
  return next === `${current.pathname}${current.search}` ? null : next;
}

/**
 * Liga o overlay de carregamento a cada clique em link interno e o desliga
 * quando a rota (caminho ou query) muda.
 */
export function NavigationBusy() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const release = useRef<(() => void) | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function stop() {
      clearTimeout(timer);
      release.current?.();
      release.current = null;
    }
    function onClick(event: MouseEvent) {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!internalNavigationTarget(event, anchor, window.location)) return;
      stop();
      release.current = acquireBusy();
      timer = setTimeout(stop, MAX_WAIT_MS);
    }
    // Captura: o <Link> do Next chama preventDefault no próprio clique.
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", stop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", stop);
      stop();
    };
  }, []);

  useEffect(() => {
    release.current?.();
    release.current = null;
  }, [pathname, searchParams]);

  return null;
}
