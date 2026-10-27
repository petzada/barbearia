"use client";

import { useState } from "react";
import { useSheetState } from "@/components/kit/use-sheet-state";
import { useRouter } from "next/navigation";
import { Ban, ChevronRight, CreditCard, Plus, Receipt, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminCancelSubscriptionAction,
  adminChargeSubscriptionAction,
  adminRefundSubscriptionAction,
  grantManualSubscriptionAction,
  renewManualSubscriptionAction,
  subscriptionDetailAction,
} from "@/app/actions/admin";
import { BottomSheet } from "@/components/kit/bottom-sheet";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { ChipGroup } from "@/components/kit/option-card";
import { FieldLabel } from "@/components/kit/field-label";
import { Segmented } from "@/components/kit/segmented";
import { EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPriceCents } from "@/lib/agenda/availability";
import { formatDayLabel, formatDayMonth } from "@/lib/agenda/format";
import { LOCAL_PAYMENT_SHORT_LABELS, paymentMethodLabel } from "@/lib/payments";
import {
  billingMethodLabel,
  subscriptionStatusLabel,
  type ClubBillingMethod,
  type ClubSubscriptionStatus,
} from "@/lib/club-billing";
import { LOCAL_PAYMENT_METHODS, type LocalPaymentMethod } from "@/lib/validations/agendamento";
import { formatBrazilPhone, maskBrazilPhoneInput } from "@/lib/phone";
import { rowClass, rowGroupClass, staticRowClass } from "@/lib/ui/classes";
import { cn } from "@/lib/utils";
import { useBusyTransition } from "@/components/loading/busy";

type Row = {
  subscriptionId: string;
  name: string;
  planName: string;
  paymentMethod: ClubBillingMethod | null;
  cardLastFour: string | null;
  status: ClubSubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
  nextChargeAt: number | null;
};

const fmtDay = (ms: number | null) => (ms ? formatDayLabel(ms) : "—");
const LOCAL_OPTIONS = LOCAL_PAYMENT_METHODS.map((m) => ({ value: m, label: LOCAL_PAYMENT_SHORT_LABELS[m] }));
const SEVEN_DAYS = 7 * 86_400_000;
const PAYMENT_STATUS: Partial<Record<string, { label: string; variant: "muted" | "warning" | "destructive" }>> = {
  failed: { label: "Recusado", variant: "warning" },
  refunded: { label: "Estornado", variant: "muted" },
  disputed: { label: "Contestado", variant: "destructive" },
};

type Detail = Extract<Awaited<ReturnType<typeof subscriptionDetailAction>>, { ok: true }>["data"];

function StatusBadge({ status, cancelAtPeriodEnd }: { status: ClubSubscriptionStatus; cancelAtPeriodEnd: boolean }) {
  if (status === "past_due") return <Badge variant="warning">Pagamento pendente</Badge>;
  if (status === "active" && cancelAtPeriodEnd) return <Badge variant="muted">Cancelada</Badge>;
  if (status === "active") return <Badge variant="success">Ativa</Badge>;
  return <Badge variant="muted">{subscriptionStatusLabel(status)}</Badge>;
}

