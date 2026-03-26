import { getPayload } from "payload";
import config from "@/payload.config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || "https://dinasuvadu.com";
  
  const url = new URL(request.url);
  const pageParam = url.searchParams.get("page");
  const page = parseInt(pageParam || "1", 10);
  
  if (isNaN(page) || page < 1) {
    return new Response("Invalid page number", { status: 404 });
  }

  const postsPerPage = 1000;

  try {
    const payload = await getPayload({ config });
    
    // 1. Fetch ALL categories in ONE query to create a fast lookup map
    const { docs: categories } = await payload.find({
      collection: "categories",
      limit: 1000,
      depth: 0,
    });
    
    const categoryMap = new Map();
    categories.forEach((cat) => {
      categoryMap.set(cat.id, cat.slug);
    });

    // 2. Fetch posts with depth: 0 (Extremely fast, no relationship JOINs)
    const { docs: posts } = await payload.find({
      collection: "posts",
      limit: postsPerPage,
      page,
      depth: 0,
      where: { _status: { equals: "published" } },
    });

    if (posts.length === 0) {
      return new Response("No posts found for this page", { status: 404 });
    }

    const postPages = posts.map((post) => {
      let categorySlug = "news"; // default fallback
      
      // Determine category slug from the lookup map
      if (post.categories && post.categories.length > 0) {
        // Since depth is 0, categories is an array of IDs (strings)
        const catId = post.categories[0];
        const lookupSlug = categoryMap.get(catId);
        if (lookupSlug) {
          categorySlug = lookupSlug;
        }
      }

      return {
        loc: `${baseUrl}/${categorySlug}/${post.slug}`,
        lastmod: post.updatedAt || post.publishedAt || post.createdAt,
      };
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${postPages
  .map(
    (page) => `
  <url>
    <loc>${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
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
    console.error("Sitemap Posts Error:", error);
    return new Response("Error fetching posts for sitemap", { status: 500 });
  }
}