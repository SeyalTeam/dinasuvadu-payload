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
  return (
    process.env.PAYLOAD_PUBLIC_SERVER_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    "https://www.dinasuvadu.com"
  ).replace(/\/$/, "");
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

    // 2. Fetch and add all categories with single-segment slug (matching Next.js [categorySlug] router)
    const { docs: categories } = await payload.find({
      collection: "categories",
      limit: 1000,
      depth: 0,
      select: {
        slug: true,
        updatedAt: true,
      },
    });

    categories.forEach((category: any) => {
      if (!category.slug) return;

      sitemapEntries.push({
        loc: `${baseUrl}/${category.slug}`,
        lastmod: category.updatedAt || fallbackLastMod,
      });
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
        sitemapEntries.push({
          loc: `${baseUrl}/${page.slug}`,
          lastmod: page.updatedAt || fallbackLastMod,
        });
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
