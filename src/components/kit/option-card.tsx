"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Grupo de opções exclusivas com título + descrição (ex.: forma de pagamento). */
export function OptionGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      {children}
    </div>
  );
}

/** Opção com título e descrição: card branco, anel teal quando selecionada. */
export function OptionCard({
  selected,
  onSelect,
  title,
  description,
  icon: Icon,
  trailing,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Ex.: preço à direita. */
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-14 w-full items-center gap-4 rounded-lg bg-card p-4 text-left shadow-card ring-2 transition",
        selected ? "ring-cta" : "ring-transparent hover:ring-hairline-strong",
      )}
    >
      {Icon && (
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-md",
            selected ? "bg-cta text-cta-foreground" : "bg-muted text-ink-subtle",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-bold">{title}</span>
        {description && <span className="text-sm text-ink-subtle">{description}</span>}
      </span>
      {trailing != null && <span className="shrink-0">{trailing}</span>}
    </button>
  );
}
