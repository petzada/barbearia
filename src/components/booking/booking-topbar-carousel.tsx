"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const BOOKING_TOPBAR_HEIGHT_CLASS = "h-[200px]";

const SLIDES = [
  { src: "/images/home1.webp", alt: "Promoção 1" },
  { src: "/images/home2.webp", alt: "Promoção 2" },
  { src: "/images/home3.webp", alt: "Promoção 3" },
  { src: "/images/home4.webp", alt: "Promoção 4" },
] as const;

const INTERVAL_MS = 4000;

export function BookingTopbarCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            i === index ? "opacity-100" : "opacity-0",
          )}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority={i === 0}
          />
        </div>
      ))}
    </>
  );
}
