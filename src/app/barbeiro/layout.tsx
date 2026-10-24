import { requireBarberUser } from "@/server/auth";
import { AppShell } from "@/components/shell/app-shell";
import { availableModes } from "@/lib/modes";

export default async function BarbeiroLayout({ children }: { children: React.ReactNode }) {
  const user = await requireBarberUser();
  return (
    <AppShell mode="barbeiro" modes={availableModes(user)} userName={user.name}>
      {children}
    </AppShell>
  );
}
