"use client";

import { BottomSheet } from "@/components/kit/bottom-sheet";
import { MonthCalendar } from "@/components/kit/month-calendar";

/** Folha com o calendário mensal para pular para um dia da agenda. */
export function BookingCalendarSheet({
  open,
  onOpenChange,
  selected,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: string | null;
  onSelect: (dateKey: string) => void;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Escolher dia">
      {open && (
        <MonthCalendar
          key={selected ?? "none"}
          selected={selected}
          onSelect={(dateKey) => {
            onSelect(dateKey);
            onOpenChange(false);
          }}
        />
      )}
    </BottomSheet>
  );
}
