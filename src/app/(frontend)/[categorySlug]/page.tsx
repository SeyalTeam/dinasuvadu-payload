import React from "react";
export const revalidate = 60; // Revalidate every 60 seconds
export const dynamicParams = true;
import type { Metadata } from "next";

import { buildMetadata, buildBreadcrumbLd } from "@/lib/seo";
// Removed duplicate import of buildMetadata
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import ShareButton from "@/components/ShareButton";
import { getPayload } from "payload";
import config from "@/payload.config";
import { resolvePostPathForContext } from "@/lib/post-url";
import { timeAgo } from "@/utilities/timeAgo";
import { CategoryFeed } from "@/components/CategoryFeed";

// Type definitions
type Category = {
  id: string;
  title?: string;
  slug: string;
  parent?: { id: string; slug: string; title: string } | string | null;
};

type Tag = {
  id: string;
  name: string;
  slug: string;
};

type Post = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  heroImage?: {
    url: string;
    alt?: string;
  };
  meta?: {
    description?: string;
  };
  tags?: Tag[];
  categories?: { id: string; slug: string; parent?: any }[];
  layout?: {
    blockType: string;
    media?: {
      url: string;
      alt?: string;
    };
  }[];
};

// API base URL
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

// Fetch a category by slug
async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const payload = await getPayload({ config });
    const decoded = decodeURIComponent(slug);
    const encoded = encodeURIComponent(decoded);
    const res = await payload.find({
      collection: "categories",
      where: {
        or: [
          { slug: { equals: slug } },
          { slug: { equals: decoded } },
          { slug: { equals: encoded } },
          { slug: { equals: encoded.toLowerCase() } },
          { slug: { equals: encoded.toUpperCase() } },
        ],
      },
      depth: 2,
    });
    return (res.docs[0] as unknown as Category) || null;
  } catch (error) {
    console.error(`Error fetching category with slug ${slug}:`, error);
    return null;
  }
}

// Fetch posts by category ID with pagination
async function fetchPostsByCategoryId(
  categoryId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ posts: Post[]; total: number }> {
  try {
    const payload = await getPayload({ config });
    const response = await payload.find({
      collection: "posts",
      limit,
      page,
      depth: 2,
      sort: "-publishedAt",
      where: {
        categories: {
          in: [categoryId],
        },
      },
    });

    return {
      posts: (response.docs as unknown as Post[]) || [],
      total: response.totalDocs,
    };
  } catch (error) {
    console.error(`Error fetching posts for category ID ${categoryId}:`, error);
    return { posts: [], total: 0 };
  }
}

// Fetch posts by category slug (using category ID) with pagination
async function fetchPostsByCategory(
  categorySlug: string,
  page: number = 1,
  limit: number = 10
): Promise<{ posts: Post[]; total: number }> {
  try {
    const payload = await getPayload({ config });

    // Get the current category
    const categoryRes = await payload.find({
      collection: "categories",
      where: {
        slug: {
          equals: categorySlug,
        },
      },
      depth: 0,
    });

    const category = categoryRes.docs[0];
    if (!category) {
      return { posts: [], total: 0 };
    }

    const categoryId = category.id;

    // Fetch child categories to include their posts in the parent view
    const childrenRes = await payload.find({
      collection: "categories",
      where: {
        parent: {
          equals: categoryId,
        },
      },
      depth: 0,
      limit: 100,
    });

    const childIds = childrenRes.docs.map((c: any) => c.id);
    const allCategoryIds = [categoryId, ...childIds];

    const decoded = decodeURIComponent(categorySlug);
    const encoded = encodeURIComponent(decoded);
    const response = await payload.find({
      collection: "posts",
      limit,
      page,
      depth: 2,
      sort: "-publishedAt",
      where: {
        categories: {
          in: allCategoryIds,
        },
      },
    });

    return {
      posts: (response.docs as unknown as Post[]) || [],
      total: response.totalDocs,
    };
  } catch (error) {
    console.error(`Error fetching posts for category slug ${categorySlug}:`, error);
    return { posts: [], total: 0 };
  }
}

// Fetch children categories for a parent category
async function fetchChildrenCategories(
  parentId: string
): Promise<Category[]> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "categories",
      where: {
        parent: {
          equals: parentId,
        },
      },
      limit: 100,
      depth: 1,
    });
    return (res.docs as unknown as Category[]) || [];
  } catch (err) {
    console.error(`Error fetching children for category ID ${parentId}:`, err);
    return [];
  }
}