export function ClubMembers({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const detailSheet = useSheetState<Detail & { subscriptionId: string }>();
  const detail = detailSheet.item;
  const [method, setMethod] = useState<LocalPaymentMethod>("dinheiro");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [pending, startTransition] = useBusyTransition();
  const [now] = useState(() => Date.now());

  function open(subscriptionId: string) {
    setOpeningId(subscriptionId);
    startTransition(async () => {
      const result = await subscriptionDetailAction(subscriptionId);
      setOpeningId(null);
      if (!result.ok) return void toast.error(result.error);
      detailSheet.show({ ...result.data, subscriptionId });
    });
  }

  async function act<T>(
    fn: () => Promise<{ ok: boolean; error: string | null; data: T | null }>,
    message: string | ((data: T) => string),
  ) {
    const result = await fn();
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(typeof message === "string" ? message : message(result.data as T));
    detailSheet.hide();
    router.refresh();
    return true;
  }

  const current = detail?.status === "active" || detail?.status === "past_due";
  const online = detail?.paymentMethod === "CARD" || detail?.paymentMethod === "PIX";

  return (
    <>
      <ul className={rowGroupClass}>
        {rows.map((r) => {
          const expiring = r.status === "active" && r.currentPeriodEnd != null && r.currentPeriodEnd - now <= SEVEN_DAYS;
          const shownDate = r.nextChargeAt ?? r.currentPeriodEnd;
          return (
            <li key={r.subscriptionId}>
              <button
                type="button"
                onClick={() => open(r.subscriptionId)}
                disabled={openingId !== null}
                aria-busy={openingId === r.subscriptionId || undefined}
                className={rowClass}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{r.name}</p>
                  <p className="truncate text-sm text-ink-subtle">
                    {r.planName} · {billingMethodLabel(r.paymentMethod, { lastFour: r.cardLastFour })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {r.status !== "active" || r.cancelAtPeriodEnd ? (
                    <StatusBadge status={r.status} cancelAtPeriodEnd={r.cancelAtPeriodEnd} />
                  ) : expiring && r.nextChargeAt == null && r.currentPeriodEnd ? (
                    <Badge variant="warning">Vence {formatDayMonth(r.currentPeriodEnd)}</Badge>
                  ) : (
                    shownDate && (
                      <span className="tabular text-xs text-ink-subtle">
                        {r.nextChargeAt != null ? "Cobra" : "Vence"} {formatDayMonth(shownDate)}
                      </span>
                    )
                  )}
                </div>
                <ChevronRight className="size-4 shrink-0 text-ink-tertiary" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>

      <BottomSheet
        open={detailSheet.open}
        onOpenChange={detailSheet.onOpenChange}
        title={detail?.memberName ?? ""}
        description={detail ? `${detail.planName}${detail.memberPhone ? ` · ${formatBrazilPhone(detail.memberPhone)}` : ""}` : undefined}
        headerRight={detail && <StatusBadge status={detail.status} cancelAtPeriodEnd={detail.cancelAtPeriodEnd} />}
      >
        {detail && (
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-3 rounded-lg bg-card p-4 text-sm shadow-card">
              <div>
                <dt className="text-ink-subtle">Forma</dt>
                <dd className="font-bold">{billingMethodLabel(detail.paymentMethod, detail.card)}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle">Pago até</dt>
                <dd className="font-bold">{fmtDay(detail.currentPeriodEnd)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-ink-subtle">Próxima cobrança</dt>
                <dd className="font-bold">
                  {detail.nextChargeAt
                    ? `${fmtDay(detail.nextChargeAt)}${detail.paymentMethod === "PIX" ? " · Pix enviado 3 dias antes" : ""}`
                    : detail.cancelAtPeriodEnd
                      ? "Nenhuma (cancelada pelo cliente)"
                      : "Nenhuma"}
                </dd>
              </div>
              {detail.status === "past_due" && detail.lastChargeError && (
                <div className="col-span-2">
                  <dt className="text-ink-subtle">Última recusa</dt>
                  <dd className="font-bold text-warning-ink">{detail.lastChargeError}</dd>
                </div>
              )}
            </dl>

            <div className="flex flex-col gap-2">
              <FieldLabel>Pagamentos</FieldLabel>
              {detail.history.length === 0 ? (
                <EmptyState compact icon={Receipt} title="Nenhum pagamento registrado" />
              ) : (
                <ul className={cn(rowGroupClass, "text-sm")}>
                  {detail.history.map((p) => {
                    const badge = PAYMENT_STATUS[p.status];
                    return (
                      <li key={p.id} className={staticRowClass}>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate">
                            {fmtDay(p.at)} · {paymentMethodLabel(p.method)}
                            {p.cardLastFour ? ` •••• ${p.cardLastFour}` : ""}
                          </span>
                          {badge && (
                            <Badge size="sm" variant={badge.variant}>
                              {badge.label}
                            </Badge>
                          )}
                        </span>
                        <span className={cn("tabular font-bold", p.status !== "paid" && "text-ink-subtle line-through")}>
                          {formatPriceCents(p.amountCents)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {current && online && !detail.cancelAtPeriodEnd && (
              <Button
                size="lg"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await act(
                      () => adminChargeSubscriptionAction(detail.subscriptionId),
                      (data) =>
                        data.status === "paid" ? "Cobrança aprovada. Assinatura renovada." : (data.message ?? "Cobrança enviada."),
                    );
                  })
                }
              >
                <CreditCard aria-hidden />
                {pending ? "Cobrando…" : detail.paymentMethod === "PIX" ? "Enviar Pix da renovação" : "Cobrar agora"}
              </Button>
            )}

            {!online && (
              <div className="flex flex-col gap-2">
                <Segmented showLabel label="Renovar no balcão" value={method} onChange={setMethod} options={LOCAL_OPTIONS} />
                <Button
                  size="lg"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await act(() => renewManualSubscriptionAction({ subscriptionId: detail.subscriptionId, method }), "Assinatura renovada.");
                    })
                  }
                >
                  {pending ? "Registrando…" : "Registrar renovação"}
                </Button>
              </div>
            )}

            {detail.canRefund && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" disabled={pending}>
                    <Undo2 aria-hidden />
                    Estornar último pagamento
                  </Button>
                }
                title="Estornar o último pagamento?"
                description="O valor volta para o cliente pelo AbacatePay e a assinatura é encerrada na hora, sem novas cobranças."
                confirmLabel="Estornar e encerrar"
                onConfirm={() =>
                  act(
                    () => adminRefundSubscriptionAction(detail.subscriptionId),
                    (data) => `Estorno de ${formatPriceCents(data.amountCents)} solicitado.`,
                  )
                }
              />
            )}

            {current && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" className="text-destructive" disabled={pending}>
                    <Ban aria-hidden />
                    Cancelar assinatura
                  </Button>
                }
                title="Cancelar esta assinatura?"
                description="O cancelamento vale na hora: o acesso ao clube termina agora e não haverá novas cobranças."
                confirmLabel="Cancelar assinatura"
                onConfirm={() => act(() => adminCancelSubscriptionAction(detail.subscriptionId), "Assinatura cancelada.")}
              />
            )}
          </div>
        )}
      </BottomSheet>
    </>
  );
}

/** "+ Novo pagamento" (cabeçalho): assinatura paga no balcão. */
export function RegisterButton({ plans }: { plans: { id: string; name: string; priceCents: number }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [method, setMethod] = useState<LocalPaymentMethod>("dinheiro");
  const [pending, startTransition] = useBusyTransition();

  function submit() {
    startTransition(async () => {
      const result = await grantManualSubscriptionAction({ phone, planId, method });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Assinatura registrada.");
      setOpen(false);
      setPhone("");
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={plans.length === 0}>
        <Plus aria-hidden />
        Novo pagamento
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Pagamento no balcão"
        description="Ativa ou renova a assinatura pelo ciclo do plano."
        footer={
          <Button size="lg" className="w-full" disabled={pending || phone.replace(/\D/g, "").length < 10 || !planId} onClick={submit}>
            {pending ? "Registrando…" : "Registrar pagamento"}
          </Button>
        }
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="club-phone">WhatsApp do cliente</Label>
          <Input id="club-phone" type="tel" inputMode="tel" placeholder="(11) 98765-4321" value={phone} onChange={(e) => setPhone(maskBrazilPhoneInput(e.target.value))} />
        </div>
        <ChipGroup
          label="Plano"
          value={planId}
          onChange={setPlanId}
          options={plans.map((p) => ({ value: p.id, label: p.name, hint: formatPriceCents(p.priceCents) }))}
        />
        <Segmented showLabel label="Forma de pagamento" value={method} onChange={setMethod} options={LOCAL_OPTIONS} />
      </BottomSheet>
    </>
  );
}
