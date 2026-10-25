"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  cancelInviteAction,
  inviteTeamMemberAction,
  saveBarberWeekAction,
  saveTeamMemberAction,
} from "@/app/actions/admin";
import { AvatarRow } from "@/app/perfil/profile-forms";
import { BottomSheet } from "@/components/kit/bottom-sheet";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { WeekScheduleEditor, weekFromShop, type WeekDay } from "@/components/kit/week-schedule-editor";
import { BarberAvatar } from "@/components/booking/barber-avatar";
import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatBrazilPhone, maskBrazilPhoneInput } from "@/lib/phone";

type ShopDay = { weekday: number; openTime: string; closeTime: string; isClosed: boolean };

export type Member = {
  id: string;
  name: string;
  image: string | null;
  phoneNumber: string | null;
  isBarber: boolean;
  isAdmin: boolean;
  acceptingBookings: boolean;
  commissionPercent: number;
  week: WeekDay[];
};

type Invite = { phoneNumber: string; isBarber: boolean; isAdmin: boolean };

const roles = (m: { isBarber: boolean; isAdmin: boolean }) =>
  [m.isBarber && "Barbeiro", m.isAdmin && "Gestão"].filter(Boolean).join(" · ");

export function TeamManager({
  currentUserId,
  members,
  invites,
  shopWeek,
}: {
  currentUserId: string;
  members: Member[];
  invites: Invite[];
  shopWeek: ShopDay[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Member | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggleBookings(m: Member, accepting: boolean) {
    startTransition(async () => {
      const result = await saveTeamMemberAction({
        userId: m.id,
        isBarber: m.isBarber,
        isAdmin: m.isAdmin,
        acceptingBookings: accepting,
        commissionPercent: m.commissionPercent,
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success(accepting ? `${m.name} voltou a receber agendamentos.` : `${m.name} pausou os agendamentos.`);
      router.refresh();
    });
  }

  async function removeInvite(phoneNumber: string) {
    const r = await cancelInviteAction(phoneNumber);
    if (!r.ok) {
      toast.error(r.error);
      return false;
    }
    toast.success("Convite removido.");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="Equipe"
        backHref="/admin/gestao"
        backLabel="Gestão"
        actions={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden />
            Adicionar pessoa
          </Button>
        }
      />
      <PageBody>

        <ul className="flex flex-col gap-3">
          {members.map((m) => (
            <li key={m.id} className="rounded-lg bg-card shadow-card">
              <button type="button" onClick={() => setEditing(m)} className="flex w-full items-center gap-3 p-4 text-left">
                <BarberAvatar name={m.name} image={m.image} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{m.name}</p>
                  <p className="truncate text-sm text-ink-subtle">
                    {roles(m)}
                    {m.isBarber ? ` · ${m.commissionPercent}%` : ""}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-ink-tertiary" aria-hidden />
              </button>
              {m.isBarber && (
                <label className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-3 text-sm">
                  <span className="font-semibold">Recebendo agendamentos</span>
                  <Switch checked={m.acceptingBookings} disabled={pending} onCheckedChange={(c) => toggleBookings(m, c)} />
                </label>
              )}
            </li>
          ))}
        </ul>

        {invites.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-ink-subtle">Convites pendentes</h2>
            <ul className="divide-y divide-hairline rounded-lg bg-card shadow-card">
              {invites.map((i) => (
                <li key={i.phoneNumber} className="flex items-center gap-3 py-2 pl-4 pr-2 text-sm">
                  <span className="flex-1">
                    <span className="block font-semibold">{formatBrazilPhone(i.phoneNumber)}</span>
                    <span className="text-ink-subtle">{roles(i)} · vale no primeiro login</span>
                  </span>
                  <ConfirmDialog
                    title="Remover este convite?"
                    description={`${formatBrazilPhone(i.phoneNumber)} não terá acesso de equipe ao entrar no app.`}
                    confirmLabel="Remover convite"
                    onConfirm={() => removeInvite(i.phoneNumber)}
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label="Remover convite" className="text-destructive">
                        <Trash2 aria-hidden />
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </PageBody>

      {editing && (
        <MemberSheet key={editing.id} member={editing} self={editing.id === currentUserId} shopWeek={shopWeek} onClose={() => setEditing(null)} />
      )}
      <InviteSheet open={adding} onOpenChange={setAdding} />
    </>
  );
}

function MemberSheet({ member, self, shopWeek, onClose }: { member: Member; self: boolean; shopWeek: ShopDay[]; onClose: () => void }) {
  const router = useRouter();
  const [isBarber, setIsBarber] = useState(member.isBarber);
  const [isAdmin, setIsAdmin] = useState(member.isAdmin);
  const [accepting, setAccepting] = useState(member.acceptingBookings);
  const [percent, setPercent] = useState(member.commissionPercent);
  const [customWeek, setCustomWeek] = useState(member.week.length === 7);
  const [week, setWeek] = useState<WeekDay[]>(member.week.length === 7 ? member.week : weekFromShop(shopWeek));
  const [pending, startTransition] = useTransition();
  const closedDays = shopWeek.filter((d) => d.isClosed).map((d) => d.weekday);

  function save() {
    startTransition(async () => {
      const result = await saveTeamMemberAction({ userId: member.id, isBarber, isAdmin, acceptingBookings: accepting, commissionPercent: percent });
      if (!result.ok) return void toast.error(result.error);
      if (isBarber) {
        const weekResult = await saveBarberWeekAction({
          barberId: member.id,
          days: customWeek ? week.map((d) => (closedDays.includes(d.weekday) ? { ...d, isOff: true } : d)) : null,
        });
        if (!weekResult.ok) return void toast.error(weekResult.error);
      }
      toast.success("Equipe atualizada.");
      onClose();
      router.refresh();
    });
  }

  return (
    <BottomSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={member.name}
      description={member.phoneNumber ? formatBrazilPhone(member.phoneNumber) : undefined}
      footer={
        <Button size="lg" className="w-full" disabled={pending} onClick={save}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      }
    >
      <div className="overflow-hidden rounded-lg bg-card shadow-card">
        <AvatarRow userId={member.id} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Papéis</Label>
        <div className="divide-y divide-hairline rounded-lg bg-card shadow-card">
          <label className="flex items-center justify-between gap-3 px-4 py-3">
            <span>
              <span className="block font-semibold">Barbeiro</span>
              <span className="text-xs text-ink-subtle">Tem agenda, comissão e aparece no agendamento</span>
            </span>
            <Switch checked={isBarber} onCheckedChange={setIsBarber} />
          </label>
          <label className="flex items-center justify-between gap-3 px-4 py-3">
            <span>
              <span className="block font-semibold">Gestão</span>
              <span className="text-xs text-ink-subtle">Acessa painel, financeiro e configurações</span>
            </span>
            <Switch checked={isAdmin} disabled={self} onCheckedChange={setIsAdmin} />
          </label>
        </div>
        {self && <p className="text-xs text-ink-subtle">Você não pode remover o seu próprio acesso de gestão.</p>}
      </div>

      {isBarber && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="commission">Comissão sobre o preço de tabela</Label>
            <div className="flex items-center gap-3">
              <input
                id="commission"
                type="range"
                min={0}
                max={100}
                step={5}
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="flex-1 accent-[var(--cta)]"
              />
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                aria-label="Comissão em %"
                value={percent}
                onChange={(e) => setPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                className="h-11 w-20 text-center font-bold"
              />
              <span className="font-bold">%</span>
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-lg bg-card px-4 py-3 shadow-card">
            <span className="font-semibold">Recebendo agendamentos</span>
            <Switch checked={accepting} onCheckedChange={setAccepting} />
          </label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center justify-between gap-3 rounded-lg bg-card px-4 py-3 shadow-card">
              <span>
                <span className="block font-semibold">Escala própria</span>
                <span className="text-xs text-ink-subtle">Desligado: segue o horário da barbearia</span>
              </span>
              <Switch checked={customWeek} onCheckedChange={setCustomWeek} />
            </label>
            {customWeek && <WeekScheduleEditor value={week} onChange={setWeek} disabledDays={closedDays} />}
          </div>
        </>
      )}
    </BottomSheet>
  );
}

function InviteSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [isBarber, setIsBarber] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await inviteTeamMemberAction({ phone, isBarber, isAdmin });
      if (!result.ok) return void toast.error(result.error);
      toast.success(
        result.data.status === "promoted"
          ? `${result.data.name} agora faz parte da equipe.`
          : "Convite enviado pelo WhatsApp. O acesso vale no primeiro login.",
      );
      setPhone("");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Adicionar à equipe"
      description="Se a pessoa já usa o app, o acesso é liberado na hora. Senão, enviamos um convite pelo WhatsApp."
      footer={
        <Button size="lg" className="w-full" disabled={pending || phone.replace(/\D/g, "").length < 10 || (!isBarber && !isAdmin)} onClick={submit}>
          <Send aria-hidden />
          {pending ? "Enviando…" : "Adicionar à equipe"}
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-phone">WhatsApp</Label>
        <Input id="invite-phone" type="tel" inputMode="tel" placeholder="(11) 98765-4321" value={phone} onChange={(e) => setPhone(maskBrazilPhoneInput(e.target.value))} />
      </div>
      <div className="flex gap-2">
        <label className="flex flex-1 items-center justify-between gap-2 rounded-lg bg-card px-4 py-3 shadow-card">
          <span className="font-semibold">Barbeiro</span>
          <Switch checked={isBarber} onCheckedChange={setIsBarber} />
        </label>
        <label className="flex flex-1 items-center justify-between gap-2 rounded-lg bg-card px-4 py-3 shadow-card">
          <span className="font-semibold">Gestão</span>
          <Switch checked={isAdmin} onCheckedChange={setIsAdmin} />
        </label>
      </div>
      <p className="text-xs text-ink-subtle">Comissão e escala você ajusta depois, no card da pessoa.</p>
    </BottomSheet>
  );
}
