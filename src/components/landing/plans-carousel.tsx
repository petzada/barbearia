"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Planos do Clube na landing. Mobile/tablet: carrossel que abre centralizado
 * no plano do meio, com setas e fade nas laterais para os vizinhos.
 * Desktop (lg+): grade de 3 colunas, sem setas.
 */
export function PlansCarousel({ items, initialIndex = 0 }: { items: { key: string; node: ReactNode }[]; initialIndex?: number }) {
  const scroller = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(initialIndex);

  function centerOn(i: number, behavior: ScrollBehavior) {
    if (scroller.current) centerCard(scroller.current, i, behavior);
  }

  useEffect(() => {
    if (scroller.current) centerCard(scroller.current, initialIndex, "instant");
  }, [initialIndex]);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < el.children.length; i++) {
      const card = el.children[i] as HTMLElement;
      const distance = Math.abs(card.offsetLeft + card.clientWidth / 2 - center);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    }
    setIndex(nearest);
  }

  const canPrev = index > 0;
  const canNext = index < items.length - 1;

  return (
    <div className="relative -mx-5 lg:mx-0">
      <ul
        ref={scroller}
        onScroll={onScroll}
        className="scrollbar-none relative flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-5 pb-2 pt-4 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0"
      >
        {items.map((item) => (
          <li key={item.key} className="flex w-[78%] shrink-0 snap-center sm:w-[46%] lg:w-auto">
            {item.node}
          </li>
        ))}
      </ul>
      <SideArrow side="left" visible={canPrev} onClick={() => centerOn(index - 1, "smooth")} />
      <SideArrow side="right" visible={canNext} onClick={() => centerOn(index + 1, "smooth")} />
    </div>
  );
}

function centerCard(el: HTMLElement, i: number, behavior: ScrollBehavior) {
  const card = el.children[i] as HTMLElement | undefined;
  if (!card) return;
  el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.clientWidth) / 2, behavior });
}

function SideArrow({ side, visible, onClick }: { side: "left" | "right"; visible: boolean; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 flex w-14 items-center transition-opacity duration-200 lg:hidden",
        side === "left"
          ? "left-0 justify-start bg-gradient-to-r from-background via-background/70 to-transparent pl-1"
          : "right-0 justify-end bg-gradient-to-l from-background via-background/70 to-transparent pr-1",
        visible ? "opacity-100" : "opacity-0",
      )}
      aria-hidden={!visible}
    >
      <button
        type="button"
        onClick={onClick}
        tabIndex={visible ? 0 : -1}
        aria-label={side === "left" ? "Plano anterior" : "Próximo plano"}
        className={cn(
          "flex size-10 items-center justify-center rounded-full bg-card text-ink shadow-card",
          visible ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <Icon className="size-5" aria-hidden />
      </button>
    </div>
  );
}
