import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

// Sem "use client": pode receber ícones (componentes) vindos da página no servidor.

export const rowClass = "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left text-[15px]";

/** Grupo estilo Ajustes do iOS: título em caixa alta + lista em card. */
export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-ink-subtle">{title}</h2>
      <div className="divide-y divide-hairline overflow-hidden rounded-lg bg-card shadow-card">{children}</div>
    </section>
  );
}

export function RowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-teal-soft text-cta">
      <Icon className="size-[18px]" aria-hidden />
    </span>
  );
}

export function SettingsLink({
  href,
  icon,
  label,
  external = false,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  external?: boolean;
}) {
  const content = (
    <>
      <RowIcon icon={icon} />
      <span className="flex-1 font-semibold">{label}</span>
      <ChevronRight className="size-4 text-ink-tertiary" aria-hidden />
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={`${rowClass} active:bg-muted`}>
      {content}
    </a>
  ) : (
    <Link href={href} className={`${rowClass} active:bg-muted`}>
      {content}
    </Link>
  );
}
