import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { MODE_COOKIE, MODE_HOME, resolveMode } from "@/lib/modes";

/** Troca de modo (cliente / barbeiro / gestão) para quem tem mais de um papel. */
export async function GET(request: NextRequest, ctx: RouteContext<"/modo/[mode]">) {
  const { mode } = await ctx.params;
  const current = await getCurrentUser();
  if (!current) return NextResponse.redirect(new URL("/login", request.url));
  const resolved = resolveMode(current, mode);
  const response = NextResponse.redirect(new URL(MODE_HOME[resolved], request.url));
  response.cookies.set(MODE_COOKIE, resolved, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
