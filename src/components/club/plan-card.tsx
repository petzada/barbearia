import type { ReactNode } from "react";
import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPriceCents } from "@/lib/agenda/availability";
import { CYCLE_LABELS, type PlanCycle } from "@/lib/plans";
import { cn } from "@/lib/utils";

export type PlanCardData = {
  name: string;
  description: string | null;
  priceCents: number;
  cycle: PlanCycle;
  benefits: string[];
  highlighted: boolean;
};

/** Card de plano do Clube — o mesmo no app do cliente e na prévia da gestão. */
export function PlanCard({ plan, footer, header }: { plan: PlanCardData; footer?: ReactNode; header?: ReactNode }) {
  const dark = plan.highlighted;
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
