"use client";

import { useId } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FieldLabel } from "./field-label";

const trackClass = "grid gap-1 rounded-lg bg-muted p-1";
const itemClass = "flex h-11 min-w-0 items-center justify-center rounded-md px-3 text-sm font-bold transition";
const activeClass = "bg-card text-ink shadow-card";
const idleClass = "text-ink-subtle hover:text-ink";

const columns = (n: number) => ({ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` });

/** 2–4 opções exclusivas (estado local). Mesma aparência do SegmentedNav. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  showLabel = false,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
  /** Mostra o rótulo acima (campos de formulário); abas ficam só com aria. */
  showLabel?: boolean;
}) {
  const id = useId();
  const group = (
    <div
      role="radiogroup"
      aria-label={showLabel ? undefined : label}
      aria-labelledby={showLabel ? id : undefined}
      className={trackClass}
      style={columns(options.length)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(itemClass, value === o.value ? activeClass : idleClass)}
        >
          <span className="truncate">{o.label}</span>
        </button>
      ))}
    </div>
  );
  if (!showLabel) return group;
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel id={id}>{label}</FieldLabel>
      {group}
    </div>
  );
}

/** Abas/filtros que mudam a URL (links com aria-current). */
export function SegmentedNav({
  items,
  label,
  scrollable = false,
  orientation = "horizontal",
  currentKind = "page",
}: {
  items: { href: string; label: string; current: boolean; prefetch?: boolean }[];
  label: string;
  /** Rola na horizontal no celular em vez de dividir a largura. */
  scrollable?: boolean;
  /** Vertical: lista empilhada (ex.: troca de modo na sidebar). */
  orientation?: "horizontal" | "vertical";
  /** "page" para abas de rota; "true" quando o item é um estado (ex.: modo). */
  currentKind?: "page" | "true";
}) {
  const vertical = orientation === "vertical";
  const nav = (
    <nav
      aria-label={label}
      className={cn(trackClass, scrollable && "flex w-max", vertical && "flex flex-col")}
      style={scrollable || vertical ? undefined : columns(items.length)}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          prefetch={item.prefetch}
          aria-current={item.current ? currentKind : undefined}
          className={cn(
            itemClass,
            scrollable && "shrink-0 px-4",
            vertical && "justify-start",
            item.current ? activeClass : idleClass,
          )}
        >
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
  return scrollable ? <div className="scrollbar-none -mx-5 overflow-x-auto px-5 lg:mx-0 lg:px-0">{nav}</div> : nav;
}
