"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isNavItemActive, type NavItem } from "./nav-config";

/** Barra inferior flutuante (mobile/tablet) com ação principal ao centro. */
export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:hidden">
      <nav
        aria-label="Navegação principal"
        className="pointer-events-auto flex w-full max-w-md items-center rounded-2xl bg-cta px-1.5 py-1.5 shadow-float"
      >
        {items.map((item) => {
          const active = isNavItemActive(pathname, item);
          const Icon = item.icon;
          if (item.fab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className="flex min-w-0 flex-1 items-center justify-center"
              >
                <span
                  className={cn(
                    "flex size-12 items-center justify-center rounded-full bg-cta-foreground text-cta shadow-md transition-transform active:scale-95",
                    active && "ring-2 ring-cta-foreground/50 ring-offset-2 ring-offset-cta",
                  )}
                >
                  <Icon className="size-5" strokeWidth={2.25} aria-hidden />
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors",
                active ? "text-cta-foreground" : "text-cta-foreground/60 hover:text-cta-foreground/90",
              )}
            >
              <Icon className="size-5 shrink-0" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              <span className="max-w-full truncate text-[11px] font-semibold leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
