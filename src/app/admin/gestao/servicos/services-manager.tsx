"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Scissors } from "lucide-react";
import { toast } from "sonner";
import { reorderServicesAction, saveServiceAction, setServiceActiveAction } from "@/app/actions/admin";
import { BottomSheet } from "@/components/kit/bottom-sheet";
import { MoneyInput } from "@/components/kit/money-input";
import { ReorderList } from "@/components/kit/reorder-list";
import { EmptyState, PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatPriceCents } from "@/lib/agenda/availability";
import { chipClass } from "@/lib/ui/classes";
import { cn } from "@/lib/utils";

export type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
  sortOrder: number;
};

const DURATIONS = [15, 30, 45, 60, 90];

export function ServicesManager({ services }: { services: ServiceRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ServiceRow | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error: string | null }>, message?: string) =>
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) return void toast.error(result.error);
      if (message) toast.success(message);
      router.refresh();
    });

  return (
    <>
      <PageHeader
        title="Serviços"
        backHref="/admin/gestao"
        backLabel="Gestão"
        description="Arraste para mudar a ordem em que o cliente vê."
        actions={
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus aria-hidden />
            Novo serviço
          </Button>
        }
      />
      <PageBody>
        {services.length === 0 ? (
          <EmptyState
            icon={Scissors}
            title="Nenhum serviço cadastrado"
            description="Cadastre o primeiro serviço para abrir a agenda."
            action={
              <Button size="lg" onClick={() => setEditing("new")}>
                Criar serviço
              </Button>
            }
          />
        ) : (
          <ReorderList
            items={services}
            itemLabel={(s) => s.name}
            onCommit={(ids) => run(() => reorderServicesAction(ids), "Ordem salva.")}
            renderItem={(s) => (
              <div className="flex items-center gap-3 py-2 pr-4">
                <button type="button" onClick={() => setEditing(s)} className="min-w-0 flex-1 py-1 text-left">
                  <p className={cn("truncate font-bold", !s.active && "text-ink-tertiary")}>{s.name}</p>
                  <p className="tabular text-sm text-ink-subtle">
                    {s.durationMinutes} min · {formatPriceCents(s.priceCents)}
                  </p>
                </button>
                <Switch
                  checked={s.active}
                  disabled={pending}
                  aria-label={`${s.name} ativo`}
                  onCheckedChange={(checked) => run(() => setServiceActiveAction(s.id, checked), checked ? "Serviço ativado." : "Serviço desativado.")}
                />
              </div>
            )}
          />
        )}
      </PageBody>
      <ServiceSheet
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        service={editing === "new" ? null : editing}
        open={editing !== null}
        nextOrder={services.length}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function ServiceSheet({
  service,
  open,
  nextOrder,
  onClose,
}: {
  service: ServiceRow | null;
  open: boolean;
  nextOrder: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [duration, setDuration] = useState(service?.durationMinutes ?? 30);
  const [custom, setCustom] = useState(service ? !DURATIONS.includes(service.durationMinutes) : false);
  const [price, setPrice] = useState(service?.priceCents ?? 0);
  const [active, setActive] = useState(service?.active ?? true);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveServiceAction({
        id: service?.id,
        name,
        description,
        durationMinutes: duration,
        priceCents: price,
        active,
        sortOrder: service?.sortOrder ?? nextOrder,
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success(service ? "Serviço atualizado." : "Serviço criado.");
      onClose();
      router.refresh();
    });
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={service ? "Editar serviço" : "Novo serviço"}
      footer={
        <Button size="lg" className="w-full" disabled={pending || name.trim().length === 0} onClick={save}>
          {pending ? "Salvando…" : service ? "Salvar" : "Criar serviço"}
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="svc-name">Nome</Label>
        <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ex.: Corte degradê" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="svc-desc">Descrição</Label>
        <Textarea id="svc-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="Opcional — aparece no agendamento" />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Duração</Label>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={!custom && duration === d}
              onClick={() => {
                setCustom(false);
                setDuration(d);
              }}
              className={cn("px-4", chipClass)}
            >
              {d} min
            </button>
          ))}
          <button type="button" aria-pressed={custom} onClick={() => setCustom(true)} className={cn("px-4", chipClass)}>
            Outro
          </button>
        </div>
        {custom && (
          <Input
            type="number"
            inputMode="numeric"
            min={5}
            max={480}
            step={5}
            aria-label="Duração em minutos"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="svc-price">Preço</Label>
        <MoneyInput id="svc-price" valueCents={price} onChange={setPrice} />
      </div>
      <label className="flex items-center justify-between gap-3 rounded-lg bg-card p-4 shadow-card">
        <span className="font-semibold">Disponível para agendamento</span>
        <Switch checked={active} onCheckedChange={setActive} />
      </label>
    </BottomSheet>
  );
}
