import Link from "next/link";
import { NavalhaState } from "@/components/navalha-state";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <NavalhaState
      code="404"
      title="Essa página passou na navalha"
      description="Cortamos tão rente que ela sumiu. Confira o endereço ou volte para o início."
    >
      <Link href="/" className={buttonVariants({ size: "lg", className: "w-full" })}>
        Ir para o início
      </Link>
    </NavalhaState>
  );
}
