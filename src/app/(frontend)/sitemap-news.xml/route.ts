import { getPayload } from "payload";
import config from "@/payload.config";

export const dynamic = "force-dynamic";
export const revalidate = 60;

function escapeXml(value: unknown): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeBaseUrl(): string {
  const rawUrl = (
    process.env.NEXT_PUBLIC_SERVER_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PAYLOAD_PUBLIC_SERVER_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://www.dinasuvadu.com"
  ).replace(/\/$/, "");

  let url = rawUrl;
  if (url.includes("dinasuvadu.com") && !url.includes("www.dinasuvadu.com") && !url.includes("media.dinasuvadu.com")) {
    url = url.replace("dinasuvadu.com", "www.dinasuvadu.com");
  }

  return url;
}

export async function GET() {
  const baseUrl = normalizeBaseUrl();
  
  // Google News sitemap must only contain articles from the last 2 days
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  try {
    const payload = await getPayload({ config });
    
    // 1. Fetch ALL categories in ONE query to create a fast lookup map
    const { docs: categories } = await payload.find({
      collection: "categories",
      limit: 1000,
      depth: 0,
      select: {
        slug: true,
        parent: true,
      },
    });
    
    const categoryMap = new Map<string, { slug: string; parent?: any }>();
    categories.forEach((cat: any) => {
      const idStr = String(cat.id || cat._id || "");
      if (idStr) {
        categoryMap.set(idStr, {
          slug: cat.slug,
          parent: cat.parent,
        });
      }
    });

    // 2. Fetch posts published in the last 2 days (Max 1000 for Google News)
    const { docs: posts } = await payload.find({
      collection: "posts",
      limit: 1000,
      depth: 0,
      sort: "-publishedAt",
      where: {
        and: [
          { _status: { equals: "published" } },
          { publishedAt: { greater_than_equal: twoDaysAgo.toISOString() } },
        ]
      },
      select: {
        title: true,
        slug: true,
        categories: true,
        parentCategory: true,
        publishedAt: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    const newsEntries = posts.map((post: any) => {
      let categorySlug = "news"; // default fallback
      let parentSlug: string | null = null;
      
      // Determine category slug from the lookup map
      if (post.categories && post.categories.length > 0) {
        const rawCat = post.categories[0];
        const catId = typeof rawCat === "object" && rawCat !== null ? rawCat.id || rawCat._id : rawCat;
        const lookup = catId ? categoryMap.get(String(catId)) : null;
        if (lookup) {
          categorySlug = lookup.slug;
          const rawParent = lookup.parent;
          const parentId = typeof rawParent === "object" && rawParent !== null
            ? rawParent.id || rawParent._id
            : rawParent;
          if (parentId) {
            const parentLookup = categoryMap.get(String(parentId));
            if (parentLookup) {
              parentSlug = parentLookup.slug;
            }
          }
        }
      }

      if (!parentSlug && post.parentCategory) {
        const rawParentCat = post.parentCategory;
        const parentCatId = typeof rawParentCat === "object" && rawParentCat !== null
          ? rawParentCat.id || rawParentCat._id
          : rawParentCat;
        const parentLookup = parentCatId ? categoryMap.get(String(parentCatId)) : null;
        if (parentLookup && parentLookup.slug !== categorySlug) {
          parentSlug = parentLookup.slug;
        }
      }

      const pubDate = post.publishedAt || post.updatedAt || post.createdAt;
      const path = parentSlug 
        ? `${parentSlug}/${categorySlug}/${post.slug}` 
        : `${categorySlug}/${post.slug}`;

      return {
        loc: `${baseUrl}/${path}`,
        title: post.title || "",
        publicationDate: pubDate,
      };
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${newsEntries
  .map(
    (entry: any) => `
  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>Dinasuvadu</news:name>
        <news:language>ta</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(entry.publicationDate)}</news:publication_date>
      <news:title>${escapeXml(entry.title)}</news:title>
    </news:news>
  </url>`
  )
  .join("")}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("News Sitemap Error:", error);
    return new Response("Error fetching news for sitemap", { status: 500 });
  }
}
