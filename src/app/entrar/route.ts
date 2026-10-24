import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { MODE_COOKIE, MODE_HOME, resolveMode } from "@/lib/modes";

/** Destino pós-login: onboarding ou a área do modo preferido. */
export async function GET(request: NextRequest) {
  const current = await getCurrentUser();
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  if (!current) return to("/login");
  if (!current.profileCompleted || !current.phoneNumberVerified) return to("/bem-vindo");
  return to(MODE_HOME[resolveMode(current, request.cookies.get(MODE_COOKIE)?.value)]);
}
