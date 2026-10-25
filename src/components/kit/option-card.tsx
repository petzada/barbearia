"use client";

import { useId, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { chipClass } from "@/lib/ui/classes";
import { FieldLabel } from "./field-label";

/** Grupo de opções exclusivas com título + descrição (ex.: forma de pagamento). Rótulo visível. */
export function OptionGroup({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel id={id}>{label}</FieldLabel>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

/**
 * Opções exclusivas curtas, sem descrição (ex.: plano por nome e preço):
 * chips teal. Regra: card com anel só quando a opção tem título + descrição.
 */
export function ChipGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T | null;
  onChange: (value: T) => void;
  options: { value: T; label: string; hint?: string }[];
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel id={id}>{label}</FieldLabel>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn("group gap-1.5 px-4", chipClass)}
          >
            {o.label}
            {o.hint && <span className="tabular font-bold opacity-80">{o.hint}</span>}
          </button>
        ))}
      </div>
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
