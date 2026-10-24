import {
  Brush,
  Combine,
  Palette,
  Scissors,
  ScissorsLineDashed,
  SquareScissors,
  type LucideIcon,
} from "lucide-react";

const rules: { keywords: string[]; icon: LucideIcon }[] = [
  {
    keywords: ["corte + barba", "corte e barba", "combo", "completo"],
    icon: Combine,
  },
  { keywords: ["barba", "beard", "bigode"], icon: Brush },
  { keywords: ["color", "pigment", "ting"], icon: Palette },
  { keywords: ["corte", "hair", "cabelo", "fade", "máquina", "maquina"], icon: Scissors },
  { keywords: ["acabamento", "navalha", "raspar"], icon: ScissorsLineDashed },
  { keywords: ["sobrancelha", "design"], icon: SquareScissors },
];

export function getServiceIcon(name: string): LucideIcon {
  const lower = name.toLowerCase();
  if (lower.includes("corte") && lower.includes("barba")) return Combine;
  for (const rule of rules) {
    if (rule.keywords.some((k) => lower.includes(k))) return rule.icon;
  }
  return Scissors;
}
