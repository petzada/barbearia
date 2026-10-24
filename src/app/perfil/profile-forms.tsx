"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Upload } from "lucide-react";
import { toast } from "sonner";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { saveProfileAction, uploadAvatarAction } from "@/app/actions/perfil";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "@/components/google-icon";

export function NameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await saveProfileAction({ fullName: name });
          if (!result.ok) return void toast.error(result.error);
          toast.success("Nome atualizado.");
          router.refresh();
        });
      }}
    >
      <Label htmlFor="name">Nome</Label>
      <div className="flex gap-2">
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <Button type="submit" variant="outline" disabled={pending || name.trim() === initialName}>
          Salvar
        </Button>
      </div>
    </form>
  );
}

export function AvatarUpload({ userId }: { userId?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-bold">Foto de perfil</p>
        <p className="text-xs text-ink-subtle">Aparece para os clientes no agendamento.</p>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/webp,image/jpeg,image/png"
        className="sr-only"
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
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => input.current?.click()}>
        <Upload aria-hidden />
        {pending ? "Enviando…" : "Trocar"}
      </Button>
    </div>
  );
}

export function GoogleLinkButton() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const { error } = await authClient.linkSocial({ provider: "google", callbackURL: "/perfil" });
        if (error) {
          setPending(false);
          toast.error(authErrorMessage(error));
        }
      }}
    >
      <GoogleIcon className="size-4" />
      Conectar
    </Button>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      className="text-destructive"
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
