import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Cabeçalho de página: título grande sobre o fundo (estilo iOS), ações à direita. */
export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "Voltar",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <header className={cn("px-5 pb-2 pt-[calc(1.5rem+env(safe-area-inset-top))] lg:px-0 lg:pt-10", className)}>
      {backHref && (
        <Link
          href={backHref}
          className="-ml-1 mb-3 inline-flex h-10 items-center gap-1 rounded-md pr-2 text-sm font-semibold text-cta"
        >
          <ChevronLeft className="size-5" aria-hidden />
          {backLabel}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight lg:text-[32px]">{title}</h1>
          {description != null && <p className="text-[15px] text-ink-subtle">{description}</p>}
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
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

/** Lista vazia: ícone + frase curta + botão com a próxima ação. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg bg-card px-6 py-10 text-center shadow-card">
      {Icon && (
        <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-teal-soft text-cta">
          <Icon className="size-6" aria-hidden />
        </span>
      )}
      <p className="font-bold">{title}</p>
      {description && <p className="max-w-xs text-sm text-ink-subtle">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
