import type { Metadata } from "next";
import { getDb } from "@/server/db";
import { requireAdminUser, toActor } from "@/server/auth";
import { listPendingInvites, listTeam } from "@/server/team";
import { getBarberWeeks } from "@/server/schedule-config";
import { getBusinessHours } from "@/server/settings";
import { PageBody, PageHeader } from "@/components/page-header";
import { TeamManager } from "./team-manager";

export const metadata: Metadata = { title: "Equipe" };

export default async function EquipePage() {
  const user = await requireAdminUser();
  const actor = toActor(user);
  const db = await getDb();
  const [team, invites, shop] = await Promise.all([listTeam(db, actor), listPendingInvites(db, actor), getBusinessHours(db)]);
  const weeks = await getBarberWeeks(db, team.map((m) => m.id));
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Equipe" backHref="/admin/gestao" backLabel="Gestão" />
      <PageBody>
        <TeamManager
          currentUserId={user.id}
          shopWeek={shop}
          members={team.map((m) => ({ ...m, week: weeks.get(m.id) ?? [] }))}
          invites={invites.map((i) => ({ phoneNumber: i.phoneNumber, isBarber: i.isBarber, isAdmin: i.isAdmin }))}
        />
      </PageBody>
    </main>
  );
}
