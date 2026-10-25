"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, ChevronRight, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import {
  adminCancelSubscriptionAction,
  grantManualSubscriptionAction,
  renewManualSubscriptionAction,
  subscriptionDetailAction,
} from "@/app/actions/admin";
import { BottomSheet } from "@/components/kit/bottom-sheet";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { OptionCard, OptionGroup } from "@/components/kit/option-card";
import { Segmented } from "@/components/kit/segmented";
import { EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPriceCents } from "@/lib/agenda/availability";
import { formatDayLabel, formatDayMonth } from "@/lib/agenda/format";
import { LOCAL_PAYMENT_SHORT_LABELS, paymentMethodLabel, subscriptionPaymentLabel } from "@/lib/payments";
import { LOCAL_PAYMENT_METHODS, type LocalPaymentMethod } from "@/lib/validations/agendamento";
import { formatBrazilPhone, maskBrazilPhoneInput } from "@/lib/phone";
import { rowClass, rowGroupClass } from "@/lib/ui/classes";
import { cn } from "@/lib/utils";

type Row = {
  subscriptionId: string;
  name: string;
  planName: string;
  provider: "abacatepay" | "manual";
  method: string | null;
  status: string;
  currentPeriodEnd: number | null;
};

const fmtDay = (ms: number | null) => (ms ? formatDayLabel(ms) : "—");
const LOCAL_OPTIONS = LOCAL_PAYMENT_METHODS.map((m) => ({ value: m, label: LOCAL_PAYMENT_SHORT_LABELS[m] }));
const STATUS_LABEL: Record<string, string> = { active: "Ativa", cancelled: "Cancelada" };
const SEVEN_DAYS = 7 * 86_400_000;

type Detail = Extract<Awaited<ReturnType<typeof subscriptionDetailAction>>, { ok: true }>["data"];

export function ClubMembers({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [detail, setDetail] = useState<(Detail & { subscriptionId: string }) | null>(null);
  const [method, setMethod] = useState<LocalPaymentMethod>("dinheiro");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [now] = useState(() => Date.now());

  function open(subscriptionId: string) {
    setOpeningId(subscriptionId);
    startTransition(async () => {
      const result = await subscriptionDetailAction(subscriptionId);
      setOpeningId(null);
      if (!result.ok) return void toast.error(result.error);
      setDetail({ ...result.data, subscriptionId });
    });
  }

  async function act(fn: () => Promise<{ ok: boolean; error: string | null }>, message: string) {
    const result = await fn();
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(message);
    setDetail(null);
    router.refresh();
    return true;
  }

  return (
    <>
      <ul className={rowGroupClass}>
        {rows.map((r) => {
          const expiring = r.status === "active" && r.currentPeriodEnd != null && r.currentPeriodEnd - now <= SEVEN_DAYS;
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
                    {r.planName} · {subscriptionPaymentLabel(r.provider, r.method)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {r.status !== "active" ? (
                    <Badge variant="muted">{STATUS_LABEL[r.status] ?? "Vencida"}</Badge>
                  ) : expiring && r.currentPeriodEnd ? (
                    <Badge variant="warning">Vence {formatDayMonth(r.currentPeriodEnd)}</Badge>
                  ) : (
                    r.currentPeriodEnd && (
                      <span className="tabular text-xs text-ink-subtle">
                        {r.provider === "abacatepay" ? "Renova" : "Vence"} {formatDayMonth(r.currentPeriodEnd)}
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
        open={detail !== null}
        onOpenChange={(o) => !o && setDetail(null)}
        title={detail?.memberName ?? ""}
        description={detail ? `${detail.planName}${detail.memberPhone ? ` · ${formatBrazilPhone(detail.memberPhone)}` : ""}` : undefined}
        headerRight={detail && <Badge variant={detail.status === "active" ? "success" : "muted"}>{STATUS_LABEL[detail.status] ?? "Vencida"}</Badge>}
      >
        {detail && (
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-3 rounded-lg bg-card p-4 text-sm shadow-card">
              <div>
                <dt className="text-ink-subtle">{detail.provider === "abacatepay" ? "Renova em" : "Válida até"}</dt>
                <dd className="font-bold">{fmtDay(detail.currentPeriodEnd)}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle">Pagamento</dt>
                <dd className="font-bold">{subscriptionPaymentLabel(detail.provider, detail.method)}</dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold">Pagamentos</p>
              {detail.history.length === 0 ? (
                <EmptyState compact icon={Receipt} title="Nenhum pagamento registrado" />
              ) : (
                <ul className={cn(rowGroupClass, "text-sm")}>
                  {detail.history.map((p) => (
                    <li key={p.id} className="flex justify-between gap-3 px-4 py-3">
                      <span>
                        {fmtDay(p.paidAt)} · {paymentMethodLabel(p.method)}
                      </span>
                      <span className="tabular font-bold">{formatPriceCents(p.amountCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {detail.provider === "manual" && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-bold">Renovar no balcão</p>
                <Segmented label="Forma de pagamento" value={method} onChange={setMethod} options={LOCAL_OPTIONS} />
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
            {detail.status === "active" && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" className="text-destructive" disabled={pending}>
                    <Ban aria-hidden />
                    Cancelar assinatura
                  </Button>
                }
                title="Cancelar esta assinatura?"
                description="O cancelamento vale na hora e não haverá novas cobranças."
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

/** "+ Registrar pagamento" de assinatura feito no balcão (no cabeçalho). */
export function RegisterButton({ plans }: { plans: { id: string; name: string; priceCents: number }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [method, setMethod] = useState<LocalPaymentMethod>("dinheiro");
  const [pending, startTransition] = useTransition();

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
        Registrar pagamento
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
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Plano</p>
          <OptionGroup label="Plano">
            {plans.map((p) => (
              <OptionCard
                key={p.id}
                selected={p.id === planId}
                onSelect={() => setPlanId(p.id)}
                title={p.name}
                trailing={<span className="tabular font-bold">{formatPriceCents(p.priceCents)}</span>}
              />
            ))}
          </OptionGroup>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Forma de pagamento</p>
          <Segmented label="Forma de pagamento" value={method} onChange={setMethod} options={LOCAL_OPTIONS} />
        </div>
      </BottomSheet>
    </>
  );
}
