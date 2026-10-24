import { cn } from "@/lib/utils";

export type WizardStep = "barber" | "service" | "schedule" | "summary";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "barber", label: "Barbeiro" },
  { key: "service", label: "Serviço" },
  { key: "schedule", label: "Horário" },
  { key: "summary", label: "Confirmar" },
];

/** Progresso do agendamento em 4 etapas (barras + rótulo da atual). */
export function StepIndicator({ current }: { current: WizardStep }) {
  const index = STEPS.findIndex((s) => s.key === current);
  return (
    <nav aria-label="Progresso do agendamento" className="flex flex-col gap-2">
      <ol className="grid grid-cols-4 gap-1.5">
        {STEPS.map((step, i) => (
          <li
            key={step.key}
            aria-current={i === index ? "step" : undefined}
            className={cn("h-1.5 rounded-full", i <= index ? "bg-cta" : "bg-hairline-strong")}
          >
            <span className="sr-only">{step.label}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
        Etapa {index + 1} de 4 · {STEPS[index]?.label}
      </p>
    </nav>
  );
}
