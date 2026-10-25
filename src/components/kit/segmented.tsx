"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

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
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={trackClass} style={columns(options.length)}>
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
}

/** Abas/filtros que mudam a URL (links com aria-current). */
export function SegmentedNav({
  items,
  label,
  scrollable = false,
}: {
  items: { href: string; label: string; current: boolean; prefetch?: boolean }[];
  label: string;
  /** Rola na horizontal no celular em vez de dividir a largura. */
  scrollable?: boolean;
}) {
  const nav = (
    <nav
      aria-label={label}
      className={cn(trackClass, scrollable && "flex w-max")}
      style={scrollable ? undefined : columns(items.length)}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          prefetch={item.prefetch}
          aria-current={item.current ? "page" : undefined}
          className={cn(itemClass, scrollable && "shrink-0 px-4", item.current ? activeClass : idleClass)}
        >
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
  return scrollable ? <div className="scrollbar-none -mx-5 overflow-x-auto px-5 lg:mx-0 lg:px-0">{nav}</div> : nav;
}
