import type { Metadata } from "next";
import { getDb } from "@/server/db";
import { getServerEnv } from "@/server/env";
import { requireOnboardedUser } from "@/server/auth";
import { listServices } from "@/server/catalog";
import { listBookableBarbers } from "@/server/team";
import { getShopSettings } from "@/server/settings";
import { getAvailableDays, getAvailableSlots } from "@/server/scheduling";
import { getSelectableDateKeys } from "@/lib/agenda/availability";
import { BookingWizard } from "@/components/booking/booking-wizard";

export const metadata: Metadata = { title: "Agendar" };

export default async function AgendarPage({
  searchParams,
}: {
  searchParams: Promise<{ barbeiro?: string; servico?: string }>;
}) {
  const user = await requireOnboardedUser();
  const params = await searchParams;
  const [db, env] = await Promise.all([getDb(), getServerEnv()]);
  const [services, barbers, settings] = await Promise.all([
    listServices(db),
    listBookableBarbers(db),
    getShopSettings(db),
  ]);

  // "Agendar de novo": barbeiro + serviço já escolhidos → abre direto nos horários.
  const presetBarber = barbers.find((b) => b.id === params.barbeiro && b.id !== user.id);
  const presetService = services.find((s) => s.id === params.servico);
  let initialSchedule: { days: string[]; day: string | null; slots: number[] } | undefined;
  if (presetBarber && presetService) {
    const windowKeys = getSelectableDateKeys(settings.bookingWindowDays);
    const days = await getAvailableDays(db, {
      barberId: presetBarber.id,
      serviceId: presetService.id,
      from: windowKeys[0],
      to: windowKeys[windowKeys.length - 1],
    });
    const day = days[0] ?? null;
    const slots = day
      ? await getAvailableSlots(db, { barberId: presetBarber.id, serviceId: presetService.id, dateKey: day })
      : [];
    initialSchedule = { days, day, slots };
  }

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
        initialBarberId={params.barbeiro}
        initialServiceId={params.servico}
        initialSchedule={initialSchedule}
      />
    </main>
  );
}
