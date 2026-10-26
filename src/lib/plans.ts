export const PLAN_CYCLES = [
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "SEMIANNUALLY",
  "ANNUALLY",
] as const;
export type PlanCycle = (typeof PLAN_CYCLES)[number];

export const CYCLE_LABELS: Record<PlanCycle, string> = {
  WEEKLY: "semana",
  MONTHLY: "mês",
  QUARTERLY: "trimestre",
  SEMIANNUALLY: "semestre",
  ANNUALLY: "ano",
};

export const CYCLE_OPTIONS: { value: PlanCycle; label: string }[] = [
  { value: "WEEKLY", label: "Semanal" },
  { value: "MONTHLY", label: "Mensal" },
  { value: "QUARTERLY", label: "Trimestral" },
  { value: "SEMIANNUALLY", label: "Semestral" },
  { value: "ANNUALLY", label: "Anual" },
];

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const WEEKDAY_PLURAL = ["domingos", "segundas", "terças", "quartas", "quintas", "sextas", "sábados"] as const;

/** "terças e quartas" — dias cobertos por um plano. */
export function formatAllowedWeekdays(days: number[]): string {
  const names = [...days].sort((a, b) => a - b).map((d) => WEEKDAY_PLURAL[d]);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
}

/** Resumo curto das regras: "4 por mês · Terças e quartas". */
export function planRulesSummary(rules: { visitsPerCycle: number; allowedWeekdays: number[]; cycle: PlanCycle }): string | null {
  if (rules.visitsPerCycle <= 0) return null;
  const days = rules.allowedWeekdays.length > 0 ? formatAllowedWeekdays(rules.allowedWeekdays) : "qualquer dia";
  const text = `${rules.visitsPerCycle} por ${CYCLE_LABELS[rules.cycle]} · ${days}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
