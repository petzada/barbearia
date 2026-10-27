"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Search } from "lucide-react";
import { toast } from "sonner";
import { createBlockRangeAction, createWalkInAction, lookupClientAction } from "@/app/actions/agenda";
import { BottomSheet } from "@/components/kit/bottom-sheet";
import { Segmented } from "@/components/kit/segmented";
import { OptionCard, OptionGroup } from "@/components/kit/option-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPriceCents } from "@/lib/agenda/availability";
import { parseTimeToMinutes } from "@/lib/agenda/timeline";
import { spLocalDateTimeToIso } from "@/lib/agenda/timezone";
import { maskBrazilPhoneInput } from "@/lib/phone";
import { chipClass } from "@/lib/ui/classes";
import { cn } from "@/lib/utils";
import { useBusyTransition } from "@/components/loading/busy";

export type SheetService = { id: string; name: string; durationMinutes: number; priceCents: number };
export type SheetBarber = { id: string; name: string; openTime: string; closeTime: string; isClosed: boolean };

type Mode = "encaixe" | "bloqueio";

/** "+" da agenda: encaixe (cliente com conta ou só nome) ou bloqueio no dia. */
export function NewEntrySheet({
  open,
  onOpenChange,
  dateKey,
  barbers,
  defaultBarberId,
  defaultTime,
  services,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateKey: string;
  barbers: SheetBarber[];
  defaultBarberId: string;
  defaultTime?: string;
  services: SheetService[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("encaixe");
  const [barberId, setBarberId] = useState(defaultBarberId);
  const [time, setTime] = useState(defaultTime ?? "09:00");
  const [phone, setPhone] = useState("");
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const [lookedUp, setLookedUp] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [blockEnd, setBlockEnd] = useState("");
  const [note, setNote] = useState("");
  const [preset, setPreset] = useState<string | null>(null);
  const [pending, startTransition] = useBusyTransition();

  // Reabre limpo, com o horário/barbeiro de onde o "+" foi tocado.
  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- reset do formulário ao abrir */
    setBarberId(defaultBarberId);
    setTime(defaultTime ?? "09:00");
    setPhone("");
    setClient(null);
    setLookedUp(false);
    setWalkInName("");
    setNote("");
    setBlockEnd("");
    setPreset(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, defaultBarberId, defaultTime]);

  const barber = barbers.find((b) => b.id === barberId) ?? barbers[0];
  const service = services.find((s) => s.id === serviceId);
  const startMin = parseTimeToMinutes(time);
  const outside =
    !barber ||
    barber.isClosed ||
    startMin < parseTimeToMinutes(barber.openTime) ||
    startMin + (service?.durationMinutes ?? 30) > parseTimeToMinutes(barber.closeTime);

  function lookup() {
    startTransition(async () => {
      const result = await lookupClientAction(phone);
      if (!result.ok) return void toast.error(result.error);
      setClient(result.data);
      setLookedUp(true);
    });
  }

  function done(message: string) {
    toast.success(message);
    onOpenChange(false);
    router.refresh();
  }

  function submitWalkIn() {
    if (!barber || !service) return;
    startTransition(async () => {
      const result = await createWalkInAction({
        barberId: barber.id,
        serviceId: service.id,
        startsAt: Date.parse(spLocalDateTimeToIso(dateKey, time)),
        clientId: client?.id,
        walkInName: client ? undefined : walkInName,
      });
      if (!result.ok) return void toast.error(result.error);
      done("Encaixe marcado.");
    });
  }

  function submitBlock(start: string, end: string, reason: string) {
    if (!barber) return;
    startTransition(async () => {
      const result = await createBlockRangeAction({
        barberId: barber.id,
        fromDate: dateKey,
        toDate: dateKey,
        startTime: start,
        endTime: end,
        note: reason,
      });
      if (!result.ok) return void toast.error(result.error);
      done("Horário bloqueado.");
    });
  }

  const endDefault = barber ? barber.closeTime : "19:00";

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "encaixe" ? "Novo encaixe" : "Novo bloqueio"}
      footer={
        mode === "encaixe" ? (
          <Button
            size="lg"
            className="w-full"
            disabled={pending || (!client && walkInName.trim().length < 2) || !service}
            onClick={submitWalkIn}
          >
            {pending ? "Marcando…" : "Marcar encaixe"}
          </Button>
        ) : (
          <Button size="lg" className="w-full" disabled={pending} onClick={() => submitBlock(time, blockEnd || endDefault, note)}>
            {pending ? "Bloqueando…" : "Bloquear horário"}
          </Button>
        )
      }
    >
      <Segmented
        label="Tipo"
        value={mode}
        onChange={setMode}
        options={[
          { value: "encaixe", label: "Encaixe" },
          { value: "bloqueio", label: "Bloqueio" },
        ]}
      />

      {barbers.length > 1 && (
        <div className="flex flex-col gap-2">
          <Label>Barbeiro</Label>
          <div className="flex flex-wrap gap-2">
            {barbers.map((b) => (
              <button key={b.id} type="button" aria-pressed={b.id === barber?.id} onClick={() => setBarberId(b.id)} className={cn("px-4", chipClass)}>
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "encaixe" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="walkin-phone">WhatsApp do cliente</Label>
            <div className="flex gap-2">
              <Input
                id="walkin-phone"
                type="tel"
                inputMode="tel"
                placeholder="(11) 98765-4321"
                value={phone}
                onChange={(e) => {
                  setPhone(maskBrazilPhoneInput(e.target.value));
                  setLookedUp(false);
                  setClient(null);
                }}
              />
              <Button type="button" variant="outline" size="icon" aria-label="Buscar cliente" disabled={pending || phone.replace(/\D/g, "").length < 10} onClick={lookup}>
                <Search aria-hidden />
              </Button>
            </div>
            {client && (
              <p className="flex items-center gap-2 text-sm font-bold text-success-ink">
                <Check className="size-4" aria-hidden /> {client.name}
              </p>
            )}
            {lookedUp && !client && <p className="text-sm text-ink-subtle">Sem conta com esse WhatsApp. Digite o nome abaixo.</p>}
          </div>
          {!client && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="walkin-name">Ou só o nome (sem conta)</Label>
              <Input id="walkin-name" placeholder="Nome do cliente" value={walkInName} onChange={(e) => setWalkInName(e.target.value)} maxLength={80} />
            </div>
          )}
          <OptionGroup label="Serviço">
            {services.map((s) => (
              <OptionCard
                key={s.id}
                selected={s.id === serviceId}
                onSelect={() => setServiceId(s.id)}
                title={s.name}
                description={`${s.durationMinutes} min`}
                trailing={<span className="tabular font-bold">{formatPriceCents(s.priceCents)}</span>}
              />
            ))}
          </OptionGroup>
          <div className="flex flex-col gap-2">
            <Label htmlFor="walkin-time">Horário</Label>
            <Input id="walkin-time" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          {outside && (
            <p className="flex items-start gap-2 rounded-md bg-warning/12 p-3 text-sm font-semibold text-warning-ink" role="note">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              Fora do expediente de {barber?.name ?? "barbeiro"}. Você pode marcar mesmo assim.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Atalhos">
            {[
              { label: "Almoço", start: "12:00", end: "13:00" },
              { label: "Resto do dia", start: time, end: endDefault },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                aria-pressed={preset === p.label}
                onClick={() => {
                  setPreset(p.label);
                  setTime(p.start);
                  setBlockEnd(p.end);
                  setNote(p.label);
                }}
                className={cn("px-4", chipClass)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="block-start">Início</Label>
              <Input id="block-start" type="time" step={300} value={time} onChange={(e) => { setTime(e.target.value); setPreset(null); }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="block-end">Fim</Label>
              <Input id="block-end" type="time" step={300} value={blockEnd || endDefault} onChange={(e) => { setBlockEnd(e.target.value); setPreset(null); }} />
            </div>
          </div>
          <Input placeholder="Motivo (opcional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
          <p className="text-xs text-ink-subtle">Folga de vários dias ou férias: use a aba Bloqueios.</p>
        </div>
      )}
    </BottomSheet>
  );
}
