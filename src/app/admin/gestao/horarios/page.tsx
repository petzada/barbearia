import type { Metadata } from "next";
import { getDb } from "@/server/db";
import { requireAdminUser } from "@/server/auth";
import { getBusinessHours, getShopSettings } from "@/server/settings";
import { listUpcomingClosures } from "@/server/schedule-config";
import { PageBody, PageHeader } from "@/components/page-header";
import { HoursSettings } from "./hours-settings";

export const metadata: Metadata = { title: "Horários e regras" };

export default async function HorariosPage() {
  await requireAdminUser();
  const db = await getDb();
  const [week, settings, closures] = await Promise.all([getBusinessHours(db), getShopSettings(db), listUpcomingClosures(db)]);
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Horários e regras" backHref="/admin/gestao" backLabel="Gestão" />
      <PageBody className="gap-7">
        <HoursSettings
          week={week}
          closures={closures.map((c) => ({ dateKey: c.dateKey, reason: c.reason }))}
          settings={{
            shopName: settings.shopName,
            phone: settings.phone,
            address: settings.address,
            instagram: settings.instagram,
            slotIntervalMinutes: settings.slotIntervalMinutes,
            minLeadMinutes: settings.minLeadMinutes,
            bookingWindowDays: settings.bookingWindowDays,
            cancelUntilMinutes: settings.cancelUntilMinutes,
          }}
        />
      </PageBody>
    </main>
  );
}
