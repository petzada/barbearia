import type { ReactNode } from "react";
import { CalendarCheck, Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPriceCents } from "@/lib/agenda/availability";
import { CYCLE_LABELS, planRulesSummary, type PlanCycle } from "@/lib/plans";
import { cn } from "@/lib/utils";

export type PlanCardData = {
  name: string;
  description: string | null;
  priceCents: number;
  cycle: PlanCycle;
  benefits: string[];
  highlighted: boolean;
  /** Regras do clube (atendimentos por ciclo e dias cobertos). */
  visitsPerCycle?: number;
  allowedWeekdays?: number[];
  /** Nomes dos serviços cobertos, na ordem do catálogo. */
  coveredServiceNames?: string[];
};

/** Card de plano do Clube — o mesmo no app do cliente e na prévia da gestão. */
export function PlanCard({ plan, footer, header }: { plan: PlanCardData; footer?: ReactNode; header?: ReactNode }) {
  const dark = plan.highlighted;
  const rules = planRulesSummary({
    visitsPerCycle: plan.visitsPerCycle ?? 0,
    allowedWeekdays: plan.allowedWeekdays ?? [],
    cycle: plan.cycle,
  });
  return (
    <article className={cn("flex w-full flex-col gap-4 rounded-lg p-6 shadow-card", dark ? "bg-surface-dark text-on-dark ring-2 ring-cta" : "bg-card")}>
      {header}
      {plan.highlighted && (
        <Badge variant="brand">
          <Sparkles aria-hidden />
          Recomendado
        </Badge>
      )}
      <div>
        <h2 className="text-xl font-extrabold">{plan.name || "Nome do plano"}</h2>
        {plan.description && <p className={cn("text-sm", dark ? "text-on-dark/70" : "text-ink-subtle")}>{plan.description}</p>}
      </div>
      <p>
        <span className="text-display">{formatPriceCents(plan.priceCents)}</span>
        <span className={cn("text-sm", dark ? "text-on-dark/70" : "text-ink-subtle")}> /{CYCLE_LABELS[plan.cycle]}</span>
      </p>
      {rules && (
        <p
          className={cn(
            "flex items-start gap-2 rounded-md px-3 py-2 text-sm font-semibold",
            dark ? "bg-on-dark/10 text-on-dark" : "bg-teal-soft text-cta-ink",
          )}
        >
          <CalendarCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {rules}
            {plan.coveredServiceNames && plan.coveredServiceNames.length > 0 && (
              <span className={cn("block text-xs font-medium", dark ? "text-on-dark/70" : "text-ink-subtle")}>
                Inclui: {plan.coveredServiceNames.join(", ")}
              </span>
            )}
          </span>
        </p>
      )}
      {plan.benefits.length > 0 && (
        <ul className="flex flex-col gap-2">
          {plan.benefits.map((b) => (
            <li key={b} className="flex items-start gap-2 text-[15px]">
              <Check className={cn("mt-0.5 size-4 shrink-0", dark ? "text-cta-on-dark" : "text-cta-ink")} aria-hidden />
              {b}
            </li>
          ))}
        </ul>
      )}
      {footer}
    </article>
  );
}