// Fetch category details by ID
async function fetchCategoryById(
  categoryId: string
): Promise<{ title: string } | null> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.findByID({
      collection: "categories",
      id: categoryId,
      depth: 1,
    });
    const category = res || null;
    return {
      title: category?.title || "Uncategorized",
    };
  } catch (err) {
    console.error(`Error fetching category with ID ${categoryId}:`, err);
    return null;
  }
}

async function fetchParentCategory(
  parentId: string
): Promise<{ slug: string; title: string } | null> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.findByID({
      collection: "categories",
      id: parentId,
      depth: 1,
    });
    const parentCategory = (res as unknown as Category) || null;
    if (!parentCategory) return null;
    return {
      slug: parentCategory.slug || "uncategorized",
      title: parentCategory.title || "Uncategorized",
    };
  } catch (err) {
    console.error(`Error fetching parent category with ID ${parentId}:`, err);
    return null;
  }
}

// Helper function to get the image URL with proper base URL
function getImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${apiUrl}${url}`;
}

// Generate dynamic metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await fetchCategoryBySlug(categorySlug);
  if (category) {
    const title = `${category.title || "Category"} News`;
    const description = `Follow the latest ${category.title || "category"} news, updates, and analysis on Dinasuvadu.`;
    return buildMetadata({
      title,
      description,
      canonical: `https://www.dinasuvadu.com/${categorySlug}`,
    });
  }
  return buildMetadata({
    title: "Category News",
    description: "Explore category news on Dinasuvadu.",
    canonical: `https://www.dinasuvadu.com/${categorySlug}`,
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>; // Updated type
}) {
  console.log("Entering CategoryPage component for [categorySlug]");

  const { categorySlug } = await params;
  const query = await searchParams; // Await searchParams
  const isNews = categorySlug.toLowerCase() === 'news';
  const isCinema = categorySlug.toLowerCase() === "cinema";
  const isSports = categorySlug.toLowerCase() === "sports";
  const isTech = categorySlug.toLowerCase() === "technology";
  const isAuto = categorySlug.toLowerCase() === "automobile";
  const isDevotional = categorySlug.toLowerCase() === "devotional";
  const isLifestyle = categorySlug.toLowerCase() === "lifestyle";
  const isBusiness = categorySlug.toLowerCase() === "business";
  const page = parseInt((query.page as string) || "1", 10);
  const initialListLimit = 10;
  const spotlightLimit = 4;
  const limit = spotlightLimit + initialListLimit;
  console.log(`Handling route: /${categorySlug}?page=${page}, initialListLimit: ${initialListLimit}`);


  const category = await fetchCategoryBySlug(categorySlug);
  if (!category) {
    console.log(`Category ${categorySlug} not found`);
    notFound();
  }

  if (category.parent) {
    console.log(
      `Category ${categorySlug} has a parent, this route is for top-level categories only.`
    );
    notFound();
  }

  const categoryTitle = category.title || "Uncategorized";
  let parentCategoryData: { slug: string; title: string } | null = null;


  const { posts: rawPosts, total } = await fetchPostsByCategory(
    categorySlug,
    page,
    limit
  );

  // Resolve initial posts with URLs on the server
  const resolvedPosts = await Promise.all(
    rawPosts.map(async (post) => {
      const postLink = await resolvePostPathForContext(
        post,
        { topLevelSlug: categorySlug },
        fetchParentCategory
      );
      return { ...post, postLink };
    })
  );

  // Split spotlight and feed posts
  const isParentCategory = !category.parent;
  const spotlightPosts = isParentCategory ? resolvedPosts.slice(0, spotlightLimit) : [];
  const initialPosts = isParentCategory ? resolvedPosts.slice(spotlightLimit, 10) : resolvedPosts.slice(0, initialListLimit);

  // Sidebar Data: Fetch children categories for the current parent
  let sidebarCategories = await fetchChildrenCategories(category.id);

  // Custom sort for Cinema category
  if (isCinema) {
    const priority = ['cinemanews', 'movies', 'movie-reviews', 'movie reviews', 'celebrities', 'ott', 'gossips', 'tamil-serial-news', 'gallery'];
    sidebarCategories = [...sidebarCategories].sort((a, b) => {
      const slugA = a.slug.toLowerCase();
      const titleA = a.title?.toLowerCase() || '';
      const slugB = b.slug.toLowerCase();
      const titleB = b.title?.toLowerCase() || '';
      
      const indexA = priority.findIndex(p => slugA === p || titleA === p);
      const indexB = priority.findIndex(p => slugB === p || titleB === p);
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });
  } else if (isSports) {
    const priority = ['cricket', 'football', 'hockey', 'tennis', 'chess'];
    sidebarCategories = [...sidebarCategories].sort((a, b) => {
      const slugA = a.slug.toLowerCase();
      const titleA = a.title?.toLowerCase() || '';
      const slugB = b.slug.toLowerCase();
      const titleB = b.title?.toLowerCase() || '';
      
      const indexA = priority.findIndex(p => slugA === p || titleA === p);
      const indexB = priority.findIndex(p => slugB === p || titleB === p);
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });
  } else if (isTech) {
    const priority = ['mobiles', 'laptops', 'gadgets', 'apps', 'ai'];
    sidebarCategories = [...sidebarCategories].sort((a, b) => {
      const slugA = a.slug.toLowerCase();
      const titleA = a.title?.toLowerCase() || '';
      const slugB = b.slug.toLowerCase();
      const titleB = b.title?.toLowerCase() || '';
      
      const indexA = priority.findIndex(p => slugA === p || titleA === p);
      const indexB = priority.findIndex(p => slugB === p || titleB === p);
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });
  } else if (isAuto) {
    const priority = ['cars', 'bikes', 'ev-news', 'ev news', 'launches'];
    sidebarCategories = [...sidebarCategories].sort((a, b) => {
      const slugA = a.slug.toLowerCase();
      const titleA = a.title?.toLowerCase() || '';
      const slugB = b.slug.toLowerCase();
      const titleB = b.title?.toLowerCase() || '';
      
      const indexA = priority.findIndex(p => slugA === p || titleA === p);
      const indexB = priority.findIndex(p => slugB === p || titleB === p);
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });
  } else if (isDevotional) {
    const priority = ['aanmeegam', 'parigaram', 'rasipalan', 'temples', 'astrology'];
    sidebarCategories = [...sidebarCategories].sort((a, b) => {
      const slugA = a.slug.toLowerCase();
      const titleA = a.title?.toLowerCase() || '';
      const slugB = b.slug.toLowerCase();
      const titleB = b.title?.toLowerCase() || '';
      
      const indexA = priority.findIndex(p => slugA === p || titleA === p);
      const indexB = priority.findIndex(p => slugB === p || titleB === p);
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });
  } else if (isNews) {
    const priority = ['tamilnadu', 'india', 'world'];
    sidebarCategories = [...sidebarCategories].sort((a, b) => {
      const slugA = a.slug.toLowerCase();
      const slugB = b.slug.toLowerCase();
      const indexA = priority.indexOf(slugA);
      const indexB = priority.indexOf(slugB);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });
  } else if (isLifestyle) {
    const priority = ['beauty-tips', 'beauty tips', 'health', 'food-recipes', 'food recipes'];
    sidebarCategories = [...sidebarCategories].sort((a, b) => {
      const slugA = a.slug.toLowerCase();
      const titleA = a.title?.toLowerCase() || '';
      const slugB = b.slug.toLowerCase();
      const titleB = b.title?.toLowerCase() || '';
      
      const indexA = priority.findIndex(p => slugA === p || titleA === p);
      const indexB = priority.findIndex(p => slugB === p || titleB === p);
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });
  } else if (isBusiness) {
    const priority = ['gold-silver-price', 'gold silver price', 'fuel-price', 'fuel price', 'stocks'];
    sidebarCategories = [...sidebarCategories].sort((a, b) => {
      const slugA = a.slug.toLowerCase();
      const titleA = a.title?.toLowerCase() || '';
      const slugB = b.slug.toLowerCase();
      const titleB = b.title?.toLowerCase() || '';
      
      const indexA = priority.findIndex(p => slugA === p || titleA === p);
      const indexB = priority.findIndex(p => slugB === p || titleB === p);
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });
  }

  const sidebarContent = await Promise.all(
    sidebarCategories.map(async (cat, index) => {
      // Custom fetch limits
      const isCelebrities = cat.slug.toLowerCase() === 'celebrities';
      const isLifestyleTips = cat.slug.toLowerCase() === 'lifestyle-tips';
      const fetchLimit = (isCelebrities || isLifestyleTips) ? 8 : 5;
      const { posts: catPosts } = await fetchPostsByCategoryId(cat.id, 1, fetchLimit);
      return {
        category: cat,
        posts: await Promise.all(catPosts.map(async (p) => {
          const postLink = await resolvePostPathForContext(
            p,
            { topLevelSlug: cat.slug },
            fetchParentCategory
          );
          return { ...p, postLink };
        }))
      };
    })
  );

  // Limit Sidebar Hubs to top 3 for all parent categories
  const sidebarHubs = isParentCategory ? sidebarContent.slice(0, 3) : [];
  // Processed slugs should only include what we show in the sidebar so the rest goes to the grid
  const processedSlugs = sidebarHubs.map(item => item.category.slug.toLowerCase());
  
  const remainingGrid = sidebarContent.filter(item => !processedSlugs.includes(item.category.slug.toLowerCase()));

  // Build pagination link tags (next / prev) after totalPages is known
  const totalPages = Math.ceil(total / limit);
  const paginationLinks: React.ReactNode[] = [];
  if (page > 1) {
    paginationLinks.push(
      <link
        key="prev"
        rel="prev"
        href={`/${categorySlug}?page=${page - 1}`}
      />
    );
  }
  if (page < totalPages) {
    paginationLinks.push(
      <link
        key="next"
        rel="next"
        href={`/${categorySlug}?page=${page + 1}`}
      />
    );
  }
  return (
    <>
      {/* Head elements: pagination links and breadcrumb JSON‑LD */}

        {paginationLinks}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: buildBreadcrumbLd([
            { name: "Home", url: "https://www.dinasuvadu.com/" },
            { name: categoryTitle, url: `https://www.dinasuvadu.com/${categorySlug}` },
          ]) }}
        />

      <div className="site">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="mb-2 text-sm font-medium text-gray-500 site"
        >
          <div className="flex items-center space-x-2 breadcrumbs pl-[12px]">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              Home
            </Link>
            <span className="text-gray-400">{">"}</span>
            <span className="text-gray-700">{categoryTitle}</span>
          </div>
        </nav>
        
        {/* Category Spotlight Section (Parent only) - Hidden on mobile to use unified CategoryFeed hero */}
        {isParentCategory && spotlightPosts.length > 0 && (
          <div className="site mb-8 hidden md:block">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Big Featured Card (Overlay Style) */}
              <div className="md:col-span-2 lg:col-span-2">
                {spotlightPosts[0] && (
                  <Link href={spotlightPosts[0].postLink || "#"} className="group block relative aspect-[16/9] lg:h-full rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
                    <Image
                      src={spotlightPosts[0].heroImage?.url ? (spotlightPosts[0].heroImage.url.startsWith("http") ? spotlightPosts[0].heroImage.url : `${apiUrl}${spotlightPosts[0].heroImage.url}`) : "/placeholder-news.jpg"}
                      alt={spotlightPosts[0].heroImage?.alt || spotlightPosts[0].title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">{category.title}</span>
                        <span className="text-[10px] text-white/40">•</span>
                        <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">{timeAgo(spotlightPosts[0].publishedAt)}</span>
                      </div>
                      <h2 className="text-lg md:text-xl font-bold text-white leading-tight line-clamp-2 para-txt">
                        {spotlightPosts[0].title}
                      </h2>
                    </div>
                  </Link>
                )}
              </div>

              {/* Three Vertical Cards */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                {spotlightPosts.slice(1).map((post) => (
                  <Link key={post.id} href={post.postLink || "#"} className="group flex flex-col bg-white dark:bg-[#111] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden h-full">
                    <div className="relative aspect-video overflow-hidden">
                      <Image
                        src={post.heroImage?.url ? (post.heroImage.url.startsWith("http") ? post.heroImage.url : `${apiUrl}${post.heroImage.url}`) : "/placeholder-news.jpg"}
                        alt={post.heroImage?.alt || post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        unoptimized
                      />
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{category.title}</span>
                        <span className="text-[10px] text-gray-300 dark:text-gray-700">•</span>
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{timeAgo(post.publishedAt)}</span>
                      </div>
                      <h3 className="text-[14px] md:text-[15px] font-bold text-gray-900 dark:text-white leading-tight line-clamp-3 para-txt group-hover:text-blue-600 transition-colors">
                        {post.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

      <div className="site-main">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
          <div className="lg:col-span-7">
            {(isParentCategory ? (spotlightPosts.length > 0 || initialPosts.length > 0) : initialPosts.length > 0) && (
              <div className="md:bg-white md:dark:bg-[#111] pt-2 md:pt-5 px-4 md:px-8 pb-6 md:pb-8 md:rounded-2xl md:shadow-md md:border border-gray-100 dark:border-gray-800">
                {/* Unified Category Header */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2 mb-4 px-1 md:px-0">
                  <h1 className="text-[20px] md:text-2xl font-black md:font-bold text-gray-900 dark:text-white para-txt uppercase tracking-tight">
                    {categoryTitle}
                  </h1>
                </div>

                {/* Mobile version combines spotlight and initial posts, desktop keeps them separate */}
                <div className="md:hidden">
                  <CategoryFeed 
                    initialPosts={isParentCategory ? [...spotlightPosts, ...initialPosts] : initialPosts}
                    categoryId={category.id}
                    categorySlug={categorySlug}
                    apiUrl={apiUrl}
                    initialOffset={isParentCategory ? spotlightPosts.length + initialPosts.length : initialPosts.length}
                  />
                </div>

                <div className="hidden md:block">
                  <CategoryFeed 
                    initialPosts={initialPosts}
                    categoryId={category.id}
                    categorySlug={categorySlug}
                    apiUrl={apiUrl}
                    initialOffset={16}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar Hub Column (Unified for all parent categories) - Hidden on mobile */}
          {sidebarHubs.length > 0 && (
            <div className="hidden lg:col-span-3 lg:block space-y-8">
              {sidebarHubs.map(({ category: sidebarCat, posts: sidebarPosts }) => {
                if (sidebarPosts.length === 0) return null;
                
                const featuredPost = sidebarPosts[0];
                const listPosts = sidebarPosts.slice(1);

                return (
                  <div key={sidebarCat.id} className="bg-white dark:bg-[#111] p-5 rounded-2xl shadow-md border border-gray-100 dark:border-gray-800 flex flex-col">
                    <Link href={`/${categorySlug}/${sidebarCat.slug}`} className="flex items-center justify-between mb-4 hover:opacity-80 transition-opacity">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white para-txt">{sidebarCat.title}</h2>
                      <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
                        </svg>
                      </div>
                    </Link>
                    <div className="mb-4">
                      <Link href={featuredPost.postLink || "#"} className="group block">
                        <div className="relative aspect-[16/11] rounded-xl overflow-hidden mb-2 border border-gray-100 dark:border-gray-800">
                          <Image
                            src={featuredPost.heroImage?.url ? (featuredPost.heroImage.url.startsWith("http") ? featuredPost.heroImage.url : `${apiUrl}${featuredPost.heroImage.url}`) : "/placeholder-news.jpg"}
                            alt={featuredPost.heroImage?.alt || featuredPost.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            unoptimized
                          />
                        </div>
                        <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 para-txt group-hover:text-blue-600 transition-colors">
                          {featuredPost.title}
                        </h3>
                      </Link>
                    </div>
                    <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      {listPosts.map((post) => (
                        <Link key={post.id} href={post.postLink || "#"} className="group flex gap-3 items-start py-4">
                          <div className="relative w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800">
                            <Image
                              src={post.heroImage?.url ? (post.heroImage.url.startsWith("http") ? post.heroImage.url : `${apiUrl}${post.heroImage.url}`) : "/placeholder-news.jpg"}
                              alt={post.heroImage?.alt || post.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <h4 className="text-[13px] font-bold text-gray-800 dark:text-gray-200 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors para-txt">
                            {post.title}
                          </h4>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Row 2: Remaining Categories in a 4-column Grid Section - Hidden on mobile */}
        {remainingGrid.length > 0 && (
          <div className="hidden md:block space-y-12 mt-12 mb-12">
            {remainingGrid.map(({ category: gridCat, posts: gridPosts }) => {
              if (gridPosts.length === 0) return null;

              return (
                <div key={gridCat.id} className="bg-white dark:bg-[#111] p-6 rounded-2xl shadow-md border border-gray-100 dark:border-gray-800">
                  {/* Grid Header */}
                  <div className="flex items-center justify-between mb-6 pb-2 border-b-2 border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl md:text-2xl font-bold text-[#2a2a6a] dark:text-white para-txt">
                      {gridCat.title}
                    </h2>
                    <Link href={`/${categorySlug}/${gridCat.slug}`} className="text-[#2a2a6a] dark:text-blue-400 font-bold hover:translate-x-1 transition-transform flex items-center">
                      <span className="mr-1">மேலும்</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
                      </svg>
                    </Link>
                  </div>

                  {/* 4-Column Grid of Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {gridPosts.map((post) => (
                      <Link key={post.id} href={post.postLink || "#"} className="group flex flex-col bg-white dark:bg-[#111] rounded-xl overflow-hidden shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full border border-gray-100 dark:border-gray-800">
                        <div className="relative aspect-[16/11] overflow-hidden">
                          <Image
                            src={post.heroImage?.url ? (post.heroImage.url.startsWith("http") ? post.heroImage.url : `${apiUrl}${post.heroImage.url}`) : "/placeholder-news.jpg"}
                            alt={post.heroImage?.alt || post.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            unoptimized
                          />
                        </div>
                        <div className="p-3 flex flex-col flex-1">
                          <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 para-txt group-hover:text-blue-600 transition-colors">
                            {post.title}
                          </h3>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
