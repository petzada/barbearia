import { requireOnboardedUser } from "@/server/auth";
import { AppShell } from "@/components/shell/app-shell";
import { availableModes } from "@/lib/modes";

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();
  return (
    <AppShell mode="cliente" modes={availableModes(user)} userName={user.name} userImage={user.image ?? null}>
      {children}
    </AppShell>
  );
}
