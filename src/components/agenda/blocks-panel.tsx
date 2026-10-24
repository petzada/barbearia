"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createBlockAction, removeBlockAction } from "@/app/actions/agenda";
import { formatSelectableDay, formatSlotTime } from "@/lib/agenda/availability";
import { spLocalDateTimeToIso } from "@/lib/agenda/timezone";
import { chipClass } from "@/lib/ui/classes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/page-header";

type Block = { id: string; startsAt: string; endsAt: string; note: string | null };

const shiftDateKey = (key: string, days: number) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export function BlocksPanel({
  basePath,
  barberId,
  dateKey,
  dayBounds,
  blocks,
}: {
  basePath: string;
  barberId: string;
  dateKey: string;
  dayBounds: { openTime: string; closeTime: string; isClosed: boolean };
  blocks: Block[];
}) {
  const router = useRouter();
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("13:00");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const presets = [
    { label: "Almoço", start: "12:00", end: "13:00", note: "Almoço" },
    { label: "Manhã", start: dayBounds.openTime, end: "12:00", note: "Folga pela manhã" },
    { label: "Dia todo", start: dayBounds.openTime, end: dayBounds.closeTime, note: "Folga" },
  ];

  function create(startTime: string, endTime: string, reason: string) {
    startTransition(async () => {
      const result = await createBlockAction({
        barberId,
        startsAt: Date.parse(spLocalDateTimeToIso(dateKey, startTime)),
        endsAt: Date.parse(spLocalDateTimeToIso(dateKey, endTime)),
        note: reason,
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Horário bloqueado.");
      setNote("");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await removeBlockAction(id);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Bloqueio removido.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link href={`${basePath}?dia=${shiftDateKey(dateKey, -1)}`} aria-label="Dia anterior" className={cn("flex size-11 items-center justify-center", chipClass)}>
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <p className="flex h-11 flex-1 items-center justify-center rounded-md bg-card font-bold capitalize shadow-card">
          {formatSelectableDay(dateKey)}
        </p>
        <Link href={`${basePath}?dia=${shiftDateKey(dateKey, 1)}`} aria-label="Próximo dia" className={cn("flex size-11 items-center justify-center", chipClass)}>
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      </div>

      {dayBounds.isClosed ? (
        <EmptyState title="A barbearia não abre neste dia" />
      ) : (
        <section className="flex flex-col gap-4 rounded-lg bg-card p-5 shadow-card">
          <h2 className="font-bold">Novo bloqueio</h2>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                disabled={pending}
                onClick={() => create(p.start, p.end, p.note)}
                className={cn("h-10 px-4", chipClass)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              create(start, end, note);
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="block-start">Início</Label>
                <Input id="block-start" type="time" step={300} value={start} onChange={(e) => setStart(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="block-end">Fim</Label>
                <Input id="block-end" type="time" step={300} value={end} onChange={(e) => setEnd(e.target.value)} required />
              </div>
            </div>
            <Input placeholder="Motivo (opcional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
            <Button type="submit" disabled={pending}>
              Bloquear {start}–{end}
            </Button>
          </form>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">Bloqueios do dia</h2>
        {blocks.length === 0 ? (
          <p className="text-sm text-ink-subtle">Nenhum bloqueio neste dia.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center gap-3 rounded-lg border border-dashed border-hairline-strong bg-card p-4">
                <div className="min-w-0 flex-1">
                  <p className="tabular font-bold">
                    {formatSlotTime(b.startsAt)} – {formatSlotTime(b.endsAt)}
                  </p>
                  {b.note && <p className="truncate text-sm text-ink-subtle">{b.note}</p>}
                </div>
                <Button variant="ghost" size="icon-sm" aria-label="Remover bloqueio" disabled={pending} onClick={() => remove(b.id)}>
                  <Trash2 className="text-destructive" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
