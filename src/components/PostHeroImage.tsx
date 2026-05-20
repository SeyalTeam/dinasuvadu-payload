import type { HeroImageSources } from "@/lib/post-images";

type PostHeroImageProps = {
  sources: HeroImageSources;
  alt: string;
  className?: string;
};

/**
 * LCP hero: native img with Payload srcset (CDN direct, no /_next/image hop).
 */
export function PostHeroImage({ sources, alt, className }: PostHeroImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sources.src}
      srcSet={sources.srcSet || undefined}
      sizes={sources.sizes}
      alt={alt}
      width={sources.width}
      height={sources.height}
      className={className ?? "w-full h-full object-cover"}
      decoding="async"
      fetchPriority="high"
    />
  );
}
