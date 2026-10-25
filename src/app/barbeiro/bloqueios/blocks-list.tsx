"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeBlockAction } from "@/app/actions/agenda";
import { BlockFormSheet } from "@/components/agenda/block-form-sheet";
import { EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { dateKeyFromIsoInSP, formatSelectableDay, formatSlotTime } from "@/lib/agenda/availability";
import { minutesFromIsoInSP } from "@/lib/agenda/timeline";

type Block = { id: string; startsAt: number; endsAt: number; note: string | null };

/** Próximos bloqueios agrupados por data + "Novo bloqueio". */
export function BlocksList({
  barberId,
  today,
  openTime,
  closeTime,
  blocks,
}: {
  barberId: string;
  today: string;
  openTime: string;
  closeTime: string;
  blocks: Block[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const groups = new Map<string, Block[]>();
  for (const b of blocks) {
    const key = dateKeyFromIsoInSP(b.startsAt);
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await removeBlockAction(id);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Bloqueio removido.");
      router.refresh();
    });
  }

  const label = (b: Block) => {
    const start = minutesFromIsoInSP(new Date(b.startsAt).toISOString());
    const end = minutesFromIsoInSP(new Date(b.endsAt).toISOString());
    const startTime = formatSlotTime(b.startsAt);
    const endTime = formatSlotTime(b.endsAt);
    return startTime === openTime && endTime === closeTime && end - start > 0 ? "Dia inteiro" : `${startTime} – ${endTime}`;
  };

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        Novo bloqueio
      </Button>

      {blocks.length === 0 ? (
        <EmptyState icon={CalendarOff} title="Nenhum bloqueio marcado" description="Bloqueie o almoço, uma folga ou as suas férias." />
      ) : (
        <div className="flex flex-col gap-5">
          {[...groups.entries()].map(([dateKey, items]) => (
            <section key={dateKey} className="flex flex-col gap-2">
              <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-ink-subtle">
                {dateKey === today ? "Hoje · " : ""}
                {formatSelectableDay(dateKey)}
              </h2>
              <ul className="flex flex-col gap-2">
                {items.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 rounded-lg border border-dashed border-hairline-strong bg-card p-4">
                    <div className="min-w-0 flex-1">
                      <p className="tabular font-bold">{label(b)}</p>
                      {b.note && <p className="truncate text-sm text-ink-subtle">{b.note}</p>}
                    </div>
                    <Button variant="ghost" size="icon-sm" aria-label="Remover bloqueio" disabled={pending} onClick={() => remove(b.id)}>
                      <Trash2 className="text-destructive" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <BlockFormSheet open={open} onOpenChange={setOpen} barberId={barberId} today={today} openTime={openTime} closeTime={closeTime} />
    </>
  );
}
