"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDown, ArrowUp, Crown, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { savePlanAction } from "@/app/actions/admin";
import { PlanCard } from "@/components/club/plan-card";
import { BottomSheet } from "@/components/kit/bottom-sheet";
import { MoneyInput } from "@/components/kit/money-input";
import { moveItem } from "@/components/kit/reorder-list";
import { EmptyState } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CYCLE_OPTIONS, type PlanCycle } from "@/lib/plans";
import { chipClass } from "@/lib/ui/classes";
import { cn } from "@/lib/utils";

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
};

export const slugify = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export function PlansManager({ plans }: { plans: PlanRow[] }) {
  const [editing, setEditing] = useState<PlanRow | "new" | null>(null);
  return (
    <>
      <Button size="lg" onClick={() => setEditing("new")}>
        <Plus aria-hidden />
        Novo plano
      </Button>
      {plans.length === 0 ? (
        <EmptyState icon={Crown} title="Nenhum plano ainda" description="Crie os planos do Clube Moura. Eles só aparecem para o cliente quando ativos." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <li key={p.id}>
              <PlanCard
                plan={p}
                header={
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={p.active ? "success" : "muted"}>{p.active ? "Ativo" : "Inativo"}</Badge>
                    <Badge variant="soft">
                      {p.subscribers} assinante{p.subscribers === 1 ? "" : "s"}
                    </Badge>
                  </div>
                }
                footer={
                  <Button variant="outline" onClick={() => setEditing(p)} className={p.highlighted ? "border-white/20 bg-transparent text-white hover:bg-white/10" : undefined}>
                    <Pencil aria-hidden />
                    Editar
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
      <PlanSheet
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        plan={editing === "new" ? null : editing}
        open={editing !== null}
        nextOrder={plans.length}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function PlanSheet({ plan, open, nextOrder, onClose }: { plan: PlanRow | null; open: boolean; nextOrder: number; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [price, setPrice] = useState(plan?.priceCents ?? 0);
  const [cycle, setCycle] = useState<PlanCycle>(plan?.cycle ?? "MONTHLY");
  const [benefits, setBenefits] = useState<string[]>(plan?.benefits ?? []);
  const [newBenefit, setNewBenefit] = useState("");
  const [highlighted, setHighlighted] = useState(plan?.highlighted ?? false);
  const [active, setActive] = useState(plan?.active ?? false);
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
        sortOrder: plan?.sortOrder ?? nextOrder,
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success(plan ? "Plano atualizado." : "Plano criado.");
      onClose();
      router.refresh();
    });
  }

  return (
    <BottomSheet open={open} onOpenChange={(o) => !o && onClose()} title={plan ? "Editar plano" : "Novo plano"}>
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
            <button key={c.value} type="button" aria-pressed={cycle === c.value} onClick={() => setCycle(c.value)} className={cn("h-10 px-4", chipClass)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {productChanged && plan.subscribers > 0 && (
        <p className="flex items-start gap-2 rounded-md bg-warning/12 p-3 text-sm font-semibold text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          Novo preço/ciclo vale só para novas assinaturas. Os {plan.subscribers} assinantes atuais seguem como estão.
        </p>
      )}
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
                <Button variant="ghost" size="icon-sm" aria-label={`Remover ${b}`} onClick={() => setBenefits(benefits.filter((x) => x !== b))}>
                  <X aria-hidden />
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
        <PlanCard plan={{ name, description: description || null, priceCents: price, cycle, benefits, highlighted }} />
      </div>
      <Button size="lg" disabled={pending || name.trim().length < 2 || price < 100} onClick={save}>
        {pending ? "Salvando…" : "Salvar plano"}
      </Button>
    </BottomSheet>
  );
}
