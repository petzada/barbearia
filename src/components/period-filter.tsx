import { SegmentedNav } from "@/components/kit/segmented";
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
    <SegmentedNav
      label="Período"
      scrollable
      items={PERIOD_OPTIONS.map((p) => ({
        href: `${basePath}?${new URLSearchParams({ ...query, periodo: p.key }).toString()}`,
        label: p.label,
        current: p.key === current,
      }))}
    />
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
      <span className="text-display-sm">{value}</span>
      {hint && <span className={cn("text-xs", tone === "brand" ? "text-cta-foreground/75" : "text-ink-subtle")}>{hint}</span>}
    </div>
  );
}
