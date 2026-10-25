/* eslint-disable @next/next/no-img-element -- fotos vêm do R2 (/media) e são pequenas. */
import { getInitials } from "@/lib/profile/display-name";
import { cn } from "@/lib/utils";

const sizes = { xs: "size-9 text-xs", sm: "size-12 text-sm", md: "size-14 text-base", lg: "size-20 text-xl" } as const;

export function BarberAvatar({
  name,
  image,
  size = "md",
  className,
}: {
  name: string;
  image: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-soft font-bold text-cta-ink ring-2 ring-background",
        sizes[size],
        className,
      )}
    >
      {image ? <img src={image} alt="" className="size-full object-cover" /> : getInitials(name)}
    </span>
  );
}
