"use client";

import { useState } from "react";
import { useSheetState } from "@/components/kit/use-sheet-state";
import { useRouter } from "next/navigation";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeBlockAction } from "@/app/actions/agenda";
import { BlockFormSheet } from "@/components/agenda/block-form-sheet";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { EmptyState, PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { dateKeyFromIsoInSP, formatSlotTime } from "@/lib/agenda/availability";
import { formatDayLabel, formatTimeRange } from "@/lib/agenda/format";
import { minutesFromIsoInSP } from "@/lib/agenda/timeline";
import { rowGroupClass } from "@/lib/ui/classes";
import { useBusy } from "@/components/loading/busy";

type Block = { id: string; startsAt: number; endsAt: number; note: string | null };

/** Tela de bloqueios: "Novo bloqueio" no cabeçalho e próximos bloqueios por data. */
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
  const [pendingId, setPendingId] = useState<string | null>(null);
  useBusy(pendingId !== null);

  const groups = new Map<string, Block[]>();
  for (const b of blocks) {
    const key = dateKeyFromIsoInSP(b.startsAt);
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }

  const confirmRemove = useSheetState<Block>();

  async function remove(id: string) {
    setPendingId(id);
    try {
      const result = await removeBlockAction(id);
      if (!result.ok) {
        toast.error(result.error);
        return false;
      }
      toast.success("Bloqueio removido.");
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  const label = (b: Block) => {
    const start = minutesFromIsoInSP(new Date(b.startsAt).toISOString());
    const end = minutesFromIsoInSP(new Date(b.endsAt).toISOString());
    const startTime = formatSlotTime(b.startsAt);
    const endTime = formatSlotTime(b.endsAt);
    return startTime === openTime && endTime === closeTime && end - start > 0 ? "Dia inteiro" : formatTimeRange(b.startsAt, b.endsAt);
  };

  return (
    <>
      <PageHeader
        title="Bloqueios"
        description="Folgas, almoço e férias."
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus aria-hidden />
            Novo bloqueio
          </Button>
        }
      />
      <PageBody>
        {blocks.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title="Nenhum bloqueio marcado"
            description="Bloqueie o almoço, uma folga ou as suas férias."
            action={
              <Button size="lg" onClick={() => setOpen(true)}>
                Novo bloqueio
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-5">
            {[...groups.entries()].map(([dateKey, items]) => (
              <section key={dateKey} className="flex flex-col gap-2">
                <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-ink-subtle">
                  {dateKey === today ? "Hoje · " : ""}
                  {formatDayLabel(dateKey)}
                </h2>
                <ul className={rowGroupClass}>
                  {items.map((b) => (
                    <li
                      key={b.id}
                      aria-busy={pendingId === b.id || undefined}
                      className="flex min-h-14 items-center gap-3 py-2 pl-4 pr-2 aria-busy:opacity-60"
                    >
                      {/* Marcador tracejado = bloqueio (mesmo código visual da agenda). */}
                      <span className="h-9 w-0 shrink-0 border-l-2 border-dashed border-ink-tertiary" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="tabular font-bold">{label(b)}</p>
                        {b.note && <p className="truncate text-sm text-ink-subtle">{b.note}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remover bloqueio"
                        className="text-destructive"
                        disabled={pendingId === b.id}
                        onClick={() => confirmRemove.show(b)}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </PageBody>

      {/* Fora da lista: o item some após remover e não pode levar o diálogo junto. */}
      <ConfirmDialog
        open={confirmRemove.open}
        onOpenChange={confirmRemove.onOpenChange}
        title="Remover este bloqueio?"
        description={
          confirmRemove.item
            ? `O horário de ${label(confirmRemove.item).toLowerCase()} volta a ficar livre para agendamentos.`
            : ""
        }
        confirmLabel="Remover bloqueio"
        onConfirm={() => (confirmRemove.item ? remove(confirmRemove.item.id) : undefined)}
      />
      <BlockFormSheet open={open} onOpenChange={setOpen} barberId={barberId} today={today} openTime={openTime} closeTime={closeTime} />
    </>
  );
}
