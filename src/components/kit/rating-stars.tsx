import { Star } from "lucide-react";
import { cn, countLabel } from "@/lib/utils";

// Sem "use client": a exibição é usada em páginas do servidor; o RatingInput
// só é usado dentro de componentes de cliente.

const formatRating = (n: number) => n.toFixed(1).replace(".", ",");

/** Exibição de nota: 5 estrelas (`stars`) ou estrela + número (`compact`). */
export function RatingStars({
  rating,
  variant = "stars",
  average = false,
  count,
  className,
}: {
  rating: number;
  variant?: "stars" | "compact";
  /** Média: sempre com uma casa decimal ("5,0"). */
  average?: boolean;
  /** Quantidade de avaliações (lida por leitores de tela no modo compacto). */
  count?: number;
  className?: string;
}) {
  if (variant === "compact") {
    return (
      <span className={cn("inline-flex items-center gap-1 text-sm font-bold text-ink", className)}>
        <Star className="size-4 fill-warning text-warning" aria-hidden />
        {average || !Number.isInteger(rating) ? formatRating(rating) : rating}
        <span className="sr-only">
          {" "}de 5{count != null ? ` (${countLabel(count, "avaliação", "avaliações")})` : ""}
        </span>
      </span>
    );
  }
  const filled = Math.round(rating);
  return (
    <span className={cn("flex gap-0.5", className)} role="img" aria-label={`${formatRating(rating)} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-4", n <= filled ? "fill-warning text-warning" : "text-hairline-strong")} aria-hidden />
      ))}
    </span>
  );
}

/** Seleção de nota de 1 a 5 (radiogroup acessível, alvos de 48px). */
export function RatingInput({
  value,
  onChange,
  label = "Nota de 1 a 5",
}: {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}) {
  return (
    <div className="flex justify-center gap-1" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={countLabel(n, "estrela", "estrelas")}
          onClick={() => onChange(n)}
          className="flex size-12 items-center justify-center rounded-full transition active:scale-90"
        >
          <Star className={cn("size-8", n <= value ? "fill-warning text-warning" : "text-hairline-strong")} aria-hidden />
        </button>
      ))}
    </div>
  );
}
