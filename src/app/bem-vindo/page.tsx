import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { PHONE_SIGNUP_NAME } from "@/server/auth/config";
import { hasAcceptedCurrentTerms } from "@/server/terms";
import { OnboardingFlow } from "./onboarding-form";

export const metadata: Metadata = { title: "Bem-vindo" };

export default async function BemVindoPage() {
  const user = await requireUser();
  const needsName = !user.profileCompleted;
  const needsPhone = !user.phoneNumberVerified;
  if (!needsName && !needsPhone) redirect("/entrar");

  return (
    <OnboardingFlow
      needsName={needsName}
      needsPhone={needsPhone}
      needsTerms={!hasAcceptedCurrentTerms(user)}
      initialName={user.name === PHONE_SIGNUP_NAME ? "" : user.name}
    />
  );
}
