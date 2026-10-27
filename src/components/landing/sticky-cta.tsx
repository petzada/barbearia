"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/**
 * Botão "Agendar" fixo no rodapé. O hero fica parado (sticky) e o conteúdo sobe
 * por cima dele: o botão aparece quando o conteúdo cobre o CTA do hero e some
 * de novo quando o rodapé da página entra na tela.
 */
export function StickyCta({
  href,
  targetId,
  coverId,
  endId,
}: {
  href: string;
  /** CTA do hero. */
  targetId: string;
  /** Conteúdo que sobe por cima do hero. */
  coverId: string;
  /** Rodapé: ao aparecer, o botão some. */
  endId: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    const cover = document.getElementById(coverId);
    const end = document.getElementById(endId);
    if (!target || !cover || !end) return;
    let frame = 0;
    function update() {
      frame = 0;
      const covered = cover!.getBoundingClientRect().top < target!.getBoundingClientRect().top;
      const atEnd = end!.getBoundingClientRect().top < window.innerHeight;
      setVisible(covered && !atEnd);
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetId, coverId, endId]);

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-card px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 [backface-visibility:hidden] transition-transform duration-300 md:hidden",
        visible ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
    >
      <Link href={href} tabIndex={visible ? 0 : -1} className={buttonVariants({ size: "lg", className: "w-full" })}>
        Agendar horário
      </Link>
    </div>
  );
}
