import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getServerEnv } from "@/server/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/entrar");
  const env = await getServerEnv();

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-black lg:flex-row">
      <div className="relative min-h-[42dvh] flex-1 lg:min-h-dvh">
        <Image
          src="/images/login.webp"
          alt="Interior da Barbearia do Moura"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-top"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black lg:bg-gradient-to-r lg:from-transparent lg:via-black/20 lg:to-black/70"
          aria-hidden
        />
      </div>
      <div className="relative z-10 -mt-16 flex flex-col px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] lg:mt-0 lg:w-[480px] lg:justify-center lg:bg-black lg:px-12">
        <LoginForm googleEnabled={Boolean(env.googleClientId && env.googleClientSecret)} />
      </div>
    </main>
  );
}
