"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Camera, Check, ChevronRight, LogOut, User } from "lucide-react";
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
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { GoogleIcon } from "@/components/google-icon";
import { RowIcon, rowClass } from "./settings-list";


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
      <button type="button" onClick={() => setOpen(true)} className={`${rowClass} active:bg-muted`}>
        <RowIcon icon={User} />
        <span className="flex-1 font-semibold">Nome</span>
        <span className="max-w-[45%] truncate text-ink-subtle">{initialName}</span>
        <ChevronRight className="size-4 text-ink-tertiary" aria-hidden />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-[28px] border-0 bg-background p-0 sm:mx-auto sm:max-w-lg">
          <form onSubmit={save} className="flex flex-col gap-4 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-6">
            <SheetTitle className="text-xl font-extrabold">Seu nome</SheetTitle>
            <SheetDescription className="text-sm text-ink-subtle">É assim que o barbeiro vê você na agenda.</SheetDescription>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus className="h-14 text-lg" />
            <Button type="submit" size="lg" disabled={pending || name.trim().length < 2}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function AvatarRow({ userId }: { userId?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button type="button" disabled={pending} onClick={() => input.current?.click()} className={`${rowClass} active:bg-muted`}>
        <RowIcon icon={Camera} />
        <span className="flex flex-1 flex-col">
          <span className="font-semibold">Foto</span>
          <span className="text-xs text-ink-subtle">Aparece para os clientes no agendamento.</span>
        </span>
        <span className="text-sm font-semibold text-cta">{pending ? "Enviando…" : "Trocar"}</span>
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
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
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
      className={`${rowClass} active:bg-muted`}
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
      <span className="text-sm font-semibold text-cta">{pending ? "Abrindo…" : "Conectar"}</span>
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
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" className="text-destructive" disabled={pending} />}>
        Excluir minha conta
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir sua conta?</AlertDialogTitle>
          <AlertDialogDescription>
            Seus horários futuros e sua assinatura do clube serão cancelados e seus dados pessoais apagados. Isso não pode
            ser desfeito.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              startTransition(async () => {
                const result = await deleteMyAccountAction();
                if (!result.ok) return void toast.error(result.error);
                toast.success("Conta excluída. Até logo!");
                router.replace("/");
                router.refresh();
              })
            }
          >
            Excluir conta
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
