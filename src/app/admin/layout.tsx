import { requireAdminUser } from "@/server/auth";
import { AppShell } from "@/components/shell/app-shell";
import { availableModes } from "@/lib/modes";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminUser();
  return (
    <AppShell mode="admin" modes={availableModes(user)} userName={user.name}>
      {children}
    </AppShell>
  );
}
