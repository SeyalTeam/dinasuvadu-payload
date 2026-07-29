import Image from "next/image";
import type { HeroImageSources } from "@/lib/post-images";
import { preloadLcpImage } from "@/lib/preload-lcp-image";

type PostHeroImageProps = {
  sources: HeroImageSources;
  alt: string;
  className?: string;
};

/**
 * LCP hero: standard Next.js Image component for on-the-fly resizing and optimization.
 */
export function PostHeroImage({ sources, alt, className }: PostHeroImageProps) {
  preloadLcpImage(sources);

  const imgClass = className ?? "w-full h-full object-cover";
  // Prefer scaled hero src over original high-res upload URL to reduce server download overhead
  const imgSrc = sources.src || sources.preloadSrc || sources.originalUrl || "";

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={sources.width}
      height={sources.height}
      className={imgClass}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 800px"
      priority
      fetchPriority="high"
      quality={80}
    />
  );
}
