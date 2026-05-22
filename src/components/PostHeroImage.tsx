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
  const imgClass = className ?? "w-full h-full object-cover";

  return (
    <picture>
      {sources.mobileSrcSet ? (
        <source
          media="(max-width: 640px)"
          srcSet={sources.mobileSrcSet}
          sizes="100vw"
        />
      ) : null}
      <img
        src={sources.src}
        srcSet={sources.srcSet || undefined}
        sizes={sources.sizes}
        alt={alt}
        width={sources.width}
        height={sources.height}
        className={imgClass}
        fetchPriority="high"
      />
    </picture>
  );
}
