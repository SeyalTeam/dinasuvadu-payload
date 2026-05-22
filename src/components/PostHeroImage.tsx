import Image from "next/image";
import type { HeroImageSources } from "@/lib/post-images";

type PostHeroImageProps = {
  sources: HeroImageSources;
  alt: string;
  className?: string;
};

/**
 * LCP hero: standard Next.js Image component for on-the-fly resizing and optimization.
 */
export function PostHeroImage({ sources, alt, className }: PostHeroImageProps) {
  const imgClass = className ?? "w-full h-full object-cover";

  return (
    <Image
      src={sources.originalUrl || sources.src}
      alt={alt}
      width={sources.width}
      height={sources.height}
      className={imgClass}
      sizes="(max-width: 640px) 85vw, (max-width: 991px) 100vw, 66vw"
      priority
      fetchPriority="high"
    />
  );
}
