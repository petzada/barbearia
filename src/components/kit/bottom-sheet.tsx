"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { XIcon } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Distância (px) ou velocidade (px/ms) do arraste para baixo que fecha a folha. */
const DISMISS_DISTANCE = 96;
const DISMISS_VELOCITY = 0.5;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Folha inferior única do app: alça (arraste para baixo fecha), título grande,
 * botão "Fechar", conteúdo rolável e rodapé fixo opcional (ação primária).
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  headerRight,
  footer,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Ex.: preço à direita do título. */
  headerRight?: ReactNode;
  /** Ação primária fixa no rodapé (fica visível ao rolar). */
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; startTime: number; dy: number } | null>(null);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    drag.current = { startY: event.clientY, startTime: performance.now(), dy: 0 };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (popupRef.current) popupRef.current.style.transition = "none";
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dy = Math.max(0, event.clientY - drag.current.startY);
    drag.current.dy = dy;
    if (popupRef.current && !prefersReducedMotion()) popupRef.current.style.transform = `translateY(${dy}px)`;
  }

  function endDrag() {
    const state = drag.current;
    drag.current = null;
    if (!state) return;
    const popup = popupRef.current;
    if (popup) {
      popup.style.transition = "";
      popup.style.transform = "";
    }
    const elapsed = Math.max(1, performance.now() - state.startTime);
    if (state.dy >= DISMISS_DISTANCE || (state.dy > 24 && state.dy / elapsed >= DISMISS_VELOCITY)) {
      onOpenChange(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={popupRef}
        side="bottom"
        showCloseButton={false}
        className={cn(
          "flex max-h-[92dvh] flex-col gap-0 rounded-t-2xl border-0 bg-background p-0 sm:mx-auto sm:max-w-lg",
          className,
        )}
      >
        <div
          data-testid="sheet-drag-area"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="shrink-0 touch-none select-none px-5 pt-3"
        >
          <div className="mx-auto h-1.5 w-10 rounded-full bg-hairline-strong" aria-hidden />
          <div className="mt-3 flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <SheetTitle className="text-xl font-extrabold tracking-tight">{title}</SheetTitle>
              {description != null && (
                <SheetDescription className="text-sm text-ink-subtle">{description}</SheetDescription>
              )}
            </div>
            {headerRight != null && <div className="shrink-0 pt-0.5">{headerRight}</div>}
            <SheetClose
              render={<Button variant="ghost" size="icon-sm" className="-mr-2 -mt-1 shrink-0 text-ink-subtle" />}
            >
              <XIcon className="size-5" aria-hidden />
              <span className="sr-only">Fechar</span>
            </SheetClose>
          </div>
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pt-5",
            footer ? "pb-5" : "pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
          )}
        >
          {children}
        </div>
        {footer != null && (
          <div className="shrink-0 border-t border-hairline bg-background px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
