import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { renderAmpPost } from '@/utilities/ampRenderer';

export const revalidate = 300; // Cache for 5 minutes

const normalizeSlug = (slug: string): string => {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
};

async function fetchPost(slug: string) {
  try {
    const payload = await getPayload({ config });
    const response = await payload.find({
      collection: 'posts',
      where: {
        and: [
          {
            slug: {
              equals: normalizeSlug(slug),
            },
          },
          {
            _status: {
              equals: 'published',
            },
          },
        ],
      },
      limit: 1,
      depth: 1,
    });
    return response?.docs?.[0] || null;
  } catch (error) {
    console.error(`Error fetching post for AMP: ${slug}`, error);
    return null;
  }
}

import { resolveCanonicalPostPath, resolvePostPathCandidates } from '@/lib/post-url';

// Fetch parent category details by ID
async function fetchParentCategory(parentId: string) {
  try {
    const payload = await getPayload({ config });
    const res = await payload.findByID({
      collection: 'categories',
      id: parentId,
      depth: 1,
    });
    return res || null;
  } catch (err) {
    console.error(`Error fetching parent category with ID ${parentId}:`, err);
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ categorySlug: string; postSlug: string }> }
) {
  try {
    const { categorySlug, postSlug } = await params;
    
    const post = await fetchPost(postSlug);
    
    if (!post) {
      return notFound();
    }

    // Validate that the request categorySlug matches one of the valid post path candidates
    const candidates = await resolvePostPathCandidates(post as any, async (id: string) => {
      const cat = await fetchParentCategory(id);
      return { slug: cat?.slug };
    });

    const normalizedCategory = categorySlug.toLowerCase();
    const normalizedPost = postSlug.toLowerCase();

    const isValid = candidates.some((candidate) => {
      const segments = candidate.split('/').filter(Boolean);
      return (
        segments.length === 2 &&
        segments[0]?.toLowerCase() === normalizedCategory &&
        segments[1]?.toLowerCase() === normalizedPost
      );
    });

    if (!isValid) {
      return notFound();
    }
    
    const canonicalPath = await resolveCanonicalPostPath(post as any, async (id: string) => {
      const cat = await fetchParentCategory(id);
      return { slug: cat?.slug };
    });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dinasuvadu.com';

    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
    const isBot = /bot|googlebot|crawler|spider|robot|lighthouse|mediapartners|apis-google|amphtml|validator/i.test(userAgent);

    if (!post.isAMP || (!isMobile && !isBot)) {
      return Response.redirect(`${baseUrl}${canonicalPath}`, 302);
    }
    
    const ampContent = await renderAmpPost(post);
    
    return new Response(ampContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('AMP Route GET Error (2-segment):', error);
    return notFound();
  }
}
