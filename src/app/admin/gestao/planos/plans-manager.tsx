"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDown, ArrowUp, Crown, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { savePlanAction } from "@/app/actions/admin";
import { PlanCard } from "@/components/club/plan-card";
import { BottomSheet } from "@/components/kit/bottom-sheet";
import { MoneyInput } from "@/components/kit/money-input";
import { moveItem } from "@/components/kit/reorder-list";
import { EmptyState, PageBody, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CYCLE_OPTIONS, WEEKDAY_SHORT, type PlanCycle } from "@/lib/plans";
import { chipClass } from "@/lib/ui/classes";
import { cn, countLabel } from "@/lib/utils";

export type PlanRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  cycle: PlanCycle;
  benefits: string[];
  active: boolean;
  highlighted: boolean;
  sortOrder: number;
  subscribers: number;
  coveredServiceIds: string[];
  allowedWeekdays: number[];
  visitsPerCycle: number;
};

export type PlanServiceOption = { id: string; name: string };

const namesFor = (ids: string[], services: PlanServiceOption[]) =>
  services.filter((s) => ids.includes(s.id)).map((s) => s.name);

export const slugify = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export function PlansManager({ plans, services }: { plans: PlanRow[]; services: PlanServiceOption[] }) {
  const [editing, setEditing] = useState<PlanRow | "new" | null>(null);
  return (
    <>
      <PageHeader
        title="Planos do clube"
        backHref="/admin/gestao"
        backLabel="Gestão"
        description="Assim o cliente vê cada plano no app."
        actions={
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus aria-hidden />
            Novo plano
          </Button>
        }
      />
      <PageBody>
        {plans.length === 0 ? (
          <EmptyState
            icon={Crown}
            title="Nenhum plano ainda"
            description="Crie os planos do Clube Moura. Eles só aparecem para o cliente quando ativos."
            action={
              <Button size="lg" onClick={() => setEditing("new")}>
                Novo plano
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {plans.map((p) => (
              <li key={p.id}>
                <PlanCard
                  plan={{ ...p, coveredServiceNames: namesFor(p.coveredServiceIds, services) }}
                  header={
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={p.active ? "success" : "muted"}>{p.active ? "Ativo" : "Inativo"}</Badge>
                      <Badge variant="soft">{countLabel(p.subscribers, "assinante", "assinantes")}</Badge>
                    </div>
                  }
                  footer={
                    <Button variant={p.highlighted ? "on-dark" : "outline"} onClick={() => setEditing(p)}>
                      <Pencil aria-hidden />
                      Editar
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </PageBody>
      <PlanSheet
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        plan={editing === "new" ? null : editing}
        open={editing !== null}
        nextOrder={plans.length}
        services={services}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function PlanSheet({
  plan,
  open,
  nextOrder,
  services,
  onClose,
}: {
  plan: PlanRow | null;
  open: boolean;
  nextOrder: number;
  services: PlanServiceOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [price, setPrice] = useState(plan?.priceCents ?? 0);
  const [cycle, setCycle] = useState<PlanCycle>(plan?.cycle ?? "MONTHLY");
  const [benefits, setBenefits] = useState<string[]>(plan?.benefits ?? []);
  const [newBenefit, setNewBenefit] = useState("");
  const [highlighted, setHighlighted] = useState(plan?.highlighted ?? false);
  const [active, setActive] = useState(plan?.active ?? false);
  const [coveredServiceIds, setCoveredServiceIds] = useState<string[]>(plan?.coveredServiceIds ?? []);
  const [allowedWeekdays, setAllowedWeekdays] = useState<number[]>(plan?.allowedWeekdays ?? []);
  const [visitsPerCycle, setVisitsPerCycle] = useState(plan?.visitsPerCycle ?? 4);
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  const [pending, startTransition] = useTransition();
  const productChanged = plan != null && (price !== plan.priceCents || cycle !== plan.cycle);

  function addBenefit() {
    const value = newBenefit.trim();
    if (!value || benefits.includes(value) || benefits.length >= 8) return;
    setBenefits([...benefits, value]);
    setNewBenefit("");
  }

  function save() {
    startTransition(async () => {
      const result = await savePlanAction({
        id: plan?.id,
        slug: plan?.slug ?? (slugify(name) || `plano-${Date.now()}`),
        name,
        description,
        priceCents: price,
        cycle,
        benefits,
        active,
        highlighted,
        coveredServiceIds,
        allowedWeekdays,
        visitsPerCycle,
        sortOrder: plan?.sortOrder ?? nextOrder,
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success(plan ? "Plano atualizado." : "Plano criado.");
      onClose();
      router.refresh();
    });
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={plan ? "Editar plano" : "Novo plano"}
      footer={
        <Button size="lg" className="w-full" disabled={pending || name.trim().length < 2 || price < 100} onClick={save}>
          {pending ? "Salvando…" : plan ? "Salvar" : "Criar plano"}
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="plan-name">Nome</Label>
        <Input id="plan-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Ex.: Premium" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="plan-desc">Descrição</Label>
        <Textarea id="plan-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="Opcional" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="plan-price">Preço</Label>
        <MoneyInput id="plan-price" valueCents={price} onChange={setPrice} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Ciclo</Label>
        <div className="flex flex-wrap gap-2">
          {CYCLE_OPTIONS.map((c) => (
            <button key={c.value} type="button" aria-pressed={cycle === c.value} onClick={() => setCycle(c.value)} className={cn("px-4", chipClass)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {productChanged && plan.subscribers > 0 && (
        <p className="flex items-start gap-2 rounded-md bg-warning/12 p-3 text-sm font-semibold text-warning-ink">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          Novo preço/ciclo vale só para novas assinaturas. Quem já assina ({countLabel(plan.subscribers, "assinante", "assinantes")}) segue como está.
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Label>Serviços incluídos</Label>
        <div className="flex flex-wrap gap-2">
          {services.map((svc) => (
            <button
              key={svc.id}
              type="button"
              aria-pressed={coveredServiceIds.includes(svc.id)}
              onClick={() => setCoveredServiceIds(toggle(coveredServiceIds, svc.id))}
              className={cn("px-4", chipClass)}
            >
              {svc.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Dias cobertos</Label>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_SHORT.map((label, day) => (
            <button
              key={label}
              type="button"
              aria-pressed={allowedWeekdays.includes(day)}
              onClick={() => setAllowedWeekdays(toggle(allowedWeekdays, day))}
              className={cn("px-0", chipClass)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-subtle">Nenhum dia marcado = vale em qualquer dia da semana.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Atendimentos por ciclo</Label>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="icon" aria-label="Menos atendimentos" disabled={visitsPerCycle <= 0} onClick={() => setVisitsPerCycle(visitsPerCycle - 1)}>
            <Minus aria-hidden />
          </Button>
          <span className="tabular w-10 text-center text-xl font-extrabold" aria-live="polite">
            {visitsPerCycle}
          </span>
          <Button type="button" variant="outline" size="icon" aria-label="Mais atendimentos" disabled={visitsPerCycle >= 31} onClick={() => setVisitsPerCycle(visitsPerCycle + 1)}>
            <Plus aria-hidden />
          </Button>
        </div>
        <p className="text-xs text-ink-subtle">Cada agendamento coberto consome 1 (Corte + Barba também). Não acumula para o próximo ciclo.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Benefícios</Label>
        {benefits.length > 0 && (
          <ul className="divide-y divide-hairline rounded-lg bg-card shadow-card">
            {benefits.map((b, i) => (
              <li key={b} className="flex items-center gap-1 py-1 pl-4 pr-1">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{b}</span>
                <Button variant="ghost" size="icon-sm" aria-label={`Subir ${b}`} disabled={i === 0} onClick={() => setBenefits(moveItem(benefits, i, i - 1))}>
                  <ArrowUp aria-hidden />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Descer ${b}`} disabled={i === benefits.length - 1} onClick={() => setBenefits(moveItem(benefits, i, i + 1))}>
                  <ArrowDown aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover benefício ${b}`}
                  className="text-destructive"
                  onClick={() => setBenefits(benefits.filter((x) => x !== b))}
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="Ex.: 4 cortes por mês"
            value={newBenefit}
            maxLength={100}
            onChange={(e) => setNewBenefit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addBenefit();
              }
            }}
          />
          <Button type="button" variant="outline" size="icon" aria-label="Adicionar benefício" disabled={!newBenefit.trim() || benefits.length >= 8} onClick={addBenefit}>
            <Plus aria-hidden />
          </Button>
        </div>
      </div>
      <div className="divide-y divide-hairline rounded-lg bg-card shadow-card">
        <label className="flex items-center justify-between gap-3 px-4 py-3">
          <span>
            <span className="block font-semibold">★ Recomendado</span>
            <span className="text-xs text-ink-subtle">Destaca o plano no topo do Clube</span>
          </span>
          <Switch checked={highlighted} onCheckedChange={setHighlighted} />
        </label>
        <label className="flex items-center justify-between gap-3 px-4 py-3">
          <span>
            <span className="block font-semibold">Ativo</span>
            <span className="text-xs text-ink-subtle">Aparece para o cliente assinar</span>
          </span>
          <Switch checked={active} onCheckedChange={setActive} />
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-subtle">Prévia</p>
        <PlanCard
          plan={{
            name,
            description: description || null,
            priceCents: price,
            cycle,
            benefits,
            highlighted,
            visitsPerCycle,
            allowedWeekdays,
            coveredServiceNames: namesFor(coveredServiceIds, services),
          }}
        />
      </div>
    </BottomSheet>
  );
}
