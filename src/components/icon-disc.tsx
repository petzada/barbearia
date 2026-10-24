import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "size-11 text-sm",
  md: "size-14 text-base",
  lg: "size-16 text-lg",
} as const;

type IconDiscProps = ComponentProps<"div"> & {
  children: ReactNode;
  size?: keyof typeof sizeClasses;
};

/** Disco off-white com conteúdo teal — ícones, iniciais e badges visuais da marca. */
export function IconDisc({
  children,
  size = "md",
  className,
  ...props
}: IconDiscProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-cta/20 bg-card font-semibold text-cta shadow-card [&_svg]:text-cta",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
