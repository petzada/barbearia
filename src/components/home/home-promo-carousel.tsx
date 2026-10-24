"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

const SLIDES = [
  { src: "/images/home1.webp", alt: "Promoção 1" },
  { src: "/images/home2.webp", alt: "Promoção 2" },
  { src: "/images/home3.webp", alt: "Promoção 3" },
  { src: "/images/home4.webp", alt: "Promoção 4" },
] as const;

const INTERVAL_MS = 4000;

export function HomePromoCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (!api) return;
    setSelected(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    // Seed initial slide index from embla (external system) on subscribe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  useEffect(() => {
    if (!api) return;

    let intervalId: ReturnType<typeof setInterval>;

    const start = () => {
      clearInterval(intervalId);
      intervalId = setInterval(() => api.scrollNext(), INTERVAL_MS);
    };

    const stop = () => clearInterval(intervalId);

    start();
    api.on("pointerDown", stop);
    api.on("pointerUp", start);

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      api.off("pointerDown", stop);
      api.off("pointerUp", start);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [api]);

  return (
    <div className="w-full">
      <Carousel
        setApi={setApi}
        orientation="horizontal"
        opts={{ loop: true, align: "center" }}
        className="w-full"
      >
        <CarouselContent className="-ml-3">
          {SLIDES.map((slide) => (
            <CarouselItem key={slide.src} className="basis-[92%] pl-3">
              <div className="relative aspect-[2/1] w-full max-h-44 overflow-hidden rounded-2xl bg-surface-3">
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  sizes="(max-width: 448px) 92vw, 400px"
                  className="object-cover object-center"
                  priority={slide.src === SLIDES[0].src}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="mt-3 flex justify-center gap-1.5">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => api?.scrollTo(i)}
            className={cn(
              "size-1.5 rounded-full transition-colors",
              selected === i ? "bg-pastel" : "bg-ink-tertiary/60",
            )}
          />
        ))}
      </div>
    </div>
  );
}
