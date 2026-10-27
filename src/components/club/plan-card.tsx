import type { ReactNode } from "react";
import { CalendarCheck, Check } from "lucide-react";
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
  const rules = planRulesSummary({
    visitsPerCycle: plan.visitsPerCycle ?? 0,
    allowedWeekdays: plan.allowedWeekdays ?? [],
    cycle: plan.cycle,
  });
  // Tudo o que o plano inclui, em bullets: serviços cobertos e depois os benefícios.
  const included = [...new Set([...(plan.coveredServiceNames ?? []), ...plan.benefits])];
  return (
    // O destacado se diferencia só pela borda e pelo selo teal: mesmo fundo e mesmo layout.
    <article className={cn("relative flex w-full flex-col gap-4 rounded-lg bg-card p-6", plan.highlighted && "ring-2 ring-cta")}>
      {plan.highlighted && (
        <Badge variant="brand" className="absolute -top-3 left-1/2 -translate-x-1/2">
          Mais escolhido
        </Badge>
      )}
      {header}
      {/* Título e descrição com altura fixa: os preços ficam alinhados entre os cards. */}
      <div>
        <h2 className="line-clamp-1 text-xl font-extrabold">{plan.name || "Nome do plano"}</h2>
        <p className="line-clamp-2 min-h-[2lh] text-sm text-ink-subtle">{plan.description}</p>
      </div>
      <p>
        <span className="text-display">{formatPriceCents(plan.priceCents)}</span>
        <span className="text-sm text-ink-subtle"> /{CYCLE_LABELS[plan.cycle]}</span>
      </p>
      {rules && (
        <p className="flex items-start gap-2 rounded-md bg-teal-soft px-3 py-2 text-sm font-semibold text-cta-ink">
          <CalendarCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          {rules}
        </p>
      )}
      {included.length > 0 && (
        <ul className="flex flex-col gap-2">
          {included.map((b) => (
            <li key={b} className="flex items-start gap-2 text-[15px]">
              <Check className="mt-0.5 size-4 shrink-0 text-cta-ink" aria-hidden />
              {b}
            </li>
          ))}
        </ul>
      )}
      {footer}
    </article>
  );
}
