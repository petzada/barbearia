"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { WEEKDAY_LONG } from "@/lib/agenda/week";
import { cn } from "@/lib/utils";

export type WeekDay = { weekday: number; startTime: string; endTime: string; isOff: boolean };

/** Monta a semana a partir do horário da barbearia (ponto de partida da escala). */
export function weekFromShop(shop: { weekday: number; openTime: string; closeTime: string; isClosed: boolean }[]): WeekDay[] {
  return Array.from({ length: 7 }, (_, weekday) => {
    const row = shop.find((r) => r.weekday === weekday);
    return {
      weekday,
      startTime: row?.openTime ?? "09:00",
      endTime: row?.closeTime ?? "19:00",
      isOff: row?.isClosed ?? true,
    };
  });
}

/**
 * Editor de semana (7 linhas): chave "trabalha" + início/fim. Ordem seg→dom,
 * como o barbeiro pensa a semana. Usado na escala do barbeiro.
 */
export function WeekScheduleEditor({
  value,
  onChange,
  disabledDays = [],
}: {
  value: WeekDay[];
  onChange: (next: WeekDay[]) => void;
  /** Dias em que a barbearia não abre (não editáveis). */
  disabledDays?: number[];
}) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const update = (weekday: number, patch: Partial<WeekDay>) =>
    onChange(value.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));

  return (
    <ul className="divide-y divide-hairline rounded-lg bg-card shadow-card" aria-label="Escala semanal">
      {order.map((weekday) => {
        const day = value.find((d) => d.weekday === weekday)!;
        const shopClosed = disabledDays.includes(weekday);
        const works = !day.isOff && !shopClosed;
        return (
          <li key={weekday} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Switch
              checked={works}
              disabled={shopClosed}
              aria-label={`Trabalha ${WEEKDAY_LONG[weekday]}`}
              onCheckedChange={(checked) => update(weekday, { isOff: !checked })}
            />
            <span className={cn("w-24 font-semibold", !works && "text-ink-tertiary")}>{WEEKDAY_LONG[weekday]}</span>
            {works ? (
              <div className="ml-auto flex items-center gap-2">
                <Input
                  type="time"
                  step={300}
                  aria-label={`Início ${WEEKDAY_LONG[weekday]}`}
                  value={day.startTime}
                  onChange={(e) => update(weekday, { startTime: e.target.value })}
                  className="h-10 w-28"
                />
                <span className="text-ink-subtle">–</span>
                <Input
                  type="time"
                  step={300}
                  aria-label={`Fim ${WEEKDAY_LONG[weekday]}`}
                  value={day.endTime}
                  onChange={(e) => update(weekday, { endTime: e.target.value })}
                  className="h-10 w-28"
                />
              </div>
            ) : (
              <span className="ml-auto text-sm text-ink-subtle">{shopClosed ? "Barbearia fechada" : "Folga"}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
