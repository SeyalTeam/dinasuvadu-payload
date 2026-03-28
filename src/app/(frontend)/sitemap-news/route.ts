import { getPayload } from "payload";
import config from "@/payload.config";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || "https://dinasuvadu.com";
  
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
      },
    });
    
    const categoryMap = new Map();
    categories.forEach((cat) => {
      categoryMap.set(cat.id, cat.slug);
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
        publishedAt: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    const newsEntries = posts.map((post) => {
      let categorySlug = "news"; // default fallback
      
      // Determine category slug from the lookup map
      if (post.categories && post.categories.length > 0) {
        const catId = post.categories[0];
        const lookupSlug = categoryMap.get(catId);
        if (lookupSlug) {
          categorySlug = lookupSlug;
        }
      }

      // Ensure date is in ISO 8601 format
      const pubDate = post.publishedAt || post.updatedAt || post.createdAt;

      return {
        loc: `${baseUrl}/${categorySlug}/${post.slug}`,
        title: post.title,
        publicationDate: pubDate,
      };
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${newsEntries
  .map(
    (entry) => `
  <url>
    <loc>${entry.loc}</loc>
    <news:news>
      <news:publication>
        <news:name>Dinasuvadu</news:name>
        <news:language>ta</news:language>
      </news:publication>
      <news:publication_date>${entry.publicationDate}</news:publication_date>
      <news:title>${entry.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')}</news:title>
    </news:news>
  </url>`
  )
  .join("")}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("News Sitemap Error:", error);
    return new Response("Error fetching news for sitemap", { status: 500 });
  }
}
