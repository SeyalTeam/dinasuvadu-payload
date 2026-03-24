export const dynamic = 'force-dynamic'; // Ensures the route is dynamic and not cached indefinitely

// Utility function to escape special characters for XML
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Utility function to wrap content in CDATA
function wrapInCDATA(content: string): string {
  if (!content) return '';
  return `<![CDATA[${content}]]>`;
}

// Utility function to extract plain text from richText content (if available)
function extractPlainTextFromRichText(content: any): string {
  if (!content?.root?.children) return '';
  return content.root.children
    .map((block: any) => block.children.map((child: any) => child.text).join(''))
    .join('\n');
}

// Utility function to fetch category details by ID
async function fetchCategoryById(categoryId: string): Promise<{ slug: string; title: string; parent?: string | { id: string; slug: string } } | null> {
  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/categories/${categoryId}?depth=2`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Failed to fetch category ${categoryId}: ${response.status} ${response.statusText}`);
      return null;
    }

    const category = await response.json();
    return {
      slug: category.slug || 'uncategorized',
      title: category.title || 'Uncategorized',
      parent: category.parent || null,
    };
  } catch (error) {
    console.error(`Error fetching category ${categoryId}:`, error);
    return null;
  }
}

// Utility function to fetch parent category details by ID
async function fetchParentCategory(parentId: string): Promise<{ slug: string; title: string } | null> {
  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/categories/${parentId}?depth=1`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Failed to fetch parent category ${parentId}: ${response.status} ${response.statusText}`);
      return null;
    }

    const parentCategory = await response.json();
    return {
      slug: parentCategory.slug || 'uncategorized',
      title: parentCategory.title || 'Uncategorized',
    };
  } catch (error) {
    console.error(`Error fetching parent category ${parentId}:`, error);
    return null;
  }
}

// Utility function to construct the post URL based on category and subcategory
async function getPostUrl(post: any, baseUrl: string): Promise<string> {
  const category = post.categories?.[0];
  if (!category) {
    console.warn(`Post ${post.slug} has no category, using default 'uncategorized'`);
    return `${baseUrl}/uncategorized/${post.slug}`;
  }

  const categoryDetails = await fetchCategoryById(category.id);
  if (!categoryDetails) {
    console.warn(`Category not found for post ${post.slug}, using default 'uncategorized'`);
    return `${baseUrl}/uncategorized/${post.slug}`;
  }

  if (categoryDetails.parent) {
    const parentId = typeof categoryDetails.parent === 'string' ? categoryDetails.parent : categoryDetails.parent.id;
    const parentCategory = await fetchParentCategory(parentId);
    if (!parentCategory) {
      console.warn(`Parent category not found for category ${categoryDetails.slug}, treating as top-level`);
      return `${baseUrl}/${categoryDetails.slug}/${post.slug}`;
    }
    return `${baseUrl}/${parentCategory.slug}/${categoryDetails.slug}/${post.slug}`;
  }

  return `${baseUrl}/${categoryDetails.slug}/${post.slug}`;
}

export async function GET() {
  // Use the base URL from environment variable
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  // Fetch the most recent 50 published posts from Payload CMS API
  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/posts?limit=50&sort=-publishedAt&where[_status][equals]=published&depth=2`;
  console.log('Fetching posts for RSS feed from:', apiUrl);

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
      console.error('API response not OK:', response.status, response.statusText);
      throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Raw API Response:', JSON.stringify(data, null, 2));
    allPosts = data.docs || [];
    console.log('Total posts fetched for RSS:', allPosts.length);

    if (allPosts.length === 0) {
      console.warn('No posts returned from API');
      return new Response('No published posts available', { status: 404 });
    }
  } catch (error) {
    console.error('Error fetching posts for RSS:', error);
    return new Response(`Error fetching posts: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }

  // Filter posts to ensure only published ones with required fields are included
  const filteredPosts = allPosts.filter((post: any) => 
    post._status === 'published' && 
    post.slug && 
    post.publishedAt && 
    post.title && 
    post.meta?.description
  );

  if (filteredPosts.length === 0) {
    console.warn('No posts passed the filter criteria');
    return new Response('No valid posts available for RSS feed', { status: 404 });
  }

  // Sort posts by publishedAt in descending order (newest first) as a fallback
  filteredPosts.sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // Generate RSS feed XML with correct post URLs
  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wfw="http://wellformedweb.org/CommentAPI/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:sy="http://purl.org/rss/1.0/modules/syndication/"
  xmlns:slash="http://purl.org/rss/1.0/modules/slash/"
  xmlns:media="http://search.yahoo.com/mrss/"
>
  <channel>
    <title>Dinasuvadu</title>
    <atom:link href="${baseUrl}/feed" rel="self" type="application/rss+xml" />
    <link>${baseUrl}</link>
    <description>Tamil News, Breaking News, தமிழ் செய்திகள்</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <language>ta</language>
    <sy:updatePeriod>hourly</sy:updatePeriod>
    <sy:updateFrequency>1</sy:updateFrequency>
    <generator>Next.js with Payload CMS</generator>
    <image>
      <url>${baseUrl}/dinasuvadu.svg</url>
      <title>Dinasuvadu</title>
      <link>${baseUrl}</link>
      <width>32</width>
      <height>32</height>
    </image>
    ${await Promise.all(filteredPosts.map(async (post: any) => {
      // Extract author name (assuming author is a relationship field with a name)
      const authorName = post.populatedAuthors?.[0]?.name || 'Dinasuvadu Team';
      // Extract categories (assuming categories is an array of objects with a name field)
      const categories = Array.isArray(post.categories) ? post.categories.map((cat: any) => cat.name || cat.title).filter(Boolean) : [];
      // Extract image URL (assuming heroImage or meta.image is available)
      const imageUrl = post.heroImage?.url || post.meta?.image?.url || null;
      const fullImageUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`) : null;
      const imageAlt = post.heroImage?.alt || post.meta?.image?.alt || post.title;
      // Extract post content (assuming content field exists with richText structure)
      const postContent = post.content ? extractPlainTextFromRichText(post.content) : (post.meta?.description || '');
      // Create a short description (truncate content to ~200 characters for the description)
      const shortDescription = postContent.length > 200 ? postContent.substring(0, 200) + '...' : postContent;
      // Get the correct post URL based on category
      const postUrl = await getPostUrl(post, baseUrl);

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="false">${postUrl}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <dc:creator>${wrapInCDATA(authorName)}</dc:creator>
      ${categories
        .map((category: string) => `<category>${wrapInCDATA(category)}</category>`)
        .join('')}
      <description>${wrapInCDATA(
        (fullImageUrl ? `<img src="${fullImageUrl}" alt="${escapeXml(imageAlt)}" />` : '') +
        shortDescription
      )}</description>
      <content:encoded>${wrapInCDATA(
        (fullImageUrl ? `<img src="${fullImageUrl}" alt="${escapeXml(imageAlt)}" />` : '') +
        `<p>${postContent.split('\n').join('</p><p>')}</p>`
      )}</content:encoded>
      ${fullImageUrl ? `
      <media:content url="${fullImageUrl}" medium="image">
        <media:title>${escapeXml(post.title)}</media:title>
      </media:content>` : ''}
    </item>`;
    }))}
  </channel>
</rss>
`;

  return new Response(rssFeed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}