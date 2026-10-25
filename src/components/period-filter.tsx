import Link from "next/link";
import { cn } from "@/lib/utils";
import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/periods";

export function PeriodFilter({
  basePath,
  current,
  query = {},
}: {
  basePath: string;
  current: PeriodKey;
  /** Outros parâmetros da URL a manter (ex.: aba do Financeiro). */
  query?: Record<string, string>;
}) {
  return (
    <nav aria-label="Período" className="scrollbar-none -mx-5 flex gap-1 overflow-x-auto px-5 lg:mx-0 lg:px-0">
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {PERIOD_OPTIONS.map((p) => (
          <Link
            key={p.key}
            href={`${basePath}?${new URLSearchParams({ ...query, periodo: p.key }).toString()}`}
            aria-current={p.key === current ? "true" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center rounded-md px-4 text-sm font-bold transition",
              p.key === current ? "bg-card text-ink shadow-card" : "text-ink-subtle",
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "brand";
}) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-lg p-4 shadow-card", tone === "brand" ? "bg-cta text-cta-foreground" : "bg-card")}>
      <span className={cn("text-xs font-bold uppercase tracking-wider", tone === "brand" ? "text-cta-foreground/75" : "text-ink-subtle")}>
        {label}
      </span>
      <span className="tabular text-2xl font-extrabold tracking-tight">{value}</span>
      {hint && <span className={cn("text-xs", tone === "brand" ? "text-cta-foreground/75" : "text-ink-subtle")}>{hint}</span>}
    </div>
  );
}
