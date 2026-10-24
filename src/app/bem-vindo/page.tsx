import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { PHONE_SIGNUP_NAME } from "@/server/auth/config";
import { BrandMark } from "@/components/brand-mark";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Bem-vindo" };

export default async function BemVindoPage() {
  const user = await requireUser();
  const needsName = !user.profileCompleted;
  const needsPhone = !user.phoneNumberVerified;
  if (!needsName && !needsPhone) redirect("/entrar");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-6 pb-10 pt-[calc(2.5rem+env(safe-area-inset-top))]">
      <BrandMark />
      <OnboardingForm
        needsName={needsName}
        needsPhone={needsPhone}
        initialName={user.name === PHONE_SIGNUP_NAME ? "" : user.name}
      />
    </main>
  );
}
