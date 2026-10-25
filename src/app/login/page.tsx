import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getServerEnv } from "@/server/env";
import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/entrar");
  const env = await getServerEnv();

  return (
    <main className="flex min-h-dvh flex-col bg-background lg:flex-row">
      <div className="relative h-[40dvh] min-h-64 shrink-0 overflow-hidden bg-black lg:h-auto lg:min-h-dvh lg:flex-1">
        <Image
          src="/images/login.webp"
          alt="Interior da Barbearia do Moura"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-top"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/30" aria-hidden />
        <div className="absolute left-5 top-[calc(1rem+env(safe-area-inset-top))]">
          <BrandMark inverted />
        </div>
      </div>
      <div className="relative z-10 -mt-8 flex flex-1 flex-col rounded-t-[28px] bg-card px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8 shadow-card lg:mt-0 lg:max-w-[520px] lg:justify-center lg:rounded-none lg:px-14">
        <LoginForm googleEnabled={Boolean(env.googleClientId && env.googleClientSecret)} />
      </div>
    </main>
  );
}
