import Image from "next/image";

const CDN_HOST = "media.dinasuvadu.com";

type PostHeroImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
};

/**
 * LCP hero image: loads pre-sized CDN assets directly (skips /_next/image)
 * when the source is already on media.dinasuvadu.com.
 */
export function PostHeroImage({
  src,
  alt,
  width = 1200,
  height = 675,
  className,
}: PostHeroImageProps) {
  const useCdnDirect = src.includes(CDN_HOST);

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes="(max-width: 1024px) 100vw, 66vw"
      priority
      fetchPriority="high"
      unoptimized={useCdnDirect}
    />
  );
}
