"use client";

import { useEffect } from "react";
import Link from "next/link";
import { NavalhaState } from "@/components/navalha-state";
import { Button, buttonVariants } from "@/components/ui/button";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error("[app] erro não tratado", error);
  }, [error]);

  return (
    <NavalhaState
      code="Ops!"
      title="A máquina engasgou"
      description="Algo deu errado do nosso lado. Tente de novo — se continuar, fale com a barbearia."
    >
      <Button size="lg" className="w-full" onClick={() => retry()}>
        Tentar de novo
      </Button>
      <Link href="/" className={buttonVariants({ size: "lg", variant: "outline", className: "w-full" })}>
        Ir para o início
      </Link>
    </NavalhaState>
  );
}
