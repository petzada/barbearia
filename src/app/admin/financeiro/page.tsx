import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Download, Receipt } from "lucide-react";
import { getDb } from "@/server/db";
import { requireAdminUser, toActor } from "@/server/auth";
import { getDashboard } from "@/server/reports";
import { listReceipts } from "@/server/finance";
import { getCommissionSummary, listPayouts, PAYOUT_METHOD_LABELS, type PayoutMethod } from "@/server/payouts";
import { EmptyState, PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { BarberAvatar } from "@/components/booking/barber-avatar";
import { SegmentedNav } from "@/components/kit/segmented";
import { buttonVariants } from "@/components/ui/button";
import { formatPriceCents, formatSlotTime } from "@/lib/agenda/availability";
import { formatDateRange, formatDayLabel } from "@/lib/agenda/format";
import { PAYMENT_CHANNEL_LABELS, paymentMethodLabel } from "@/lib/payments";
import { chipClass, staticRowClass } from "@/lib/ui/classes";
import { resolvePeriod } from "@/lib/periods";
import { cn, countLabel } from "@/lib/utils";
import { PayoutButton } from "./payout-button";

export const metadata: Metadata = { title: "Financeiro" };

type Tab = "resumo" | "recebimentos" | "comissoes";
const TABS: { key: Tab; label: string }[] = [
  { key: "resumo", label: "Resumo" },
  { key: "recebimentos", label: "Recebimentos" },
  { key: "comissoes", label: "Comissões" },
];

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; aba?: string; forma?: string }>;
}) {
  const params = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === params.aba) ? (params.aba as Tab) : "resumo";
  const forma = params.forma === "online" || params.forma === "balcao" ? params.forma : undefined;
  const period = resolvePeriod(params.periodo);
  const user = await requireAdminUser();
  const actor = toActor(user);
  const db = await getDb();
  const qs = (extra: Record<string, string | undefined>) =>
    new URLSearchParams(Object.entries({ periodo: period.key, aba: tab, ...extra }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title="Financeiro"
        actions={
          tab !== "resumo" ? (
            <a
              href={`/admin/financeiro/exportar?tipo=${tab === "comissoes" ? "comissoes" : "recebimentos"}&periodo=${period.key}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Download aria-hidden />
              Exportar CSV
            </a>
          ) : undefined
        }
      />
      <PageBody>
        <PeriodFilter basePath="/admin/financeiro" current={period.key} query={{ aba: tab }} />
        <SegmentedNav
          label="Seções do financeiro"
          items={TABS.map((t) => ({
            href: `/admin/financeiro?${new URLSearchParams({ periodo: period.key, aba: t.key }).toString()}`,
            label: t.label,
            current: tab === t.key,
          }))}
        />

        {tab === "resumo" && <Resumo db={db} actor={actor} period={period} />}
        {tab === "recebimentos" && <Recebimentos db={db} actor={actor} period={period} forma={forma} qs={qs} />}
        {tab === "comissoes" && <Comissoes db={db} actor={actor} period={period} />}
      </PageBody>
    </main>
  );
}

function AgendaLink() {
  return (
    <Link href="/admin/agenda" className={buttonVariants({ size: "lg" })}>
      <CalendarDays aria-hidden />
      Abrir agenda
    </Link>
  );
}

type Ctx = { db: Awaited<ReturnType<typeof getDb>>; actor: ReturnType<typeof toActor>; period: { from: string; to: string } };

async function Resumo({ db, actor, period }: Ctx) {
  const { kpis: k } = await getDashboard(db, actor, period);
  const result = k.servicesRevenueCents + k.subscriptionRevenueCents - k.commissionsCents;
  const rows = [
    { label: "Faturamento de serviços", value: k.servicesRevenueCents, hint: countLabel(k.completedCount, "atendimento concluído", "atendimentos concluídos") },
    { label: "Recebido online", value: k.receivedOnlineCents, hint: "Pix e cartão via AbacatePay" },
    { label: "Recebido no balcão", value: k.receivedLocalCents, hint: "Dinheiro, cartão e Pix presencial" },
    { label: "Assinaturas do clube", value: k.subscriptionRevenueCents, hint: "Pagamentos no período" },
  ];
  return (
    <section className="flex flex-col gap-3">
      <ul className="divide-y divide-hairline rounded-lg bg-card shadow-card">
        {rows.map((r) => (
          <li key={r.label} className={cn(staticRowClass, "text-base")}>
            <span>
              <span className="block font-semibold">{r.label}</span>
              <span className="text-xs text-ink-subtle">{r.hint}</span>
            </span>
            <span className="tabular font-bold">{formatPriceCents(r.value)}</span>
          </li>
        ))}
        <li className={cn(staticRowClass, "text-base")}>
          <span className="font-semibold">(−) Comissões</span>
          <span className="tabular font-bold text-destructive">{formatPriceCents(k.commissionsCents)}</span>
        </li>
        <li className={cn(staticRowClass, "bg-teal-soft text-base")}>
          <span>
            <span className="block font-extrabold">Resultado estimado</span>
            <span className="text-xs text-ink-subtle">Serviços + clube − comissões</span>
          </span>
          <span className="tabular text-lg font-extrabold">{formatPriceCents(result)}</span>
        </li>
      </ul>
      <p className="text-xs text-ink-subtle">
        Faturamento conta os atendimentos concluídos no período; recebimentos contam a data do pagamento.
      </p>
    </section>
  );
}

async function Recebimentos({ db, actor, period, forma, qs }: Ctx & { forma?: "online" | "balcao"; qs: (e: Record<string, string | undefined>) => string }) {
  const receipts = await listReceipts(db, actor, period, { method: forma });
  const total = receipts.reduce((s, r) => s + r.amountCents, 0);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: undefined, label: "Todos" },
          { key: "online", label: PAYMENT_CHANNEL_LABELS.online },
          { key: "balcao", label: PAYMENT_CHANNEL_LABELS.balcao },
        ].map((f) => (
          <Link
            key={f.label}
            href={`/admin/financeiro?${qs({ forma: f.key })}`}
            aria-current={forma === f.key ? "true" : undefined}
            className={cn("px-4", chipClass)}
          >
            {f.label}
          </Link>
        ))}
        <span className="tabular ml-auto text-sm font-bold">{formatPriceCents(total)}</span>
      </div>
      {receipts.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={forma ? "Nenhum recebimento com esse filtro" : "Nenhum recebimento no período"}
          description={forma ? undefined : "Pagamentos online e os registrados na agenda aparecem aqui."}
          action={
            forma ? (
              <Link href={`/admin/financeiro?${qs({ forma: undefined })}`} className={buttonVariants({ size: "lg" })}>
                Ver todos
              </Link>
            ) : (
              <AgendaLink />
            )
          }
        />
      ) : (
        <ul className="divide-y divide-hairline rounded-lg bg-card shadow-card">
          {receipts.map((r) => (
            <li key={r.id} className={staticRowClass}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.clientName ?? "Cliente"} · {r.kind === "subscription" ? "Clube" : "Atendimento"}</p>
                <p className="text-ink-subtle">
                  {r.paidAt ? `${formatDayLabel(r.paidAt)} · ${formatSlotTime(r.paidAt)}` : "—"} · {paymentMethodLabel(r.method)}
                </p>
              </div>
              <span className="tabular font-bold">{formatPriceCents(r.amountCents)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function Comissoes({ db, actor, period }: Ctx) {
  const [summary, payouts] = await Promise.all([getCommissionSummary(db, actor, period), listPayouts(db, actor, { limit: 10 })]);
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        {summary.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Sem comissões no período"
            description="Comissões aparecem quando os atendimentos são concluídos."
            action={<AgendaLink />}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {summary.map((s) => (
              <li key={s.barberId} className="flex flex-col gap-4 rounded-lg bg-card p-5 shadow-card">
                <div className="flex items-center gap-3">
                  <BarberAvatar name={s.name} image={s.image} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{s.name}</p>
                    <p className="text-sm text-ink-subtle">{countLabel(s.completed, "atendimento", "atendimentos")}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-ink-subtle">Gerado</dt>
                    <dd className="tabular font-bold">{formatPriceCents(s.generatedCents)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-subtle">Pago</dt>
                    <dd className="tabular font-bold text-success-ink">{formatPriceCents(s.paidCents)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-subtle">A pagar</dt>
                    <dd className="tabular font-bold">{formatPriceCents(s.toPayCents)}</dd>
                  </div>
                </dl>
                {s.toPayCents > 0 && (
                  <PayoutButton barberId={s.barberId} barberName={s.name} amountCents={s.toPayCents} from={period.from} to={period.to} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      {payouts.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle>Repasses feitos</SectionTitle>
          <ul className="divide-y divide-hairline rounded-lg bg-card shadow-card">
            {payouts.map((p) => (
              <li key={p.id} className={staticRowClass}>
                <span>
                  <span className="block font-semibold">{p.barberName}</span>
                  <span className="text-ink-subtle">
                    {formatDateRange(p.periodFrom, p.periodTo)} · {PAYOUT_METHOD_LABELS[p.method as PayoutMethod] ?? p.method}
                  </span>
                </span>
                <span className="tabular font-bold">{formatPriceCents(p.amountCents)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
