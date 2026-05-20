const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export type ImageVariant = "original" | "og" | "hero" | "content" | "card" | "thumb";

export type PostMedia = {
  url?: string;
  filename?: string;
  prefix?: string;
  sizes?: Record<string, { url?: string; width?: number; height?: number }>;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
};

type PostWithHero = {
  heroImage?: PostMedia | null;
  layout?: Array<{ blockType?: string; media?: PostMedia }> | null;
  meta?: { image?: PostMedia };
};

export type HeroImageSources = {
  /** Smallest variant — fallback for img src */
  src: string;
  /** Full srcset for desktop */
  srcSet: string;
  /** Mobile-only srcset (≤640w descriptors) so 2x phones don't pick 900w */
  mobileSrcSet: string;
  sizes: string;
  width: number;
  height: number;
  /** URL to preload (largest mobile candidate, typically ~600w) */
  preloadSrc: string;
};

/** Payload image size name → display width for srcset */
const HERO_SRCSET_WIDTHS: Record<string, number> = {
  thumbnail: 300,
  small: 600,
  square: 500,
  medium: 900,
  large: 1400,
  og: 1200,
  xlarge: 1920,
};

const HERO_SRCSET_ORDER = ["thumbnail", "small", "square", "medium", "large", "og"] as const;

const HERO_MOBILE_MAX_WIDTH = 640;

/** WordPress-style uploads: `name-900x506.webp` → width 900 */
function widthFromUrl(url: string): number | null {
  const match = url.match(/-(\d{2,4})x\d+\.(?:webp|jpe?g|png|avif)/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

const imageVariantSizes: Record<ImageVariant, string[]> = {
  original: [],
  og: ["og", "large", "xlarge", "medium"],
  hero: ["small", "medium", "large", "og"],
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

function getSizedUrl(media: PostMedia, sizeKey: string): string | null {
  const sizedUrl = media.sizes?.[sizeKey]?.url;
  if (sizedUrl) return toAbsoluteImageUrl(sizedUrl);
  return null;
}

export function getImageUrl(
  media: PostMedia | string | null | undefined,
  variant: ImageVariant = "original"
): string | null {
  if (!media) return null;

  if (typeof media !== "string" && media.sizes && variant !== "original") {
    const sizeOrder = imageVariantSizes[variant] || [];

    for (const sizeKey of sizeOrder) {
      const sizedUrl = getSizedUrl(media, sizeKey);
      if (sizedUrl) return sizedUrl;
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

function buildSrcSetEntries(media: PostMedia): { w: number; url: string }[] {
  const seen = new Set<string>();
  const entries: { w: number; url: string }[] = [];

  for (const key of HERO_SRCSET_ORDER) {
    const url = getSizedUrl(media, key);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const w = widthFromUrl(url) ?? HERO_SRCSET_WIDTHS[key] ?? 0;
    if (w > 0) entries.push({ w, url });
  }

  entries.sort((a, b) => a.w - b.w);
  return entries;
}

/** Responsive hero URLs from Payload sizes — mobile capped at 600w via `<picture>` */
export function resolvePostHeroSources(post: PostWithHero): HeroImageSources | null {
  const media = resolvePostHeroMedia(post);
  if (!media) return null;

  const srcSetEntries = buildSrcSetEntries(media);
  const fallbackUrl = getImageUrl(media, "hero");

  if (!srcSetEntries.length && fallbackUrl) {
    const w = widthFromUrl(fallbackUrl) ?? 900;
    return {
      src: fallbackUrl,
      srcSet: "",
      mobileSrcSet: "",
      sizes: "(max-width: 991px) 100vw, 66vw",
      width: 1200,
      height: 675,
      preloadSrc: fallbackUrl,
    };
  }

  if (!srcSetEntries.length) return null;

  const smallest = srcSetEntries[0];
  const mobileEntries = srcSetEntries.filter((e) => e.w <= HERO_MOBILE_MAX_WIDTH);
  const preloadEntry =
    mobileEntries[mobileEntries.length - 1] ?? smallest;

  const srcSet = srcSetEntries.map((e) => `${e.url} ${e.w}w`).join(", ");
  const mobileSrcSet = (mobileEntries.length ? mobileEntries : [smallest])
    .map((e) => `${e.url} ${e.w}w`)
    .join(", ");

  return {
    src: smallest.url,
    srcSet,
    mobileSrcSet,
    sizes: "(max-width: 640px) 100vw, (max-width: 991px) 100vw, 66vw",
    width: 1200,
    height: 675,
    preloadSrc: preloadEntry.url,
  };
}

export function resolvePostHeroImageUrl(
  post: PostWithHero,
  variant: ImageVariant = "hero"
): string | null {
  return resolvePostHeroSources(post)?.src ?? getImageUrl(resolvePostHeroMedia(post), variant);
}

export function resolvePostOgImageUrl(post: PostWithHero): string | null {
  return (
    getImageUrl(post.meta?.image, "og") ||
    getImageUrl(post.heroImage, "og") ||
    resolvePostHeroImageUrl(post, "og")
  );
}
