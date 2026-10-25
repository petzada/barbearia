import { getDb } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { getClientAppointment } from "@/server/scheduling";
import { getShopSettings } from "@/server/settings";
import { buildIcsEvent } from "@/lib/calendar/ics";

/** "Adicionar à agenda": evento .ics do agendamento do próprio cliente. */
export async function GET(_request: Request, ctx: RouteContext<"/agendamentos/[id]/ics">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  const db = await getDb();
  const [entry, settings] = await Promise.all([getClientAppointment(db, user.id, id), getShopSettings(db)]);
  if (!entry) return new Response("Não encontrado", { status: 404 });

  const ics = buildIcsEvent({
    uid: entry.id,
    start: entry.startsAt,
    end: entry.endsAt,
    summary: `${entry.serviceName ?? "Atendimento"} com ${entry.barberName} · ${settings.shopName}`,
    description: `Agendamento na ${settings.shopName}. Cancele pelo app se não puder ir.`,
    location: settings.address,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="barbearia-do-moura-${entry.id.slice(0, 8)}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
