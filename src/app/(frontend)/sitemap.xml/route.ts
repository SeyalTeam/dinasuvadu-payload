import { getPayload } from "payload";
import config from "@/payload.config";

export const dynamic = "force-dynamic";

type SitemapEntry = {
  loc: string;
  lastmod?: string;
};

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
  const postsPerPage = 500;

  try {
    const payload = await getPayload({ config });

    // Count total published posts for exact sitemap count
    const countResult = await payload.count({
      collection: "posts",
      where: { _status: { equals: "published" } },
    });
    const totalPosts = typeof countResult === "number" ? countResult : countResult?.totalDocs || 0;

    // Find the latest updated post
    const { docs: latestPost } = await payload.find({
      collection: "posts",
      limit: 1,
      depth: 0,
      sort: "-publishedAt",
      where: { _status: { equals: "published" } },
      select: {
        publishedAt: true,
        updatedAt: true,
      },
    });
    const postLastMod = latestPost[0]?.publishedAt || latestPost[0]?.updatedAt || new Date().toISOString();

    // Find the latest updated category
    const { docs: latestCategory } = await payload.find({
      collection: "categories",
      limit: 1,
      depth: 0,
      sort: "-updatedAt",
      select: {
        updatedAt: true,
      },
    });
    const catLastMod = latestCategory[0]?.updatedAt || postLastMod;

    const totalSitemaps = Math.max(1, Math.ceil(totalPosts / postsPerPage));
    const sitemapEntries: SitemapEntry[] = [];

    // Add Google News Sitemap (Last 2 days)
    sitemapEntries.push({
      loc: `${baseUrl}/sitemap-news.xml`,
      lastmod: postLastMod,
    });

    // Add static & categories sitemap
    sitemapEntries.push({
      loc: `${baseUrl}/sitemap-0.xml`,
      lastmod: catLastMod,
    });

    // Add post sitemap pages (1 to totalSitemaps)
    for (let page = 1; page <= totalSitemaps; page++) {
      sitemapEntries.push({
        loc: `${baseUrl}/sitemap-post-${page}.xml`,
        lastmod: postLastMod,
      });
    }

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map(
    (entry) => `
  <sitemap>
    <loc>${escapeXml(entry.loc)}</loc>${entry.lastmod ? `
    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : ""}
  </sitemap>`
  )
  .join("")}
</sitemapindex>`;

    return new Response(sitemapIndex, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Sitemap Index Error:", error);
    return new Response("Error generating sitemap index", { status: 500 });
  }
}
