import { cn } from "@/lib/utils";

export type WizardStep = "barber" | "service" | "schedule" | "summary";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "barber", label: "Barbeiro" },
  { key: "service", label: "Serviço" },
  { key: "schedule", label: "Horário" },
  { key: "summary", label: "Confirmar" },
];

/** Progresso do agendamento em 4 partes. */
export function StepIndicator({ current }: { current: WizardStep }) {
  const index = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="grid grid-cols-4 gap-1.5" aria-label={`Etapa ${index + 1} de 4: ${STEPS[index]?.label}`}>
      {STEPS.map((step, i) => (
        <li
          key={step.key}
          aria-current={i === index ? "step" : undefined}
          className={cn("h-1.5 rounded-full transition-colors", i <= index ? "bg-cta" : "bg-hairline-strong")}
        >
          <span className="sr-only">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}
