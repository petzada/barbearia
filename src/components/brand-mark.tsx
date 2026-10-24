import { Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

/** Marca textual da barbearia (substituível pelo logo oficial em /public). */
export function BrandMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-md",
          inverted ? "bg-white/15 text-white" : "bg-cta text-cta-foreground",
        )}
      >
        <Scissors className="size-[18px]" strokeWidth={2.25} aria-hidden />
      </span>
      <span className={cn("text-[15px] font-extrabold leading-tight tracking-tight", inverted ? "text-white" : "text-ink")}>
        Barbearia
        <br />
        do Moura
      </span>
    </span>
  );
}
