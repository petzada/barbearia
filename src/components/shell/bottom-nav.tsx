"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isNavItemActive, type NavItem } from "./nav-config";

/**
 * Barra inferior fixa estilo iOS (mobile/tablet): fundo branco, linha fina no
 * topo, ícones cinza, ativo em teal e ação principal teal levemente elevada.
 */
export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-2xl items-stretch px-2">
        {items.map((item) => {
          const active = isNavItemActive(pathname, item);
          const Icon = item.icon;
          if (item.fab) {
            return (
              <li key={item.href} className="flex flex-1 justify-center">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className="-mt-5 flex flex-col items-center gap-1"
                >
                  <span
                    className={cn(
                      "flex size-14 items-center justify-center rounded-full bg-cta text-cta-foreground shadow-float ring-4 ring-card transition-transform active:scale-95",
                      active && "bg-cta/90",
                    )}
                  >
                    <Icon className="size-6" strokeWidth={2.25} aria-hidden />
                  </span>
                  <span className={cn("text-[11px] font-semibold", active ? "text-cta" : "text-ink-tertiary")}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          }
          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-1 transition-colors",
                  active ? "text-cta" : "text-ink-tertiary hover:text-ink-subtle",
                )}
              >
                <Icon className="size-6 shrink-0" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                <span className="max-w-full truncate text-[11px] font-semibold leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
