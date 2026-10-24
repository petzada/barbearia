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
