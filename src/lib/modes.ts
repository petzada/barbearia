export type AppMode = "cliente" | "barbeiro" | "admin";

export const APP_MODES: AppMode[] = ["cliente", "barbeiro", "admin"];

export const MODE_COOKIE = "bdm_mode";

export const MODE_HOME: Record<AppMode, string> = {
  cliente: "/inicio",
  barbeiro: "/barbeiro",
  admin: "/admin",
};

export function availableModes(u: { isAdmin: boolean; isBarber: boolean }): AppMode[] {
  const modes: AppMode[] = ["cliente"];
  if (u.isBarber) modes.push("barbeiro");
  if (u.isAdmin) modes.push("admin");
  return modes;
}

/** Modo a usar: o preferido (cookie) se permitido; senão gestão > barbeiro > cliente. */
export function resolveMode(
  u: { isAdmin: boolean; isBarber: boolean },
  preferred?: string | null,
): AppMode {
  const modes = availableModes(u);
  if (preferred && (modes as string[]).includes(preferred)) return preferred as AppMode;
  return modes[modes.length - 1];
}
