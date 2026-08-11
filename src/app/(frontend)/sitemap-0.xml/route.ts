import { getPayload } from "payload";
import config from "@/payload.config";

export const dynamic = "force-dynamic";

function escapeXml(value: unknown): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeBaseUrl(): string {
  let url = (
    process.env.PAYLOAD_PUBLIC_SERVER_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    "https://www.dinasuvadu.com"
  ).replace(/\/$/, "");

  if (url.includes("dinasuvadu.com") && !url.includes("www.dinasuvadu.com") && !url.includes("media.dinasuvadu.com")) {
    url = url.replace("dinasuvadu.com", "www.dinasuvadu.com");
  }

  return url;
}

export async function GET() {
  const baseUrl = normalizeBaseUrl();

  try {
    const payload = await getPayload({ config });

    const sitemapEntries: { loc: string; lastmod: string }[] = [];

    // Find the latest post update date for fallback static page lastmod
    const { docs: latestPost } = await payload.find({
      collection: "posts",
      limit: 1,
      depth: 0,
      sort: "-publishedAt",
      where: { _status: { equals: "published" } },
      select: { publishedAt: true, updatedAt: true },
    });
    const fallbackLastMod = latestPost[0]?.publishedAt || latestPost[0]?.updatedAt || "2026-01-01T00:00:00.000Z";

    // 1. Add static frontend pages
    const staticPages = [
      "",
      "/about-us",
      "/contact-us",
      "/disclaimer",
      "/terms-conditions",
    ];

    staticPages.forEach((pagePath) => {
      sitemapEntries.push({
        loc: `${baseUrl}${pagePath}`,
        lastmod: fallbackLastMod,
      });
    });

    // 2. Fetch and add all categories with proper path hierarchy
    const { docs: categories } = await payload.find({
      collection: "categories",
      limit: 1000,
      depth: 1,
      select: {
        slug: true,
        parent: true,
        updatedAt: true,
      },
    });

    const categoryMap = new Map<string, any>();
    categories.forEach((cat: any) => {
      if (cat.id) categoryMap.set(String(cat.id), cat);
      if (cat._id) categoryMap.set(String(cat._id), cat);
    });

    const addedLocs = new Set<string>();
    staticPages.forEach((path) => addedLocs.add(`${baseUrl}${path}`));

    categories.forEach((category: any) => {
      if (!category.slug) return;

      let path: string | null = null;

      if (!category.parent) {
        // Top-level category
        path = `/${category.slug}`;
      } else {
        // Sub-category: resolve parent slug
        let parentObj = category.parent;
        if (typeof parentObj === "string" || typeof parentObj === "number") {
          parentObj = categoryMap.get(String(parentObj));
        }

        if (parentObj && parentObj.slug) {
          // Verify parent itself is a top-level category (no grand-parent)
          const grandParent = typeof parentObj.parent === "object" ? parentObj.parent : parentObj.parent ? categoryMap.get(String(parentObj.parent)) : null;
          if (!grandParent) {
            path = `/${parentObj.slug}/${category.slug}`;
          }
        }
      }

      if (path) {
        const fullLoc = `${baseUrl}${path}`;
        if (!addedLocs.has(fullLoc)) {
          addedLocs.add(fullLoc);
          sitemapEntries.push({
            loc: fullLoc,
            lastmod: category.updatedAt || fallbackLastMod,
          });
        }
      }
    });

    // 3. Fetch and add all dynamic pages
    const { docs: pages } = await payload.find({
      collection: "pages",
      limit: 1000,
      depth: 0,
      where: {
        _status: { equals: "published" },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    });

    pages.forEach((page: any) => {
      // Avoid duplicate urls for hardcoded routes if they exist in DB
      if (
        page.slug &&
        !["about-us", "contact-us", "disclaimer", "terms-conditions", "home"].includes(page.slug)
      ) {
        const fullLoc = `${baseUrl}/${page.slug}`;
        if (!addedLocs.has(fullLoc)) {
          addedLocs.add(fullLoc);
          sitemapEntries.push({
            loc: fullLoc,
            lastmod: page.updatedAt || fallbackLastMod,
          });
        }
      }
    });

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map(
    (entry) => `
  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${escapeXml(entry.lastmod)}</lastmod>
  </url>`
  )
  .join("")}
</urlset>`;

    return new Response(sitemapXml, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Sitemap Pages Error:", error);
    return new Response("Error generating pages sitemap", { status: 500 });
  }
}
