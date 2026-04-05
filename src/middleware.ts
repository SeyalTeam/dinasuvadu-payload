import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // Redirect legacy subcategory pagination query URLs to path-based pagination.
  // Example: /news/tamilnadu?page=2 -> /news/tamilnadu/p/2
  const pageParam = url.searchParams.get('page');
  if (pageParam) {
    const pathMatch = pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
    if (pathMatch) {
      const categorySlug = pathMatch[1];
      const postSlug = pathMatch[2];
      const pageNumber = Number.parseInt(pageParam, 10);
      const isValidPage = Number.isFinite(pageNumber) && pageNumber >= 1;

      // Heuristic: article slugs end with "-<digits>"; avoid redirecting article URLs.
      const looksLikeArticleSlug = /-\d+$/.test(postSlug);

      if (isValidPage && !looksLikeArticleSlug) {
        const targetPath =
          pageNumber === 1
            ? `/${categorySlug}/${postSlug}`
            : `/${categorySlug}/${postSlug}/p/${pageNumber}`;
        const redirectUrl = new URL(targetPath, url);

        // Preserve non-page query params if they exist.
        for (const [key, value] of url.searchParams.entries()) {
          if (key !== 'page') {
            redirectUrl.searchParams.append(key, value);
          }
        }

        return NextResponse.redirect(redirectUrl, 308);
      }
    }
  }

  // Redirect /rss and /rss.xml to /feed (for root)
  if (pathname === '/rss' || pathname === '/rss.xml') {
    console.log(`Redirecting ${pathname} to /feed`);
    return NextResponse.redirect(new URL('/feed', url));
  }

  // Redirect /[categorySlug]/rss and /[categorySlug]/rss.xml to /[categorySlug]/feed
  const categoryRssMatch = pathname.match(/^\/([^/]+)\/(rss|rss\.xml)$/);
  if (categoryRssMatch) {
    const categorySlug = categoryRssMatch[1];
    console.log(`Redirecting ${pathname} to /${categorySlug}/feed`);
    return NextResponse.redirect(new URL(`/${categorySlug}/feed`, url));
  }

  // Redirect /[categorySlug]/[postSlug]/rss and /[categorySlug]/[postSlug]/rss.xml to /[categorySlug]/[postSlug]/feed
  const subCategoryRssMatch = pathname.match(/^\/([^/]+)\/([^/]+)\/(rss|rss\.xml)$/);
  if (subCategoryRssMatch) {
    const categorySlug = subCategoryRssMatch[1];
    const postSlug = subCategoryRssMatch[2];
    console.log(`Redirecting ${pathname} to /${categorySlug}/${postSlug}/feed`);
    return NextResponse.redirect(new URL(`/${categorySlug}/${postSlug}/feed`, url));
  }

  // Existing sitemap rewrite logic
  if (pathname.startsWith('/post-sitemap') && pathname.endsWith('.xml')) {
    const pageMatch = pathname.match(/post-sitemap(\d+)\.xml/);
    if (pageMatch && pageMatch[1]) {
      const page = pageMatch[1];
      url.pathname = '/sitemap-post';
      url.searchParams.set('page', page);
      console.log(`Rewriting ${pathname} to /sitemap-post?page=${page}`);
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/post-sitemap:page.xml',
    '/rss',
    '/rss.xml',
    '/:categorySlug/:postSlug',
    '/:categorySlug/(rss|rss.xml)', // Added for top-level category RSS
    '/:categorySlug/:postSlug/(rss|rss.xml)',
  ],
};
