"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  adminCancelSubscriptionAction,
  grantManualSubscriptionAction,
  renewManualSubscriptionAction,
  subscriptionDetailAction,
} from "@/app/actions/admin";
import { BottomSheet, Segmented } from "@/components/kit/bottom-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dateKeyFromIsoInSP, formatPriceCents, formatSelectableDay } from "@/lib/agenda/availability";
import { LOCAL_PAYMENT_LABELS, LOCAL_PAYMENT_METHODS, type LocalPaymentMethod } from "@/lib/validations/agendamento";
import { formatBrazilPhone, maskBrazilPhoneInput } from "@/lib/phone";
import { chipClass } from "@/lib/ui/classes";
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

const METHOD_LABEL: Record<string, string> = { CARD: "Cartão", PIX: "Pix", ...LOCAL_PAYMENT_LABELS };
const fmtDay = (ms: number | null) => (ms ? formatSelectableDay(dateKeyFromIsoInSP(ms)) : "—");
const SEVEN_DAYS = 7 * 86_400_000;

type Detail = Extract<Awaited<ReturnType<typeof subscriptionDetailAction>>, { ok: true }>["data"];

export function ClubMembers({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [detail, setDetail] = useState<(Detail & { subscriptionId: string }) | null>(null);
  const [method, setMethod] = useState<LocalPaymentMethod>("dinheiro");
  const [pending, startTransition] = useTransition();
  const [now] = useState(() => Date.now());

  function open(subscriptionId: string) {
    startTransition(async () => {
      const result = await subscriptionDetailAction(subscriptionId);
      if (!result.ok) return void toast.error(result.error);
      setDetail({ ...result.data, subscriptionId });
    });
  }

  function act(fn: () => Promise<{ ok: boolean; error: string | null }>, message: string) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) return void toast.error(result.error);
      toast.success(message);
      setDetail(null);
      router.refresh();
    });
  }

  return (
    <>
      <ul className="divide-y divide-hairline overflow-hidden rounded-lg bg-card shadow-card">
        {rows.map((r) => {
          const expiring = r.status === "active" && r.currentPeriodEnd != null && r.currentPeriodEnd - now <= SEVEN_DAYS;
          return (
            <li key={r.subscriptionId}>
              <button type="button" onClick={() => open(r.subscriptionId)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{r.name}</p>
                  <p className="truncate text-sm text-ink-subtle">
                    {r.planName} · {r.provider === "manual" ? "Balcão" : METHOD_LABEL[r.method ?? ""] ?? "Online"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {r.status !== "active" ? (
                    <Badge variant="muted">{r.status === "cancelled" ? "Cancelada" : "Vencida"}</Badge>
                  ) : expiring ? (
                    <Badge variant="warning">vence {fmtDay(r.currentPeriodEnd)}</Badge>
                  ) : (
                    <span className="text-xs text-ink-subtle">
                      {r.provider === "abacatepay" ? "renova" : "vence"} {fmtDay(r.currentPeriodEnd)}
                    </span>
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
      >
        {detail && (
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-3 rounded-lg bg-card p-4 text-sm shadow-card">
              <div>
                <dt className="text-ink-subtle">Situação</dt>
                <dd className="font-bold">{detail.status === "active" ? "Ativa" : detail.status === "cancelled" ? "Cancelada" : "Vencida"}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle">{detail.provider === "abacatepay" ? "Renova em" : "Válida até"}</dt>
                <dd className="font-bold capitalize">{fmtDay(detail.currentPeriodEnd)}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle">Pagamento</dt>
                <dd className="font-bold">{detail.provider === "manual" ? "Balcão" : `${METHOD_LABEL[detail.method ?? ""] ?? "Online"} (automático)`}</dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold">Pagamentos</p>
              {detail.history.length === 0 ? (
                <p className="text-sm text-ink-subtle">Nenhum pagamento registrado.</p>
              ) : (
                <ul className="divide-y divide-hairline rounded-lg bg-card text-sm shadow-card">
                  {detail.history.map((p) => (
                    <li key={p.id} className="flex justify-between px-4 py-3">
                      <span className="capitalize">
                        {fmtDay(p.paidAt)} · {METHOD_LABEL[p.method] ?? p.method}
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
                <Segmented
                  label="Forma"
                  value={method}
                  onChange={setMethod}
                  options={LOCAL_PAYMENT_METHODS.map((m) => ({ value: m, label: LOCAL_PAYMENT_LABELS[m] }))}
                />
                <Button disabled={pending} onClick={() => act(() => renewManualSubscriptionAction({ subscriptionId: detail.subscriptionId, method }), "Assinatura renovada.")}>
                  Registrar renovação
                </Button>
              </div>
            )}
            {detail.status === "active" && (
              <Button
                variant="ghost"
                className="text-destructive"
                disabled={pending}
                onClick={() => {
                  if (window.confirm("Cancelar esta assinatura? Não haverá novas cobranças.")) {
                    act(() => adminCancelSubscriptionAction(detail.subscriptionId), "Assinatura cancelada.");
                  }
                }}
              >
                Cancelar assinatura
              </Button>
            )}
          </div>
        )}
      </BottomSheet>
    </>
  );
}

/** "+ Registrar" pagamento de assinatura feito no balcão. */
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
        Registrar
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title="Pagamento no balcão" description="Ativa ou renova a assinatura pelo ciclo do plano.">
        <div className="flex flex-col gap-2">
          <Label htmlFor="club-phone">WhatsApp do cliente</Label>
          <Input id="club-phone" type="tel" inputMode="tel" placeholder="(11) 98765-4321" value={phone} onChange={(e) => setPhone(maskBrazilPhoneInput(e.target.value))} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Plano</Label>
          <div className="flex flex-col gap-2">
            {plans.map((p) => (
              <button key={p.id} type="button" aria-pressed={p.id === planId} onClick={() => setPlanId(p.id)} className={cn("flex h-12 items-center justify-between px-4", chipClass)}>
                <span>{p.name}</span>
                <span className="tabular">{formatPriceCents(p.priceCents)}</span>
              </button>
            ))}
          </div>
        </div>
        <Segmented
          label="Forma de pagamento"
          value={method}
          onChange={setMethod}
          options={LOCAL_PAYMENT_METHODS.map((m) => ({ value: m, label: LOCAL_PAYMENT_LABELS[m] }))}
        />
        <Button size="lg" disabled={pending || phone.replace(/\D/g, "").length < 10 || !planId} onClick={submit}>
          {pending ? "Registrando…" : "Registrar pagamento"}
        </Button>
      </BottomSheet>
    </>
  );
}
