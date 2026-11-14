"use client";

import Image, { type ImageLoader } from "next/image";
import type { Photo as PhotoT } from "@/lib/photos";

/** Responsive sizes come straight from Unsplash's image CDN (no double optimisation). */
const unsplashLoader: ImageLoader = ({ src, width, quality }) =>
  `https://images.unsplash.com/${src}?auto=format&fit=crop&w=${width}&q=${quality ?? 72}`;

/** Full-bleed photograph (fills its positioned parent). */
export function Photo({
  photo,
  sizes = "100vw",
  priority,
  className = "",
  kenBurns,
  eager,
}: {
  photo: PhotoT;
  sizes?: string;
  priority?: boolean;
  className?: string;
  kenBurns?: boolean;
  eager?: boolean;
}) {
  return (
    <Image
      loader={unsplashLoader}
      src={photo.id}
      alt={photo.alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={eager && !priority ? "eager" : undefined}
      className={`object-cover ${kenBurns ? "ken-burns" : ""} ${className}`}
      style={{ objectPosition: photo.pos ?? "50% 50%" }}
    />
  );
}
