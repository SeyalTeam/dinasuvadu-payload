import { getPayload } from "payload";
import config from "@/payload.config";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || "https://www.dinasuvadu.com";

  try {
    const payload = await getPayload({ config });

    const sitemapEntries = [];

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
        lastmod: new Date().toISOString(),
        changefreq: "daily",
        priority: pagePath === "" ? "1.0" : "0.7",
      });
    });

    // 2. Fetch and add all categories
    const { docs: categories } = await payload.find({
      collection: "categories",
      limit: 1000,
      depth: 0,
      select: {
        slug: true,
        updatedAt: true,
      },
    });

    categories.forEach((category) => {
      sitemapEntries.push({
        loc: `${baseUrl}/${category.slug}`,
        lastmod: category.updatedAt || new Date().toISOString(),
        changefreq: "daily",
        priority: "0.8",
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

    pages.forEach((page) => {
      // Avoid duplicate urls for hardcoded routes if they exist in DB
      if (page.slug && !["about-us", "contact-us", "disclaimer", "terms-conditions", "home"].includes(page.slug)) {
        sitemapEntries.push({
          loc: `${baseUrl}/${page.slug}`,
          lastmod: page.updatedAt || new Date().toISOString(),
          changefreq: "weekly",
          priority: "0.6",
        });
      }
    });

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map(
    (entry) => `
  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join("")}
</urlset>`;

    return new Response(sitemapXml, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Sitemap Pages Error:", error);
    return new Response("Error generating pages sitemap", { status: 500 });
  }
}
