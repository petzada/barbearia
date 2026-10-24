import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho de página. `brand` = faixa teal (telas iniciais no mobile);
 * `plain` = título grande sobre o fundo, estilo iOS (demais telas).
 */
export function PageHeader({
  title,
  description,
  actions,
  backHref,
  variant = "plain",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  variant?: "brand" | "plain";
  className?: string;
}) {
  const brand = variant === "brand";
  return (
    <header
      className={cn(
        brand
          ? "rounded-b-[28px] bg-cta px-5 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))] text-cta-foreground lg:mt-6 lg:rounded-[28px] lg:px-8"
          : "px-5 pb-2 pt-[calc(1.5rem+env(safe-area-inset-top))] lg:px-0 lg:pt-10",
        className,
      )}
    >
      {backHref && (
        <Link
          href={backHref}
          className={cn(
            "-ml-1 mb-3 inline-flex h-9 items-center gap-1 rounded-md pr-2 text-sm font-semibold",
            brand ? "text-cta-foreground/80" : "text-cta",
          )}
        >
          <ChevronLeft className="size-5" aria-hidden />
          Voltar
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight lg:text-[32px]">{title}</h1>
          {description != null && (
            <p className={cn("text-[15px]", brand ? "text-cta-foreground/80" : "text-ink-subtle")}>
              {description}
            </p>
          )}
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

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-hairline-strong px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-xs text-sm text-ink-subtle">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
