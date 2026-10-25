import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { Sidebar } from "./sidebar";
import { NAV_BY_MODE, type AppMode } from "./nav-config";

/**
 * Layout das áreas logadas. Mobile/tablet: conteúdo em coluna + barra
 * inferior. Desktop (lg+): sidebar fixa à esquerda e conteúdo largo.
 */
export function AppShell({
  mode,
  modes,
  userName,
  children,
}: {
  mode: AppMode;
  modes: AppMode[];
  userName: string;
  children: ReactNode;
}) {
  const items = NAV_BY_MODE[mode];
  return (
    <div className="flex min-h-dvh">
      <Sidebar items={items} mode={mode} modes={modes} userName={userName} />
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-10">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col lg:max-w-5xl lg:px-6">
          {children}
        </div>
      </div>
      <BottomNav items={items} />
    </div>
  );
}
