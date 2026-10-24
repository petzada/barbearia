import type { Metadata } from "next";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { requireOnboardedUser } from "@/server/auth";
import { listServices } from "@/server/catalog";
import { listBookableBarbers } from "@/server/team";
import { getShopSettings } from "@/server/settings";
import { BookingWizard } from "@/components/booking/booking-wizard";

export const metadata: Metadata = { title: "Agendar" };

export default async function AgendarPage() {
  const user = await requireOnboardedUser();
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  const [services, barbers, settings] = await Promise.all([
    listServices(db),
    listBookableBarbers(db),
    getShopSettings(db),
  ]);

  return (
    <main className="flex flex-1 flex-col px-5 pb-6 lg:px-0">
      <BookingWizard
        services={services.map(({ id, name, description, durationMinutes, priceCents }) => ({
          id,
          name,
          description,
          durationMinutes,
          priceCents,
        }))}
        barbers={barbers.filter((b) => b.id !== user.id)}
        rules={{
          bookingWindowDays: settings.bookingWindowDays,
          cancelUntilMinutes: settings.cancelUntilMinutes,
          onlinePayment: Boolean(env.abacatePayApiKey),
        }}
      />
    </main>
  );
}
