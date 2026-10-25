import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { rowClass, rowGroupClass, rowIconClass } from "@/lib/ui/classes";
import { cn } from "@/lib/utils";

// Sem "use client": pode receber ícones (componentes) vindos da página no servidor.

export { rowClass };

/** Grupo estilo Ajustes do iOS: título em caixa alta + lista em card. */
export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-ink-subtle">{title}</h2>
      <div className={rowGroupClass}>{children}</div>
    </section>
  );
}

export function RowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className={rowIconClass}>
      <Icon aria-hidden />
    </span>
  );
}

/** Linha que navega (ícone, rótulo, valor/status opcional e chevron). */
export function SettingsLink({
  href,
  icon,
  label,
  value,
  external = false,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  /** Status curto à direita (ex.: "6 ativos", "● Conectado"). */
  value?: ReactNode;
  external?: boolean;
}) {
  const content = (
    <>
      <RowIcon icon={icon} />
      <span className="flex-1 text-[15px] font-semibold">{label}</span>
      {value != null && <span className="max-w-[45%] truncate text-sm text-ink-subtle">{value}</span>}
      <ChevronRight className="size-4 shrink-0 text-ink-tertiary" aria-hidden />
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={rowClass}>
      {content}
    </a>
  ) : (
    <Link href={href} className={rowClass}>
      {content}
    </Link>
  );
}

/** Linha final de um grupo com uma ação inline (ex.: "+ Adicionar feriado"). */
export function SettingsAction({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn(rowClass, "font-semibold text-cta-ink disabled:opacity-50")}>
      <span className="flex size-9 shrink-0 items-center justify-center">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="flex-1 text-[15px]">{label}</span>
    </button>
  );
}
