import Image from "next/image";
import { cn } from "@/lib/utils";

/** Logo oficial da barbearia; `inverted` usa a versão branca sobre fotos/fundos escuros. */
export function BrandMark({
  className,
  inverted = false,
  alt = "Barbearia do Moura",
}: {
  className?: string;
  inverted?: boolean;
  alt?: string;
}) {
  return (
    <Image
      src={inverted ? "/images/logo-white.webp" : "/images/logo.webp"}
      alt={alt}
      width={480}
      height={290}
      priority
      className={cn("h-14 w-auto select-none", inverted && "drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]", className)}
      draggable={false}
    />
  );
}
