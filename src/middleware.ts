import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;

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
    if (pageMatch) {
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
    '/:categorySlug/(rss|rss.xml)', // Added for top-level category RSS
    '/:categorySlug/:postSlug/(rss|rss.xml)',
  ],
};