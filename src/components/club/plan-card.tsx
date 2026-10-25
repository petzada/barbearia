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
    <article className={cn("flex flex-col gap-4 rounded-lg p-6 shadow-card", dark ? "bg-ink text-white ring-2 ring-cta" : "bg-card")}>
      {header}
      {plan.highlighted && (
        <Badge className="w-fit bg-cta text-cta-foreground">
          <Sparkles aria-hidden />
          Recomendado
        </Badge>
      )}
      <div>
        <h2 className="text-xl font-extrabold">{plan.name || "Nome do plano"}</h2>
        {plan.description && <p className={cn("text-sm", dark ? "text-white/70" : "text-ink-subtle")}>{plan.description}</p>}
      </div>
      <p>
        <span className="tabular text-4xl font-extrabold tracking-tight">{formatPriceCents(plan.priceCents)}</span>
        <span className={cn("text-sm", dark ? "text-white/60" : "text-ink-subtle")}> /{CYCLE_LABELS[plan.cycle]}</span>
      </p>
      {plan.benefits.length > 0 && (
        <ul className="flex flex-col gap-2">
          {plan.benefits.map((b) => (
            <li key={b} className="flex items-start gap-2 text-[15px]">
              <Check className="mt-0.5 size-4 shrink-0 text-cta" aria-hidden />
              {b}
            </li>
          ))}
        </ul>
      )}
      {footer}
    </article>
  );
}
