import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  CalendarDays,
  CalendarOff,
  Crown,
  Home,
  LayoutDashboard,
  Scissors,
  Settings2,
  Sun,
  User,
  Wallet,
} from "lucide-react";

import type { AppMode } from "@/lib/modes";

export type { AppMode };
export { MODE_HOME } from "@/lib/modes";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Botão central em destaque na barra inferior. */
  fab?: boolean;
  /** Prefixos que também marcam o item como ativo. */
  matchPrefix?: string[];
  /** Ativo só na rota exata (ex.: "/admin" não deve casar "/admin/x"). */
  exact?: boolean;
};

export const NAV_BY_MODE: Record<AppMode, NavItem[]> = {
  cliente: [
    { href: "/inicio", label: "Início", icon: Home },
    { href: "/agendamentos", label: "Agendamentos", icon: CalendarDays },
    { href: "/agendar", label: "Agendar", icon: Scissors, fab: true },
    { href: "/clube", label: "Clube", icon: Crown },
    { href: "/perfil", label: "Perfil", icon: User },
  ],
  barbeiro: [
    { href: "/barbeiro", label: "Hoje", icon: Sun, exact: true },
    { href: "/barbeiro/ganhos", label: "Ganhos", icon: Wallet },
    { href: "/barbeiro/agenda", label: "Agenda", icon: CalendarDays, fab: true },
    { href: "/barbeiro/bloqueios", label: "Bloqueios", icon: CalendarOff },
    { href: "/perfil", label: "Perfil", icon: User },
  ],
  admin: [
    { href: "/admin", label: "Painel", icon: LayoutDashboard, exact: true },
    { href: "/admin/financeiro", label: "Financeiro", icon: Banknote },
    { href: "/admin/agenda", label: "Agenda", icon: CalendarDays, fab: true },
    { href: "/admin/clube", label: "Clube", icon: Crown },
    { href: "/admin/gestao", label: "Gestão", icon: Settings2, matchPrefix: ["/perfil"] },
  ],
};

export const MODE_LABELS: Record<AppMode, string> = {
  cliente: "Cliente",
  barbeiro: "Modo barbeiro",
  admin: "Modo gestão",
};

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true;
  if (!item.exact && pathname.startsWith(`${item.href}/`)) return true;
  return (item.matchPrefix ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
