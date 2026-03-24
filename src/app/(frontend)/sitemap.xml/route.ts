// D:\All Websites\dinacms\dinasuvadu\src\app\sitemap_index\route.ts
export const dynamic = 'force-dynamic'; // Ensures the route is dynamic and not cached indefinitely

export async function GET() {
  // Use the base URL from environment variable
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  // Define the number of posts per sitemap
  const postsPerPage = 2;

  // Fetch all published posts from Payload CMS API
  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/posts?limit=1000&sort=-publishedAt&where[_status][equals]=published&depth=0`;
  console.log('Fetching all posts from:', apiUrl);

  let allPosts = [];
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Prevent caching issues
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw API Response:', JSON.stringify(data, null, 2)); // Log the full response for debugging
    allPosts = data.docs || [];
    console.log('Total posts fetched:', allPosts.length);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return new Response('Error fetching posts', { status: 500 });
  }

  // Ensure only published posts are included (extra safety check)
  allPosts = allPosts.filter((post: any) => post._status === 'published' && post.publishedAt && post.slug);

  // Sort posts by publishedAt in descending order (newest first) as a fallback
  allPosts.sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // Calculate the total number of sitemap files needed
  const totalSitemaps = Math.ceil(allPosts.length / postsPerPage);
  console.log('Total sitemap files needed:', totalSitemaps);

  // Generate sitemap index entries
  const sitemapEntries = [];
  for (let i = 0; i < totalSitemaps; i++) {
    const startIndex = i * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const postsInSitemap = allPosts.slice(startIndex, endIndex);

    if (postsInSitemap.length === 0) continue;

    // Get the most recent publishedAt date for the lastmod field
    const lastmod = postsInSitemap[0].publishedAt; // Since posts are sorted, the first post has the most recent date

    sitemapEntries.push({
      loc: `${baseUrl}/post-sitemap${i + 1}.xml`,
      lastmod,
    });
  }

  // Generate sitemap index XML
  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemapEntries
    .map(
      (entry: { loc: string; lastmod: string }) => `
  <sitemap>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
  </sitemap>`
    )
    .join('')}
</sitemapindex>`;

  return new Response(sitemapIndex, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
    },
  });
}