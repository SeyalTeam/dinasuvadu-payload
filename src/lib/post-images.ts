const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type ImageVariant = "original" | "og" | "hero" | "content" | "card" | "thumb";

export type PostMedia = {
  url?: string;
  filename?: string;
  prefix?: string;
  sizes?: Record<string, { url?: string }>;
  alt?: string;
  caption?: string;
};

type PostWithHero = {
  heroImage?: PostMedia | null;
  layout?: Array<{ blockType?: string; media?: PostMedia }> | null;
  meta?: { image?: PostMedia };
};

const imageVariantSizes: Record<ImageVariant, string[]> = {
  original: [],
  og: ["og", "large", "xlarge", "medium"],
  hero: ["large", "og", "xlarge", "medium", "small"],
  content: ["medium", "small", "large", "xlarge"],
  card: ["small", "medium", "thumbnail", "large"],
  thumb: ["thumbnail", "small", "medium"],
};

function toAbsoluteImageUrl(path: string): string {
  if (!path) return "";

  let processedPath = path;
  try {
    const decoded = decodeURI(path);
    processedPath = encodeURI(decoded);
  } catch {
    processedPath = path.replace(/ /g, "%20");
  }

  if (processedPath.startsWith("http")) return processedPath;
  const cleanPath = processedPath.startsWith("/") ? processedPath : `/${processedPath}`;
  return `${apiUrl}${cleanPath}`;
}

export function getImageUrl(
  media: PostMedia | string | null | undefined,
  variant: ImageVariant = "original"
): string | null {
  if (!media) return null;

  if (typeof media !== "string" && media.sizes && variant !== "original") {
    const sizeOrder = imageVariantSizes[variant] || [];

    for (const sizeKey of sizeOrder) {
      const sizedUrl = media.sizes?.[sizeKey]?.url;
      if (sizedUrl) {
        return toAbsoluteImageUrl(sizedUrl);
      }
    }

    const sizeEntries = Object.values(media.sizes);
    const fallbackSizedUrl = sizeEntries.find((entry) => entry?.url)?.url;
    if (fallbackSizedUrl) {
      return toAbsoluteImageUrl(fallbackSizedUrl);
    }
  }

  let path = typeof media === "string" ? media : media.url;

  if (!path && typeof media !== "string" && media.filename) {
    const prefix = media.prefix ? media.prefix : "media";
    const cleanPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
    path = `/${cleanPrefix}${media.filename}`;
  }

  if (!path) return null;
  return toAbsoluteImageUrl(path);
}

export function resolvePostHeroMedia(post: PostWithHero): PostMedia | null {
  const layoutMedia =
    post.layout?.[0]?.blockType === "mediaBlock" ? post.layout[0].media : null;
  if (layoutMedia && getImageUrl(layoutMedia, "hero")) return layoutMedia;
  if (post.heroImage && getImageUrl(post.heroImage, "hero")) return post.heroImage;
  return null;
}

export function resolvePostHeroImageUrl(
  post: PostWithHero,
  variant: ImageVariant = "hero"
): string | null {
  return getImageUrl(resolvePostHeroMedia(post), variant);
}

export function resolvePostOgImageUrl(post: PostWithHero): string | null {
  return (
    getImageUrl(post.meta?.image, "og") ||
    getImageUrl(post.heroImage, "og") ||
    resolvePostHeroImageUrl(post, "og")
  );
}
