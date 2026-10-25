import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fieldLabelClass } from "@/lib/ui/classes";

/** Rótulo de grupo em folhas e formulários (para campos use `<Label htmlFor>`). */
export function FieldLabel({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <p id={id} className={cn(fieldLabelClass, className)}>
      {children}
    </p>
  );
}
