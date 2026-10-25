import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, CalendarOff } from "lucide-react";
import { getDb } from "@/server/db";
import { requireBarberUser, toActor } from "@/server/auth";
import { listAgendaForDay, listPendingCompletion } from "@/server/scheduling";
import { getBarberEarnings } from "@/server/reports";
import { PageBody, PageHeader, SectionTitle, EmptyState } from "@/components/page-header";
import { StatTile } from "@/components/period-filter";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { dateKeyFromIsoInSP, formatPriceCents, formatSlotTime } from "@/lib/agenda/availability";
import { todayDateKeySP } from "@/lib/agenda/timezone";
import { getFirstName } from "@/lib/profile/display-name";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Hoje" };

function greeting(now: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(now));
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

export default async function BarbeiroHojePage() {
  const user = await requireBarberUser();
  const actor = toActor(user);
  const db = await getDb();
  const today = todayDateKeySP();
  const now = new Date();
  const [agenda, pending, earnings] = await Promise.all([
    listAgendaForDay(db, actor, { dateKey: today, barberId: user.id }),
    listPendingCompletion(db, actor, { barberId: user.id, now }),
    getBarberEarnings(db, actor, user.id, { from: today, to: today }),
  ]);
  const appointments = agenda.filter((e) => e.type === "appointment");
  const upcoming = appointments.filter((e) => e.status === "booked" && e.endsAt > now);
  const next = upcoming[0];

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title={`${greeting(now)}, ${getFirstName(user.name)}!`}
        description={
          upcoming.length > 0
            ? `${upcoming.length} atendimento${upcoming.length > 1 ? "s" : ""} pela frente hoje.`
            : "Agenda livre pelo resto do dia."
        }
      />
      <PageBody className="gap-8">
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Hoje" value={String(appointments.filter((a) => a.status !== "cancelled").length)} hint="agendados" />
          <StatTile label="Feitos" value={String(earnings.completedCount)} hint="concluídos" />
          <StatTile label="Ganhos" value={formatPriceCents(earnings.totalCommissionCents)} hint="comissão" tone="brand" />
        </div>

        {pending.length > 0 && (
          <Link
            href={`/barbeiro/agenda?dia=${dateKeyFromIsoInSP(pending[0].startsAt)}`}
            className="flex items-center gap-3 rounded-lg bg-warning/12 p-4 text-sm font-semibold text-warning"
          >
            <AlertCircle className="size-5 shrink-0" aria-hidden />
            {pending.length} atendimento{pending.length > 1 ? "s" : ""} aguardando conclusão. Toque para finalizar.
          </Link>
        )}

        <section className="flex flex-col gap-3">
          <SectionTitle
            action={
              <Link href="/barbeiro/agenda" className="text-sm font-bold text-cta">
                Agenda completa
              </Link>
            }
          >
            Próximos
          </SectionTitle>
          {upcoming.length === 0 ? (
            <EmptyState
              title="Sem próximos atendimentos"
              description="Quando um cliente agendar, ele aparece aqui."
              action={
                <Link href="/barbeiro/bloqueios" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  <CalendarOff aria-hidden />
                  Bloquear horário
                </Link>
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {upcoming.map((e) => (
                <li
                  key={e.id}
                  className={cn(
                    "flex items-center gap-4 rounded-lg bg-card p-4 shadow-card",
                    e.id === next?.id && "ring-2 ring-cta/30",
                  )}
                >
                  <div className="tabular w-16 shrink-0 text-center">
                    <p className="text-lg font-extrabold">{formatSlotTime(e.startsAt)}</p>
                    <p className="text-xs text-ink-subtle">até {formatSlotTime(e.endsAt)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{e.clientName ?? "Cliente"}</p>
                    <p className="truncate text-sm text-ink-subtle">{e.serviceName}</p>
                  </div>
                  {e.id === next?.id && <Badge variant="soft">Próximo</Badge>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageBody>
    </main>
  );
}
