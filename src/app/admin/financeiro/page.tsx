import type { Metadata } from "next";
import Link from "next/link";
import { Download, Receipt } from "lucide-react";
import { getDb } from "@/server/db";
import { requireAdminUser, toActor } from "@/server/auth";
import { getDashboard } from "@/server/reports";
import { listReceipts, PAYMENT_METHOD_LABELS } from "@/server/finance";
import { getCommissionSummary, listPayouts, PAYOUT_METHOD_LABELS, type PayoutMethod } from "@/server/payouts";
import { EmptyState, PageBody, PageHeader, SectionTitle } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { BarberAvatar } from "@/components/booking/barber-avatar";
import { buttonVariants } from "@/components/ui/button";
import { dateKeyFromIsoInSP, formatPriceCents, formatSelectableDay, formatSlotTime } from "@/lib/agenda/availability";
import { resolvePeriod } from "@/lib/periods";
import { cn } from "@/lib/utils";
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
              CSV
            </a>
          ) : undefined
        }
      />
      <PageBody>
        <PeriodFilter basePath="/admin/financeiro" current={period.key} query={{ aba: tab }} />
        <nav className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" aria-label="Seções do financeiro">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/admin/financeiro?${new URLSearchParams({ periodo: period.key, aba: t.key }).toString()}`}
              aria-current={tab === t.key ? "page" : undefined}
              className={cn(
                "flex h-10 items-center justify-center rounded-md text-sm font-bold transition",
                tab === t.key ? "bg-card text-ink shadow-card" : "text-ink-subtle",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {tab === "resumo" && <Resumo db={db} actor={actor} period={period} />}
        {tab === "recebimentos" && <Recebimentos db={db} actor={actor} period={period} forma={forma} qs={qs} />}
        {tab === "comissoes" && <Comissoes db={db} actor={actor} period={period} />}
      </PageBody>
    </main>
  );
}

type Ctx = { db: Awaited<ReturnType<typeof getDb>>; actor: ReturnType<typeof toActor>; period: { from: string; to: string } };

async function Resumo({ db, actor, period }: Ctx) {
  const { kpis: k } = await getDashboard(db, actor, period);
  const result = k.servicesRevenueCents + k.subscriptionRevenueCents - k.commissionsCents;
  const rows = [
    { label: "Faturamento de serviços", value: k.servicesRevenueCents, hint: `${k.completedCount} atendimentos concluídos` },
    { label: "Recebido online", value: k.receivedOnlineCents, hint: "Pix e cartão via AbacatePay" },
    { label: "Recebido no balcão", value: k.receivedLocalCents, hint: "Dinheiro, cartão e Pix presencial" },
    { label: "Assinaturas do clube", value: k.subscriptionRevenueCents, hint: "Pagamentos no período" },
  ];
  return (
    <section className="flex flex-col gap-3">
      <ul className="divide-y divide-hairline rounded-lg bg-card shadow-card">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 px-5 py-4">
            <span>
              <span className="block font-semibold">{r.label}</span>
              <span className="text-xs text-ink-subtle">{r.hint}</span>
            </span>
            <span className="tabular font-bold">{formatPriceCents(r.value)}</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 px-5 py-4">
          <span className="font-semibold">(−) Comissões</span>
          <span className="tabular font-bold text-destructive">{formatPriceCents(k.commissionsCents)}</span>
        </li>
        <li className="flex items-center justify-between gap-3 bg-teal-soft px-5 py-4">
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
          { key: "online", label: "Online" },
          { key: "balcao", label: "Balcão" },
        ].map((f) => (
          <Link
            key={f.label}
            href={`/admin/financeiro?${qs({ forma: f.key })}`}
            aria-pressed={forma === f.key}
            className="flex h-9 items-center rounded-md border border-hairline-strong bg-card px-4 text-sm font-semibold aria-pressed:border-cta aria-pressed:bg-cta aria-pressed:text-cta-foreground"
          >
            {f.label}
          </Link>
        ))}
        <span className="tabular ml-auto text-sm font-bold">{formatPriceCents(total)}</span>
      </div>
      {receipts.length === 0 ? (
        <EmptyState icon={Receipt} title="Nenhum recebimento no período" />
      ) : (
        <ul className="divide-y divide-hairline rounded-lg bg-card shadow-card">
          {receipts.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.clientName ?? "Cliente"} · {r.kind === "subscription" ? "Clube" : "Atendimento"}</p>
                <p className="text-ink-subtle capitalize">
                  {r.paidAt ? `${formatSelectableDay(dateKeyFromIsoInSP(r.paidAt))} · ${formatSlotTime(r.paidAt)}` : "—"} ·{" "}
                  {PAYMENT_METHOD_LABELS[r.method] ?? r.method}
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
          <EmptyState icon={Receipt} title="Sem comissões no período" description="Comissões aparecem quando os atendimentos são concluídos." />
        ) : (
          <ul className="flex flex-col gap-3">
            {summary.map((s) => (
              <li key={s.barberId} className="flex flex-col gap-4 rounded-lg bg-card p-5 shadow-card">
                <div className="flex items-center gap-3">
                  <BarberAvatar name={s.name} image={s.image} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{s.name}</p>
                    <p className="text-sm text-ink-subtle">{s.completed} atendimentos</p>
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-ink-subtle">Gerado</dt>
                    <dd className="tabular font-bold">{formatPriceCents(s.generatedCents)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-subtle">Pago</dt>
                    <dd className="tabular font-bold text-success">{formatPriceCents(s.paidCents)}</dd>
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
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span>
                  <span className="block font-semibold">{p.barberName}</span>
                  <span className="text-ink-subtle">
                    {formatSelectableDay(p.periodFrom)} – {formatSelectableDay(p.periodTo)} · {PAYOUT_METHOD_LABELS[p.method as PayoutMethod] ?? p.method}
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
