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
  return (
    process.env.PAYLOAD_PUBLIC_SERVER_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    "https://www.dinasuvadu.com"
  ).replace(/\/$/, "");
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> }
) {
  const { page: rawPage } = await params;
  const cleanPage = String(rawPage || "").replace(/\.xml$/, "");
  const page = Number.parseInt(cleanPage || "1", 10);

  if (!Number.isFinite(page) || page < 1) {
    return xmlResponse(emptySitemap());
  }

  const baseUrl = normalizeBaseUrl();

  try {
    const payload = await getPayload({ config });
    const db = (payload.db as any).connection.db;
    const postsCollection = db.collection("posts");
    const categoriesCollection = db.collection("categories");

    const totalPosts = await postsCollection.countDocuments({ _status: "published" });
    const totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PER_SITEMAP));

    if (page > totalPages) {
      return xmlResponse(emptySitemap());
    }

    // 1. Fetch category map for path resolution
    const categories = await categoriesCollection
      .find({}, { projection: { _id: 1, slug: 1, parent: 1 } })
      .toArray();

    const categoryMap = new Map<string, { slug: string; parent?: string | null }>();
    categories.forEach((cat: any) => {
      if (cat._id && cat.slug) {
        categoryMap.set(cat._id.toString(), {
          slug: cat.slug,
          parent: cat.parent ? cat.parent.toString() : null,
        });
      }
    });

    // 2. Fetch published posts sorted by customId DESC (newest July 2026 posts in page 1)
    const skip = (page - 1) * POSTS_PER_SITEMAP;
    const posts = await postsCollection
      .find(
        { _status: "published" },
        { projection: { slug: 1, categories: 1, publishedAt: 1, updatedAt: 1, createdAt: 1 } }
      )
      .sort({ customId: -1 })
      .skip(skip)
      .limit(POSTS_PER_SITEMAP)
      .toArray();

    const postPages = posts
      .filter((post: any) => typeof post?.slug === "string" && post.slug.length > 0)
      .map((post: any) => {
        let categorySlug = "news";
        let parentSlug: string | null = null;

        if (Array.isArray(post.categories) && post.categories.length > 0) {
          const catId = post.categories[0]?.toString();
          const lookup = catId ? categoryMap.get(catId) : null;

          if (lookup?.slug) {
            categorySlug = lookup.slug;
            const parentId = lookup.parent;
            const parentLookup = parentId ? categoryMap.get(parentId) : null;
            parentSlug = parentLookup?.slug || null;
          }
        }

        const path = parentSlug
          ? `${parentSlug}/${categorySlug}/${post.slug}`
          : `${categorySlug}/${post.slug}`;

        const pubDate = post.publishedAt || post.updatedAt || post.createdAt;
        const lastmod = pubDate instanceof Date ? pubDate.toISOString() : String(pubDate || new Date().toISOString());

        return {
          loc: `${baseUrl}/${path}`,
          lastmod,
        };
      });

    return xmlResponse(buildSitemap(postPages));
  } catch (error) {
    console.error(`Sitemap Posts Page ${page} Error:`, error);
    return xmlResponse(emptySitemap());
  }
}
