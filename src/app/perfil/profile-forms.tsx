"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Camera, Check, ChevronRight, LogOut, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import {
  deleteMyAccountAction,
  saveProfileAction,
  setWhatsappRemindersAction,
  uploadAvatarAction,
} from "@/app/actions/perfil";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BottomSheet } from "@/components/kit/bottom-sheet";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { GoogleIcon } from "@/components/google-icon";
import { RowIcon, rowClass } from "@/components/kit/settings-list";


export function NameRow({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveProfileAction({ fullName: name });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Nome atualizado.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={rowClass}>
        <RowIcon icon={User} />
        <span className="flex-1 text-[15px] font-semibold">Nome</span>
        <span className="max-w-[45%] truncate text-ink-subtle">{initialName}</span>
        <ChevronRight className="size-4 text-ink-tertiary" aria-hidden />
      </button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Seu nome"
        description="É assim que o barbeiro vê você na agenda."
        footer={
          <Button type="submit" form="name-form" size="lg" className="w-full" disabled={pending || name.trim().length < 2}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        }
      >
        <form id="name-form" onSubmit={save}>
          <Input
            aria-label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            autoFocus
            className="h-14 text-lg"
          />
        </form>
      </BottomSheet>
    </>
  );
}

export function AvatarRow({ userId }: { userId?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button type="button" disabled={pending} onClick={() => input.current?.click()} className={rowClass}>
        <RowIcon icon={Camera} />
        <span className="flex flex-1 flex-col">
          <span className="text-[15px] font-semibold">Foto</span>
          <span className="text-xs text-ink-subtle">Aparece para os clientes no agendamento.</span>
        </span>
        <span className="text-sm font-semibold text-cta-ink">{pending ? "Enviando…" : "Trocar"}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/webp,image/jpeg,image/png"
        className="sr-only"
        aria-label="Escolher foto de perfil"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const form = new FormData();
          form.set("file", file);
          if (userId) form.set("userId", userId);
          startTransition(async () => {
            const result = await uploadAvatarAction(form);
            if (!result.ok) return void toast.error(result.error);
            toast.success("Foto atualizada.");
            router.refresh();
          });
        }}
      />
    </>
  );
}

export function GoogleRow({ connected }: { connected: boolean }) {
  const [pending, setPending] = useState(false);
  if (connected) {
    return (
      <div className={rowClass}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <GoogleIcon className="size-[18px]" />
        </span>
        <span className="flex-1 font-semibold">Google</span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-success-ink">
          <Check className="size-4" aria-hidden />
          Conectado
        </span>
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      className={rowClass}
      onClick={async () => {
        setPending(true);
        const { error } = await authClient.linkSocial({ provider: "google", callbackURL: "/perfil" });
        if (error) {
          setPending(false);
          toast.error(authErrorMessage(error));
        }
      }}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <GoogleIcon className="size-[18px]" />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="font-semibold">Google</span>
        <span className="text-xs text-ink-subtle">Entre mesmo sem receber o código.</span>
      </span>
      <span className="text-sm font-semibold text-cta-ink">{pending ? "Abrindo…" : "Conectar"}</span>
    </button>
  );
}

export function RemindersRow({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(enabled);
  const [pending, startTransition] = useTransition();
  return (
    <label className={rowClass}>
      <RowIcon icon={Bell} />
      <span className="flex flex-1 flex-col">
        <span className="font-semibold">Lembretes no WhatsApp</span>
        <span className="text-xs text-ink-subtle">Aviso no dia do seu horário.</span>
      </span>
      <Switch
        checked={checked}
        disabled={pending}
        aria-label="Lembretes no WhatsApp"
        onCheckedChange={(value) => {
          setChecked(value);
          startTransition(async () => {
            const result = await setWhatsappRemindersAction(value);
            if (!result.ok) {
              setChecked(!value);
              return void toast.error(result.error);
            }
            toast.success(value ? "Lembretes ligados." : "Lembretes desligados.");
            router.refresh();
          });
        }}
      />
    </label>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="lg"
      className="w-full"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/login");
        router.refresh();
      }}
    >
      <LogOut aria-hidden />
      Sair da conta
    </Button>
  );
}

export function DeleteAccountButton() {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" className="text-destructive">
          <Trash2 aria-hidden />
          Excluir minha conta
        </Button>
      }
      title="Excluir sua conta?"
      description="Seus horários futuros e sua assinatura do clube serão cancelados e seus dados pessoais apagados. Isso não pode ser desfeito."
      confirmLabel="Excluir conta"
      onConfirm={async () => {
        const result = await deleteMyAccountAction();
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        toast.success("Conta excluída. Até logo!");
        router.replace("/");
        router.refresh();
      }}
    />
  );
}
