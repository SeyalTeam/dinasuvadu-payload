import { getPayload } from "payload";
import config from "@/payload.config";

export const dynamic = "force-dynamic";

const POSTS_PER_SITEMAP = 500;

function escapeXml(value: unknown): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeBaseUrl(): string {
  return (process.env.PAYLOAD_PUBLIC_SERVER_URL || "https://www.dinasuvadu.com").replace(/\/$/, "");
}

function normalizeId(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" && id ? id : null;
  }
  return null;
}

function emptySitemap(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
}

function buildSitemap(entries: { loc: string; lastmod: string }[]): string {
  if (entries.length === 0) return emptySitemap();

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `
  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${escapeXml(entry.lastmod)}</lastmod>
  </url>`
  )
  .join("")}
</urlset>`;
}

function xmlResponse(xml: string): Response {
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

async function fetchCategoryMap(payload: any): Promise<Map<string, { slug?: string | null; parent?: unknown }>> {
  try {
    const { docs: categories } = await payload.find({
      collection: "categories",
      limit: 1000,
      depth: 0,
      select: {
        slug: true,
        parent: true,
      },
    });

    const categoryMap = new Map<string, { slug?: string | null; parent?: unknown }>();
    categories.forEach((cat) => {
      categoryMap.set(cat.id, {
        slug: cat.slug,
        parent: cat.parent,
      });
    });

    return categoryMap;
  } catch (error) {
    payload.logger.error({ err: error }, "Sitemap category lookup failed; using fallback category paths");
    return new Map();
  }
}

async function fetchMaxCustomId(payload: any): Promise<number | null> {
  try {
    const { docs } = await payload.find({
      collection: "posts",
      limit: 1,
      depth: 0,
      where: { _status: { equals: "published" } },
      sort: "-customId",
      select: {
        customId: true,
      },
    });

    const customId = docs?.[0]?.customId;
    return typeof customId === "number" && customId > 0 ? customId : null;
  } catch (error) {
    payload.logger.warn({ err: error }, "Sitemap max customId lookup failed");
    return null;
  }
}

async function fetchPostsForSitemapPage(payload: any, page: number): Promise<any[]> {
  const maxCustomId = await fetchMaxCustomId(payload);
  if (!maxCustomId) return [];

  const totalPages = Math.ceil(maxCustomId / POSTS_PER_SITEMAP);
  if (page > totalPages) return [];

  const rangeLow = (page - 1) * POSTS_PER_SITEMAP + 1;
  const rangeHigh = page * POSTS_PER_SITEMAP;

  const { docs } = await payload.find({
    collection: "posts",
    limit: POSTS_PER_SITEMAP,
    page: 1,
    depth: 0,
    sort: "-customId",
    where: {
      and: [
        { _status: { equals: "published" } },
        { customId: { greater_than_equal: rangeLow } },
        { customId: { less_than_equal: rangeHigh } },
      ],
    },
    select: {
      slug: true,
      categories: true,
      updatedAt: true,
      publishedAt: true,
      createdAt: true,
      customId: true,
    },
  });

  return docs || [];
}

export async function GET(request: Request) {
  const baseUrl = normalizeBaseUrl();
  const url = new URL(request.url);
  const pageParam = url.searchParams.get("page");
  const page = Number.parseInt(pageParam || "1", 10);

  if (!Number.isFinite(page) || page < 1) {
    return xmlResponse(emptySitemap());
  }

  try {
    const payload = await getPayload({ config });
    const categoryMap = await fetchCategoryMap(payload);
    const posts = await fetchPostsForSitemapPage(payload, page);

    const postPages = posts
      .filter((post) => typeof post?.slug === "string" && post.slug.length > 0)
      .map((post) => {
        let categorySlug = "news";
        let parentSlug: string | null = null;

        if (Array.isArray(post.categories) && post.categories.length > 0) {
          const catId = normalizeId(post.categories[0]);
          const lookup = catId ? categoryMap.get(catId) : null;

          if (lookup?.slug) {
            categorySlug = lookup.slug;
            const parentId = normalizeId(lookup.parent);
            const parentLookup = parentId ? categoryMap.get(parentId) : null;
            parentSlug = parentLookup?.slug || null;
          }
        }

        const path = parentSlug
          ? `${parentSlug}/${categorySlug}/${post.slug}`
          : `${categorySlug}/${post.slug}`;

        return {
          loc: `${baseUrl}/${path}`,
          lastmod: post.updatedAt || post.publishedAt || post.createdAt || new Date().toISOString(),
        };
      });

    return xmlResponse(buildSitemap(postPages));
  } catch (error) {
    console.error("Sitemap Posts Error:", error);
    return xmlResponse(emptySitemap());
  }
}
