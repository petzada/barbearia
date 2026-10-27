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
    <div className={cn("@container flex min-w-0 flex-col gap-1 rounded-lg p-4 shadow-card", tone === "brand" ? "bg-cta text-cta-foreground" : "bg-card")}>
      <span
        className={cn(
          "truncate text-[length:clamp(0.625rem,12cqw,0.75rem)] font-bold uppercase tracking-wider",
          tone === "brand" ? "text-cta-foreground/75" : "text-ink-subtle",
        )}
      >
        {label}
      </span>
      {/* Em tiles estreitos (2–3 por linha a 360px) o valor em dinheiro não cabe nos 28px: encolhe com o card até 18px e, no limite, quebra depois do "R$". */}
      <span className="tabular break-words text-[length:clamp(1.125rem,17cqw,1.75rem)] font-extrabold leading-[1.1] tracking-tight">{value}</span>
      {hint && <span className={cn("text-xs", tone === "brand" ? "text-cta-foreground/75" : "text-ink-subtle")}>{hint}</span>}
    </div>
  );
}
