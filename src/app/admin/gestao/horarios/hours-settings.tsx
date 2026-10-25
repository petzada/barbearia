"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addClosureAction, removeClosureAction, saveBusinessHoursAction, saveShopSettingsAction } from "@/app/actions/admin";
import { rowClass, SettingsGroup } from "@/app/perfil/settings-list";
import { BottomSheet } from "@/components/kit/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatMinutesShort, formatSelectableDay } from "@/lib/agenda/availability";
import { todayDateKeySP } from "@/lib/agenda/timezone";
import { WEEKDAY_LONG } from "@/lib/agenda/week";
import { formatBrazilPhone, maskBrazilPhoneInput } from "@/lib/phone";
import { chipClass } from "@/lib/ui/classes";
import { cn } from "@/lib/utils";

type Day = { weekday: number; openTime: string; closeTime: string; isClosed: boolean };
type Settings = {
  shopName: string;
  phone: string | null;
  address: string | null;
  instagram: string | null;
  slotIntervalMinutes: number;
  minLeadMinutes: number;
  bookingWindowDays: number;
  cancelUntilMinutes: number;
};
type RuleKey = "slotIntervalMinutes" | "minLeadMinutes" | "bookingWindowDays" | "cancelUntilMinutes";
type InfoKey = "shopName" | "phone" | "address" | "instagram";

const RULES: { key: RuleKey; label: string; options: number[]; format: (v: number) => string; help: string }[] = [
  { key: "slotIntervalMinutes", label: "Grade de horários", options: [15, 20, 30, 45, 60], format: (v) => `${v} min`, help: "De quanto em quanto tempo o cliente vê horários." },
  { key: "minLeadMinutes", label: "Antecedência mínima", options: [0, 15, 30, 60, 120, 240], format: (v) => (v === 0 ? "Sem mínimo" : formatMinutesShort(v)), help: "Com quanto tempo de antecedência dá para agendar." },
  { key: "bookingWindowDays", label: "Agenda aberta", options: [7, 14, 30, 45, 60, 90], format: (v) => `${v} dias`, help: "Até quantos dias à frente o cliente agenda." },
  { key: "cancelUntilMinutes", label: "Cancelar pelo app até", options: [0, 30, 60, 120, 240, 1440], format: (v) => (v === 0 ? "A qualquer momento" : `${formatMinutesShort(v)} antes`), help: "Depois disso, só falando com a barbearia." },
];

