import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const backClass =
  "-ml-2 mb-2 inline-flex h-11 items-center gap-1 rounded-md pr-3 pl-1 text-sm font-semibold text-cta-ink transition-colors hover:bg-card/60";

/**
 * Cabeçalho de página: título grande sobre o fundo (estilo iOS), ações à
 * direita. Ações de criação vão em `actions` (Button size="sm" com ícone +).
 */
export function PageHeader({
  title,
  description,
  actions,
  backHref,
  onBack,
  backLabel = "Voltar",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  /** Voltar controlado (ex.: etapas do wizard). Tem prioridade sobre `backHref`. */
  onBack?: () => void;
  backLabel?: string;
  className?: string;
}) {
  return (
    <header className={cn("px-5 pb-2 pt-[calc(1.5rem+env(safe-area-inset-top))] lg:px-0 lg:pt-10", className)}>
      {onBack ? (
        <button type="button" onClick={onBack} className={backClass}>
          <ChevronLeft className="size-5" aria-hidden />
          {backLabel}
        </button>
      ) : (
        backHref && (
          <Link href={backHref} className={backClass}>
            <ChevronLeft className="size-5" aria-hidden />
            {backLabel}
          </Link>
        )
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight lg:text-[32px]">{title}</h1>
          {description != null && <div className="text-[15px] text-ink-subtle">{description}</div>}
        </div>
        {actions != null && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Corpo padrão das páginas (espaçamento lateral de 20px no mobile). */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-6 px-5 py-5 lg:px-0", className)}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <h2 className="text-lg font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
} & (
  | {
      /** Telas principais: a próxima ação é obrigatória. */
      compact?: false;
      action: ReactNode;
    }
  | {
      /** Seções secundárias (dentro de uma tela que já tem ação). */
      compact: true;
      action?: ReactNode;
    }
);

/** Lista vazia: ícone + frase curta + botão com a próxima ação. */
export function EmptyState({ icon: Icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        compact ? "gap-1.5 rounded-lg bg-card px-5 py-6 shadow-card" : "gap-2 rounded-lg bg-card px-6 py-10 shadow-card",
      )}
    >
      {Icon && (
        <span
          className={cn(
            "mb-1 flex items-center justify-center rounded-full bg-teal-soft text-cta-ink",
            compact ? "size-10" : "size-12",
          )}
        >
          <Icon className={compact ? "size-5" : "size-6"} aria-hidden />
        </span>
      )}
      <p className="font-bold">{title}</p>
      {description && <p className="max-w-xs text-sm text-ink-subtle">{description}</p>}
      {action && <div className={compact ? "mt-2" : "mt-3"}>{action}</div>}
    </div>
  );
}
