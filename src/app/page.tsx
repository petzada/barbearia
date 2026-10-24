import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-black">
      <Image
        src="/images/hero.webp"
        alt="Interior da Barbearia do Moura"
        fill
        priority
        sizes="(max-width: 448px) 100vw, 448px"
        className="object-cover object-top"
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-[45%] bottom-0 bg-gradient-to-b from-transparent from-0% via-black/75 via-[28%] to-black to-[58%]"
        aria-hidden
      />

      <div className="absolute inset-0 flex flex-col px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
        <div className="min-h-0 flex-1" aria-hidden />
        <div className="mb-6 flex shrink-0 flex-col items-center gap-3 pb-1.5 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Barbearia do Moura
          </h1>
          <p className="-mt-1.5 text-base text-white/75">
            Estilo, tradição e atitude
          </p>
        </div>
        <Link
          href="/login"
          className="flex h-12 w-full shrink-0 items-center justify-center rounded-md bg-cta text-base font-medium text-cta-foreground transition-colors hover:bg-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel/60"
        >
          Agende seu horário
        </Link>
      </div>
    </main>
  );
}
