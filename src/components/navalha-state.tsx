import type { ReactNode } from "react";
import { Scissors } from "lucide-react";

/** Tela de 404/erro com o humor da casa. */
export function NavalhaState({
  code,
  title,
  description,
  children,
}: {
  code: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-5 px-6 py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-teal-soft text-cta">
        <Scissors className="size-7 -rotate-45" aria-hidden />
      </span>
      <p className="tabular text-7xl font-extrabold tracking-tighter text-cta">{code}</p>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-[15px] text-ink-subtle">{description}</p>
      </div>
      <div className="flex w-full flex-col gap-2">{children}</div>
    </main>
  );
}
