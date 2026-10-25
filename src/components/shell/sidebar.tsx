"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-mark";
import { BarberAvatar } from "@/components/booking/barber-avatar";
import { isNavItemActive, MODE_HOME, MODE_LABELS, NAV_BY_MODE, type AppMode } from "./nav-config";

/** Navegação lateral para telas grandes (≥ 1024px). */
export function Sidebar({
  mode,
  modes,
  userName,
  userImage,
}: {
  mode: AppMode;
  modes: AppMode[];
  userName: string;
  userImage: string | null;
}) {
  const pathname = usePathname();
  const items = NAV_BY_MODE[mode];

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-hairline bg-card px-4 py-6 lg:flex">
      <Link href={MODE_HOME[mode]} className="px-2">
        <BrandMark />
      </Link>

      <nav aria-label="Navegação principal" className="flex flex-col gap-1">
        {items.map((item) => {
          const active = isNavItemActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors",
                active ? "bg-teal-soft text-cta-ink" : "text-ink-muted hover:bg-muted",
              )}
            >
              <Icon className="size-[18px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {modes.length > 1 && (
          <nav className="flex flex-col gap-1 rounded-lg bg-muted p-1" aria-label="Trocar modo">
            {modes.map((m) => (
              <Link
                key={m}
                href={`/modo/${m}`}
                prefetch={false}
                aria-current={m === mode ? "true" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-md px-3 text-sm font-semibold transition-colors",
                  m === mode ? "bg-card text-ink shadow-card" : "text-ink-subtle hover:text-ink",
                )}
              >
                {MODE_LABELS[m]}
              </Link>
            ))}
          </nav>
        )}
        <Link href="/perfil" className="flex min-h-11 items-center gap-3 rounded-md px-2 py-1 hover:bg-muted">
          <BarberAvatar name={userName} image={userImage} size="xs" />
          <span className="min-w-0 truncate text-sm font-semibold">{userName}</span>
        </Link>
      </div>
    </aside>
  );
}
