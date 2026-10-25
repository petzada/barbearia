import { cn } from "@/lib/utils";

export type WizardStep = "barber" | "service" | "schedule" | "summary";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "barber", label: "Barbeiro" },
  { key: "service", label: "Serviço" },
  { key: "schedule", label: "Horário" },
  { key: "summary", label: "Confirmar" },
];

/** Progresso do agendamento em 4 partes (vai na descrição do cabeçalho). */
export function StepIndicator({ current }: { current: WizardStep }) {
  const index = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="mt-2 flex flex-col gap-2">
    <p className="text-sm font-semibold text-ink-subtle" aria-live="polite">
      Etapa {index + 1} de 4 · {STEPS[index]?.label}
    </p>
    <ol className="grid grid-cols-4 gap-1.5" aria-hidden>
      {STEPS.map((step, i) => (
        <li
          key={step.key}
          className={cn("h-1.5 rounded-full transition-colors", i <= index ? "bg-cta" : "bg-hairline-strong")}
        >
          <span className="sr-only">{step.label}</span>
        </li>
      ))}
    </ol>
    </div>
  );
}
