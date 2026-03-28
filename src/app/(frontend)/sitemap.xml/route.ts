import { getPayload } from "payload";
import config from "@/payload.config";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || "https://dinasuvadu.com";
  const postsPerPage = 500;

  try {
    const payload = await getPayload({ config });
    
    // Find total number of published posts
    const { totalDocs } = await payload.find({
      collection: "posts",
      limit: 1, // We only need the total count
      depth: 0,
      where: { _status: { equals: "published" } },
    });

    const totalSitemaps = Math.ceil(totalDocs / postsPerPage);
    const sitemapEntries = [];

    // Add Google News Sitemap (Last 2 days)
    sitemapEntries.push({
      loc: `${baseUrl}/sitemap-news`,
      lastmod: new Date().toISOString(),
    });

    // Add Next-Sitemap's standard static sitemap
    sitemapEntries.push({
      loc: `${baseUrl}/sitemap-0.xml`, 
      lastmod: new Date().toISOString(),
    });

    // Add Dynamic Post Sitemaps
    for (let i = 0; i < totalSitemaps; i++) {
      sitemapEntries.push({
        loc: `${baseUrl}/sitemap-post?page=${i + 1}`,
        lastmod: new Date().toISOString(),
      });
    }

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map(
    (entry) => `
  <sitemap>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
  </sitemap>`
  )
  .join("")}
</sitemapindex>`;

    return new Response(sitemapIndex, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Sitemap Index Error:", error);
    return new Response("Error generating sitemap index", { status: 500 });
  }
}