const INFO: { key: InfoKey; label: string; placeholder: string }[] = [
  { key: "shopName", label: "Nome", placeholder: "Barbearia do Moura" },
  { key: "phone", label: "WhatsApp", placeholder: "(11) 98765-4321" },
  { key: "address", label: "Endereço", placeholder: "Rua, número - bairro - cidade" },
  { key: "instagram", label: "Instagram", placeholder: "@barbearia" },
];

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function HoursSettings({ week, closures, settings }: { week: Day[]; closures: { dateKey: string; reason: string }[]; settings: Settings }) {
  const router = useRouter();
  const [days, setDays] = useState(week);
  const [editingDay, setEditingDay] = useState<Day | null>(null);
  const [rule, setRule] = useState<(typeof RULES)[number] | null>(null);
  const [info, setInfo] = useState<(typeof INFO)[number] | null>(null);
  const [infoValue, setInfoValue] = useState("");
  const [closureOpen, setClosureOpen] = useState(false);
  const [closureDate, setClosureDate] = useState(todayDateKeySP());
  const [closureReason, setClosureReason] = useState("");
  const [pending, startTransition] = useTransition();

  const done = (message: string) => {
    toast.success(message);
    router.refresh();
  };

  function saveWeek(next: Day[], message = "Horários salvos.") {
    const previous = days;
    setDays(next);
    startTransition(async () => {
      const result = await saveBusinessHoursAction({ rows: next });
      if (!result.ok) {
        setDays(previous);
        return void toast.error(result.error);
      }
      done(message);
    });
  }

  function saveSettings(patch: Partial<Settings>, message = "Configuração salva.") {
    startTransition(async () => {
      const result = await saveShopSettingsAction({ ...settings, ...patch });
      if (!result.ok) return void toast.error(result.error);
      setRule(null);
      setInfo(null);
      done(message);
    });
  }

  const monday = days.find((d) => d.weekday === 1);

  return (
    <>
      <SettingsGroup title="Funcionamento">
        {ORDER.map((weekday) => {
          const d = days.find((x) => x.weekday === weekday)!;
          return (
            <div key={weekday} className={rowClass}>
              <Switch
                checked={!d.isClosed}
                disabled={pending}
                aria-label={`Abre ${WEEKDAY_LONG[weekday]}`}
                onCheckedChange={(open) => saveWeek(days.map((x) => (x.weekday === weekday ? { ...x, isClosed: !open } : x)))}
              />
              <button type="button" disabled={d.isClosed} onClick={() => setEditingDay(d)} className="flex flex-1 items-center gap-3 text-left disabled:cursor-default">
                <span className={cn("flex-1 font-semibold", d.isClosed && "text-ink-tertiary")}>{WEEKDAY_LONG[weekday]}</span>
                <span className="tabular text-sm text-ink-subtle">{d.isClosed ? "Fechado" : `${d.openTime} – ${d.closeTime}`}</span>
                {!d.isClosed && <ChevronRight className="size-4 text-ink-tertiary" aria-hidden />}
              </button>
            </div>
          );
        })}
      </SettingsGroup>
      {monday && !monday.isClosed && (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            saveWeek(
              days.map((x) => (x.weekday >= 2 && x.weekday <= 5 ? { ...x, openTime: monday.openTime, closeTime: monday.closeTime, isClosed: false } : x)),
              "Horário de segunda copiado para os dias úteis.",
            )
          }
        >
          <Copy aria-hidden />
          Copiar segunda para dias úteis
        </Button>
      )}

      <SettingsGroup title="Feriados e fechamentos">
        {closures.map((c) => (
          <div key={c.dateKey} className={rowClass}>
            <span className="flex-1">
              <span className="block font-semibold capitalize">{formatSelectableDay(c.dateKey)}</span>
              <span className="text-sm text-ink-subtle">{c.reason}</span>
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remover fechamento de ${formatSelectableDay(c.dateKey)}`}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await removeClosureAction(c.dateKey);
                  if (!r.ok) return void toast.error(r.error);
                  done("Fechamento removido.");
                })
              }
            >
              <Trash2 className="text-destructive" aria-hidden />
            </Button>
          </div>
        ))}
        <button type="button" onClick={() => setClosureOpen(true)} className={cn(rowClass, "font-semibold text-cta active:bg-muted")}>
          <Plus className="size-5" aria-hidden />
          Adicionar feriado ou fechamento
        </button>
      </SettingsGroup>

      <SettingsGroup title="Regras de agendamento">
        {RULES.map((r) => (
          <button key={r.key} type="button" onClick={() => setRule(r)} className={cn(rowClass, "active:bg-muted")}>
            <span className="flex-1 font-semibold">{r.label}</span>
            <span className="text-sm text-ink-subtle">{r.format(settings[r.key])}</span>
            <ChevronRight className="size-4 text-ink-tertiary" aria-hidden />
          </button>
        ))}
      </SettingsGroup>

      <SettingsGroup title="Barbearia">
        {INFO.map((i) => {
          const raw = settings[i.key];
          const value = i.key === "phone" ? formatBrazilPhone(raw) : i.key === "instagram" && raw ? `@${raw}` : raw;
          return (
            <button
              key={i.key}
              type="button"
              onClick={() => {
                setInfo(i);
                setInfoValue(i.key === "phone" ? maskBrazilPhoneInput(raw ?? "") : raw ?? "");
              }}
              className={cn(rowClass, "active:bg-muted")}
            >
              <span className="w-24 shrink-0 font-semibold">{i.label}</span>
              <span className="min-w-0 flex-1 truncate text-right text-sm text-ink-subtle">{value || "—"}</span>
              <ChevronRight className="size-4 shrink-0 text-ink-tertiary" aria-hidden />
            </button>
          );
        })}
      </SettingsGroup>

      <DaySheet
        key={editingDay?.weekday ?? "none"}
        day={editingDay}
        onClose={() => setEditingDay(null)}
        onSave={(d) => {
          setEditingDay(null);
          saveWeek(days.map((x) => (x.weekday === d.weekday ? d : x)));
        }}
      />

      <BottomSheet open={rule !== null} onOpenChange={(o) => !o && setRule(null)} title={rule?.label ?? ""} description={rule?.help}>
        {rule && (
          <div className="flex flex-col gap-2">
            {rule.options.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={settings[rule.key] === v}
                disabled={pending}
                onClick={() => saveSettings({ [rule.key]: v })}
                className={cn("flex h-12 items-center px-4", chipClass)}
              >
                {rule.format(v)}
              </button>
            ))}
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={info !== null} onOpenChange={(o) => !o && setInfo(null)} title={info?.label ?? ""}>
        {info && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const value = info.key === "phone" ? infoValue.replace(/\D/g, "") : infoValue;
              saveSettings({ [info.key]: value || null } as Partial<Settings>);
            }}
          >
            <Input
              autoFocus
              type={info.key === "phone" ? "tel" : "text"}
              placeholder={info.placeholder}
              value={infoValue}
              onChange={(e) => setInfoValue(info.key === "phone" ? maskBrazilPhoneInput(e.target.value) : e.target.value)}
            />
            <Button type="submit" size="lg" disabled={pending || (info.key === "shopName" && infoValue.trim().length < 2)}>
              Salvar
            </Button>
          </form>
        )}
      </BottomSheet>

      <BottomSheet open={closureOpen} onOpenChange={setClosureOpen} title="Feriado ou fechamento" description="Nesse dia ninguém consegue agendar.">
        <div className="flex flex-col gap-2">
          <Label htmlFor="closure-date">Data</Label>
          <Input id="closure-date" type="date" min={todayDateKeySP()} value={closureDate} onChange={(e) => setClosureDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="closure-reason">Motivo</Label>
          <Input id="closure-reason" placeholder="Ex.: Natal" value={closureReason} onChange={(e) => setClosureReason(e.target.value)} maxLength={60} />
        </div>
        <Button
          size="lg"
          disabled={pending || closureReason.trim().length < 2}
          onClick={() =>
            startTransition(async () => {
              const r = await addClosureAction({ dateKey: closureDate, reason: closureReason });
              if (!r.ok) return void toast.error(r.error);
              setClosureOpen(false);
              setClosureReason("");
              done("Fechamento adicionado.");
            })
          }
        >
          Adicionar
        </Button>
      </BottomSheet>
    </>
  );
}

function DaySheet({ day, onClose, onSave }: { day: Day | null; onClose: () => void; onSave: (d: Day) => void }) {
  const [open, setOpen] = useState(day?.openTime ?? "09:00");
  const [close, setClose] = useState(day?.closeTime ?? "19:00");
  return (
    <BottomSheet open={day !== null} onOpenChange={(o) => !o && onClose()} title={day ? WEEKDAY_LONG[day.weekday] : ""} description="Horário de funcionamento">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="day-open">Abre</Label>
          <Input id="day-open" type="time" step={300} value={open} onChange={(e) => setOpen(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="day-close">Fecha</Label>
          <Input id="day-close" type="time" step={300} value={close} onChange={(e) => setClose(e.target.value)} />
        </div>
      </div>
      <Button size="lg" disabled={!day || close <= open} onClick={() => day && onSave({ ...day, openTime: open, closeTime: close, isClosed: false })}>
        Salvar
      </Button>
    </BottomSheet>
  );
}
