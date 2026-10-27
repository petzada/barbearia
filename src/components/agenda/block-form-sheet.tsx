"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { createBlockRangeAction, previewBlockRangeAction } from "@/app/actions/agenda";
import { BottomSheet } from "@/components/kit/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSlotTime } from "@/lib/agenda/availability";
import { formatDayLabel } from "@/lib/agenda/format";
import { chipClass } from "@/lib/ui/classes";
import { cn, countLabel } from "@/lib/utils";
import { useBusyTransition } from "@/components/loading/busy";

type Preset = "almoco" | "manha" | "tarde" | "dia" | "varios";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "almoco", label: "Almoço" },
  { key: "manha", label: "Manhã" },
  { key: "tarde", label: "Tarde" },
  { key: "dia", label: "Dia inteiro" },
  { key: "varios", label: "Vários dias" },
];

type Conflict = { id: string; startsAt: number; type: "appointment" | "block"; clientName: string | null; serviceName: string | null };

export function BlockFormSheet({
  open,
  onOpenChange,
  barberId,
  today,
  openTime,
  closeTime,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barberId: string;
  today: string;
  openTime: string;
  closeTime: string;
}) {
  const router = useRouter();
  const [preset, setPreset] = useState<Preset>("almoco");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("13:00");
  const [note, setNote] = useState("");
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [pending, startTransition] = useBusyTransition();

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- reset do formulário ao abrir */
    setPreset("almoco");
    setFromDate(today);
    setToDate(today);
    setStart("12:00");
    setEnd("13:00");
    setNote("Almoço");
    setConflicts(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, today]);

  function choose(p: Preset) {
    setPreset(p);
    setConflicts(null);
    const times: Partial<Record<Preset, [string, string]>> = {
      almoco: ["12:00", "13:00"],
      manha: [openTime, "12:00"],
      tarde: ["13:00", closeTime],
    };
    const chosen = times[p];
    if (chosen) {
      setStart(chosen[0]);
      setEnd(chosen[1]);
    }
    if (p !== "varios") setToDate(fromDate);
    setNote(p === "almoco" ? "Almoço" : p === "varios" ? "Férias" : p === "dia" ? "Folga" : "");
  }

  const wholeDay = preset === "dia" || preset === "varios";
  const input = {
    barberId,
    fromDate,
    toDate: preset === "varios" ? toDate : fromDate,
    startTime: wholeDay ? undefined : start,
    endTime: wholeDay ? undefined : end,
    note,
  };

  function submit() {
    startTransition(async () => {
      const preview = await previewBlockRangeAction(input);
      if (!preview.ok) return void toast.error(preview.error);
      if (preview.data.conflicts.length > 0) {
        setConflicts(preview.data.conflicts);
        return;
      }
      const result = await createBlockRangeAction(input);
      if (!result.ok) return void toast.error(result.error);
      toast.success(result.data > 1 ? `${countLabel(result.data, "dia bloqueado", "dias bloqueados")}.` : "Horário bloqueado.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Novo bloqueio"
      description="Horários bloqueados não aparecem para os clientes."
      footer={
        <Button size="lg" className="w-full" disabled={pending} onClick={submit}>
          {pending ? "Verificando…" : "Bloquear horário"}
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Atalhos">
        {PRESETS.map((p) => (
          <button key={p.key} type="button" aria-pressed={preset === p.key} onClick={() => choose(p.key)} className={cn("px-4", chipClass)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className={cn("grid gap-3", preset === "varios" ? "grid-cols-2" : "grid-cols-1")}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="block-from">{preset === "varios" ? "De" : "Dia"}</Label>
          <Input id="block-from" type="date" min={today} value={fromDate} onChange={(e) => {
              setFromDate(e.target.value);
              setConflicts(null);
            }} />
        </div>
        {preset === "varios" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="block-to">Até</Label>
            <Input id="block-to" type="date" min={fromDate} value={toDate} onChange={(e) => {
                setToDate(e.target.value);
                setConflicts(null);
              }} />
          </div>
        )}
      </div>

      {!wholeDay && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="block-start">Início</Label>
            <Input id="block-start" type="time" step={300} value={start} onChange={(e) => {
                setStart(e.target.value);
                setConflicts(null);
              }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="block-end">Fim</Label>
            <Input id="block-end" type="time" step={300} value={end} onChange={(e) => {
                setEnd(e.target.value);
                setConflicts(null);
              }} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="block-note">Motivo</Label>
        <Input id="block-note" placeholder="Opcional" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
      </div>

      {conflicts && conflicts.length > 0 && (
        <div role="alert" className="flex flex-col gap-2 rounded-md bg-warning/12 p-4 text-sm text-warning-ink">
          <p className="flex items-center gap-2 font-bold">
            <AlertTriangle className="size-4" aria-hidden />
            Já há {countLabel(conflicts.length, "horário", "horários")} no período
          </p>
          <ul className="flex flex-col gap-1 text-ink-muted">
            {conflicts.slice(0, 6).map((c) => (
              <li key={c.id}>
                {formatDayLabel(c.startsAt)} · {formatSlotTime(c.startsAt)} ·{" "}
                {c.type === "block" ? "bloqueio" : `${c.clientName ?? "Cliente"} (${c.serviceName ?? "serviço"})`}
              </li>
            ))}
          </ul>
          <p className="text-ink-muted">Cancele ou remarque esses horários na Agenda antes de bloquear.</p>
        </div>
      )}

    </BottomSheet>
  );
}
