"use client";

import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Folha inferior padrão do app (alça, título grande, conteúdo rolável). */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className={cn(
          "max-h-[92dvh] gap-0 overflow-y-auto rounded-t-[28px] border-0 bg-background p-0 sm:mx-auto sm:max-w-lg",
          className,
        )}
      >
        <div className="flex flex-col gap-5 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-hairline-strong" aria-hidden />
          <div className="flex flex-col gap-1">
            <SheetTitle className="text-xl font-extrabold tracking-tight">{title}</SheetTitle>
            {description != null && (
              <SheetDescription className="text-sm text-ink-subtle">{description}</SheetDescription>
            )}
          </div>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Segmentado (abas pequenas) dentro de folhas e formulários. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-lg bg-muted p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-10 rounded-md px-2 text-sm font-bold transition",
            value === o.value ? "bg-card text-ink shadow-card" : "text-ink-subtle",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
