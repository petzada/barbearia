"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Folha inferior única do app, sobre o Drawer do Base UI:
 * - arraste para baixo fecha (gesto nativo do Drawer, sem lógica própria);
 * - `VirtualKeyboardProvider` mantém o campo focado visível quando o teclado
 *   do celular abre e devolve o layout quando ele fecha;
 * - cabeçalho (alça, título, Fechar) e rodapé ficam fora da área rolável.
 *
 * O componente que a renderiza não pode desmontá-la enquanto estiver aberta
 * ou fechando — use `useSheetState` para editar itens.
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
  /** Ação primária fixa no rodapé (fica visível ao rolar e acima do teclado). */
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Fecha o teclado do celular antes da animação de saída: no iOS, fechar o
  // modal com um campo ainda focado desloca a viewport e pode prender a página.
  useEffect(() => {
    if (open) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && popupRef.current?.contains(active)) active.blur();
  }, [open]);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && document.activeElement instanceof HTMLElement) document.activeElement.blur();
        onOpenChange(next);
      }}
      swipeDirection="down"
    >
      <Drawer.VirtualKeyboardProvider>
        <Drawer.Portal>
          <Drawer.Backdrop
            data-slot="sheet-overlay"
            className="fixed inset-0 z-50 min-h-dvh bg-scrim/40 opacity-[calc(1-var(--drawer-swipe-progress,0))] transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none"
          />
          <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center">
            <Drawer.Popup
              ref={popupRef}
              data-slot="sheet-content"
              className={cn(
                "relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-background text-foreground shadow-card outline-none sm:max-w-lg",
                "[transform:translateY(var(--drawer-swipe-movement-y,0px))] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform",
                "data-swiping:select-none data-starting-style:[transform:translateY(100%)] data-ending-style:[transform:translateY(100%)] motion-reduce:transition-none",
                className,
              )}
            >
              <div className="shrink-0 touch-none select-none px-5 pt-3">
                <div className="mx-auto h-1.5 w-10 rounded-full bg-hairline-strong" aria-hidden />
                <div className="mt-3 flex items-start gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Drawer.Title className="text-xl font-extrabold tracking-tight">{title}</Drawer.Title>
                    {description != null && (
                      <Drawer.Description className="text-sm text-ink-subtle">{description}</Drawer.Description>
                    )}
                  </div>
                  {headerRight != null && <div className="shrink-0 pt-0.5">{headerRight}</div>}
                  <Drawer.Close
                    render={<Button variant="ghost" size="icon-sm" className="-mr-2 -mt-1 shrink-0 text-ink-subtle" />}
                  >
                    <XIcon className="size-5" aria-hidden />
                    <span className="sr-only">Fechar</span>
                  </Drawer.Close>
                </div>
              </div>
              <Drawer.Content
                className={cn(
                  "flex min-h-0 flex-1 touch-auto flex-col gap-5 overflow-y-auto overscroll-contain px-5 pt-5",
                  footer ? "pb-5" : "pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]",
                )}
              >
                {children}
              </Drawer.Content>
              {footer != null && (
                <div className="shrink-0 border-t border-hairline bg-background px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px)+var(--drawer-keyboard-inset,0px))] transition-[padding-bottom] duration-200 motion-reduce:transition-none">
                  {footer}
                </div>
              )}
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.VirtualKeyboardProvider>
    </Drawer.Root>
  );
}
