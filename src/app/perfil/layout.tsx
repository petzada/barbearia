import { cookies } from "next/headers";
import { requireOnboardedUser } from "@/server/auth";
import { AppShell } from "@/components/shell/app-shell";
import { availableModes, MODE_COOKIE, resolveMode } from "@/lib/modes";

/** Perfil é comum a todos: usa a navegação do modo atual (cookie). */
export default async function PerfilLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();
  const mode = resolveMode(user, (await cookies()).get(MODE_COOKIE)?.value ?? "cliente");
  return (
    <AppShell mode={mode} modes={availableModes(user)} userName={user.name}>
      {children}
    </AppShell>
  );
}
