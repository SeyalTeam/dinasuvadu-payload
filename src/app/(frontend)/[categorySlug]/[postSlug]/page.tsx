import React, { Suspense } from "react";
export const revalidate = 60; // Revalidate every 60 seconds
export const dynamicParams = true; // Enable on-demand rendering for non-pre-rendered posts
import type { Metadata } from "next";

import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
// import { Space } from "antd";
// import { ClockCircleOutlined } from "@ant-design/icons";
import { notFound, redirect } from "next/navigation";
import ShareButton from "@/components/ShareButton";
import PostImageActions from "@/components/PostImageActions";
import PostBottomInteraction from "@/components/PostBottomInteraction";
import { getPayload } from "payload";
import config from "@/payload.config";
import { buildMetadata, buildBreadcrumbLd, buildArticleLd } from "@/lib/seo";
import {
  hasTopLevelAliasMatch,
  resolveCanonicalPostPath,
  resolvePostPathCandidates,
  resolvePostPathForContext,
} from "@/lib/post-url";
import { CategoryFeed } from "@/components/CategoryFeed";
import { 
  calculateReadingTime, 
  extractPlainTextFromRichText, 
  stripHtml, 
  estimateReadTimeMinutes 
} from "@/utilities/readingTime";

// Type definitions
type RichTextChild = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

type RichTextBlock = {
  children: RichTextChild[];
};

type LayoutBlock = {
  blockType: string;
  media?: {
    url: string;
    alt?: string;
    width?: number;
    height?: number;
    caption?: string;
  };
  content?: string;
};

type Tag = {
  id: string;
  name: string;
  slug: string;
};

type Author = {
  id: string;
  name: string;
  slug: string;
};

type Category = {
  id: string;
  title?: string;
  slug: string;
  parent?: { id: string; slug: string; title: string } | string | null;
};

type Post = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  updatedAt?: string;
  layout?: LayoutBlock[];
  hero?: {
    type: string;
    richText?: RichTextBlock[];
    links?: any[];
  };
  heroImage?: {
    url: string;
    alt?: string;
    caption?: string; // Added caption for consistency
  };
  content?: {
    root: {
      children: RichTextBlock[];
    };
  };
  meta?: {
    description?: string;
    image?: {
      url: string;
      alt?: string;
    };
  };
  categories?: Category[];
  populatedAuthors?: Author[];
  tags?: Tag[];
};

// API base URL
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

type ImageVariant = "original" | "og" | "hero" | "content" | "card" | "thumb";

const imageVariantSizes: Record<ImageVariant, string[]> = {
  original: [],
  og: ["og", "large", "xlarge", "medium"],
  hero: ["large", "og", "xlarge", "medium", "small"],
  content: ["medium", "small", "large", "xlarge"],
  card: ["small", "medium", "thumbnail", "large"],
  thumb: ["thumbnail", "small", "medium"],
};

// Define the clamping style for text overflow
const clampStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
  lineHeight: "1.4",
};

function toAbsoluteImageUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiUrl}${cleanPath}`;
}

// Helper function to get the image URL with proper base URL
function getImageUrl(media: any, variant: ImageVariant = "original"): string | null {
  if (!media) return null;

  if (typeof media !== "string" && media.sizes && variant !== "original") {
    const sizeOrder = imageVariantSizes[variant] || [];

    for (const sizeKey of sizeOrder) {
      const sizedUrl = media.sizes?.[sizeKey]?.url;
      if (sizedUrl) {
        return toAbsoluteImageUrl(sizedUrl);
      }
    }

    const sizeEntries = Object.values(
      media.sizes as Record<string, { url?: string }>
    );
    const fallbackSizedUrl = sizeEntries.find((entry) => entry?.url)?.url;
    if (fallbackSizedUrl) {
      return toAbsoluteImageUrl(fallbackSizedUrl);
    }
  }
  
  // Use explicit URL if available
  let path = typeof media === 'string' ? media : media.url;
  
  // Fallback to reconstructing from prefix and filename if URL is missing
  if (!path && media.filename) {
    const prefix = media.prefix ? media.prefix : 'media';
    const cleanPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
    path = `/${cleanPrefix}${media.filename}`;
  }
  
  if (!path) return null;
  return toAbsoluteImageUrl(path);
}

function trimTrailingEmptyHtmlBlocks(html: string): string {
  if (!html) return html;
  return html
    .replace(
      /(?:<p(?:\s[^>]*)?>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>\s*)+$/gi,
      ""
    )
    .trim();
}



function formatNewsTimestamp(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const datePart = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const timePart = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });

  return `${datePart} at ${timePart} IST`;
}

function formatTimeAgo(dateString: string): string {
  if (!dateString) return "சமீபத்தில்";
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} hr ago`; // Following user image style "9 hr ago" actually means relative.
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hr ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} day ago`;
  
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

const normalizeSlug = (slug: string): string => {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
};

// Fetch a category by slug
const fetchCategoryBySlug = unstable_cache(
  async (slug: string): Promise<Category | null> => {
    try {
      const payload = await getPayload({ config });
      const res = await payload.find({
        collection: "categories",
        where: {
          slug: {
            equals: normalizeSlug(slug),
          },
        },
        limit: 1,
        depth: 1,
      });
      return (res.docs[0] as unknown as Category) || null;
    } catch (error) {
      console.error(`Error fetching category with slug ${slug}:`, error);
      return null;
    }
  },
  ["post-route-category-by-slug"],
  { revalidate: 300 }
);

// Fetch parent category details by ID
const fetchParentCategory = unstable_cache(
  async (parentId: string): Promise<{ slug: string; title: string } | null> => {
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
  },
  ["post-route-parent-category"],
  { revalidate: 300 }
);

// Fetch a single post by slug
const fetchPost = unstable_cache(
  async (slug: string): Promise<Post | null> => {
    try {
      const payload = await getPayload({ config });
      const response = await payload.find({
        collection: "posts",
        where: {
          and: [
            {
              slug: {
                equals: normalizeSlug(slug),
              },
            },
            {
              _status: {
                equals: "published",
              },
            },
          ],
        },
        limit: 1,
        depth: 1,
      });
      return (response?.docs?.[0] as unknown as Post) || null;
    } catch (error) {
      console.error(`Error fetching post with slug ${slug}:`, error);
      return null;
    }
  },
  ["post-route-post-by-slug"],
  { revalidate: 60 }
);

/**
 * Generate SEO metadata for a post page.
 */
export async function generateMetadata({ params }: { params: Promise<{ categorySlug: string; postSlug: string }> }): Promise<Metadata> {
  const { categorySlug, postSlug } = await params;
  const looksLikeArticleSlug = /-\d+$/.test(normalizeSlug(postSlug));
  
  // First, check if this is a subcategory index page
  const possibleSubCategory = looksLikeArticleSlug
    ? null
    : await fetchCategoryBySlug(postSlug);
  if (possibleSubCategory && possibleSubCategory.parent) {
    const title = `${possibleSubCategory.title || "Category"} News – Dinasuvadu`;
    const description = `Read the latest ${possibleSubCategory.title || "category"} news and updates on Dinasuvadu.`;
    const canonical = `https://www.dinasuvadu.com/${categorySlug}/${postSlug}`;
    return buildMetadata({ 
      title, 
      description, 
      canonical 
    });
  }

  // Fallback to checking for a single post
  const post = await fetchPost(postSlug);
  if (!post) {
    return { title: "Post not found – Dinasuvadu" };
  }

  const canonicalPath = await resolveCanonicalPostPath(post, fetchParentCategory);
  const title = post.title;
  const description =
    post.meta?.description || "Read the latest article on Dinasuvadu.";
  const imageUrl = post.meta?.image
    ? getImageUrl(post.meta.image, "og") || undefined
    : undefined;
  const canonical = `https://www.dinasuvadu.com${canonicalPath}`;
  return buildMetadata({ title, description, imageUrl, type: "article", canonical });
}


// Fetch posts by category slug (using category ID) with pagination
async function fetchPostsByCategory(
  categorySlug: string,
  page: number = 1,
  limit: number = 10
): Promise<{ posts: Post[]; total: number }> {
  try {
    const payload = await getPayload({ config });
    const category = await fetchCategoryBySlug(categorySlug);
    if (!category) return { posts: [], total: 0 };

    const response = await payload.find({
      collection: "posts",
      where: {
        and: [
          {
            categories: {
              in: [category.id],
            },
          },
          {
            _status: {
              equals: "published",
            },
          },
        ],
      },
      sort: "-publishedAt",
      depth: 1,
      limit,
      page,
    });
    return {
      posts: (response.docs as unknown as Post[]) || [],
      total: response.totalDocs,
    };
  } catch (error) {
    console.error("Error fetching posts for category " + categorySlug + ":", error);
    return { posts: [], total: 0 };
  }
}

// Fetch the latest posts (excluding the current post)
const fetchLatestPosts = unstable_cache(
  async (currentPostSlug: string): Promise<Post[]> => {
    try {
      const payload = await getPayload({ config });
      const response = await payload.find({
        collection: "posts",
        limit: 5,
        sort: "-publishedAt",
        where: {
          and: [
            {
              slug: {
                not_equals: currentPostSlug,
              },
            },
            {
              _status: {
                equals: "published",
              },
            },
          ],
        },
        depth: 1,
        select: {
          id: true,
          slug: true,
          title: true,
          categories: true,
          heroImage: true,
          meta: true,
          publishedAt: true,
        },
      });
      return (response.docs as unknown as Post[]) || [];
    } catch (error) {
      console.error("Error fetching latest posts:", error);
      return [];
    }
  },
  ["post-route-latest-posts"],
  { revalidate: 60 }
);

async function LatestPostsSidebar({ currentPostSlug }: { currentPostSlug: string }) {
  const latestPosts = await fetchLatestPosts(currentPostSlug);

  const parentCategoryIds = Array.from(
    new Set(
      latestPosts
        .map((latestPost) => latestPost.categories?.[0]?.parent)
        .filter((parent): parent is string => typeof parent === "string")
    )
  );

  const parentCategoryEntries = await Promise.all(
    parentCategoryIds.map(async (parentId) => {
      const parentCategory = await fetchParentCategory(parentId);
      return [parentId, parentCategory] as const;
    })
  );

  const parentCategoriesMap: Record<
    string,
    { slug: string; title: string } | null
  > = Object.fromEntries(parentCategoryEntries);

  return (
    <aside className="single-post-sidebar latest-posts">
      <div className="sticky top-24 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white para-txt">சமீபத்திய செய்திகள்</h2>
        </div>
        
        {latestPosts.length > 0 ? (
          <div className="space-y-4">
            {latestPosts.map((latestPost) => {
              const latestCategory = latestPost.categories?.[0];
              let latestCategorySlug = latestCategory?.slug || "uncategorized";
              let latestSubCategorySlug: string | null = null;

              if (latestCategory?.parent) {
                const parent =
                  typeof latestCategory.parent === "string"
                    ? parentCategoriesMap[latestCategory.parent]
                    : latestCategory.parent;
                if (parent) {
                  latestSubCategorySlug = latestCategorySlug;
                  latestCategorySlug = parent.slug || "uncategorized";
                }
              }

              const imageUrl = getImageUrl(
                latestPost.heroImage || latestPost.meta?.image,
                "thumb"
              );
              const imageAlt = latestPost.heroImage?.alt || latestPost.title;
              const timeAgo = formatTimeAgo(latestPost.publishedAt);

              return (
                <Link
                  key={latestPost.id}
                  href={
                    latestSubCategorySlug
                      ? `/${latestCategorySlug}/${latestSubCategorySlug}/${latestPost.slug}`
                      : `/${latestCategorySlug}/${latestPost.slug}`
                  }
                  className="group flex gap-4 p-3 bg-white dark:bg-[#111] border border-gray-100 dark:border-gray-800 rounded-xl hover:shadow-lg hover:border-blue-100 dark:hover:border-blue-900/30 transition-all duration-300"
                >
                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <h3 className="text-[14px] font-bold text-gray-800 dark:text-gray-200 leading-snug line-clamp-2 transition-colors para-txt">
                      {latestPost.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                        {latestCategory?.title || 'News'}
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {timeAgo}
                      </span>
                    </div>
                  </div>
                  
                  {imageUrl ? (
                    <div className="relative w-24 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                      <Image
                        alt={imageAlt}
                        src={imageUrl}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-20 flex-shrink-0 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <span className="text-[10px] text-gray-400">No Image</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 text-center border border-dashed border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500">சமீபத்திய செய்திகள் இல்லை.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function LatestPostsSidebarFallback() {
  return (
    <aside className="single-post-sidebar latest-posts">
      <div className="sticky top-24 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 p-3 bg-white border border-gray-100 rounded-xl animate-pulse">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div className="w-24 h-20 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
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
    const category = (res as unknown as Category) || null;
    if (!category) {
      return null;
    }
    return {
      title: category.title || "Uncategorized",
    };
  } catch (err) {
    console.error(`Error fetching category with ID ${categoryId}:`, err);
    return null;
  }
}

// Generate dynamic metadata for SEO


export default async function PostOrSubCategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string; postSlug: string }>;
}) {
  const { categorySlug, postSlug } = await params;
  const looksLikeArticleSlug = /-\d+$/.test(normalizeSlug(postSlug));
  const page = 1;
  const limit = 10;

  const topLevelCategoryPromise = fetchCategoryBySlug(categorySlug);
  const possibleSubCategoryPromise = looksLikeArticleSlug
    ? Promise.resolve(null)
    : fetchCategoryBySlug(postSlug);

  const [topLevelCategory, possibleSubCategory] = await Promise.all([
    topLevelCategoryPromise,
    possibleSubCategoryPromise,
  ]);

  if (!topLevelCategory) {
    notFound();
  }

  if (topLevelCategory.parent) {
    notFound();
  }

  let topLevelCategoryTitle = topLevelCategory.title || "Uncategorized";
  if (!topLevelCategory.title) {
    const fetchedCategory = await fetchCategoryById(topLevelCategory.id);
    if (fetchedCategory) {
      topLevelCategoryTitle = fetchedCategory.title;
    }
  }

  if (possibleSubCategory && possibleSubCategory.parent) {
    const parentCategory =
      typeof possibleSubCategory.parent === "string"
        ? await fetchParentCategory(possibleSubCategory.parent)
        : possibleSubCategory.parent;
    if (!parentCategory || parentCategory.slug !== categorySlug) {
      notFound();
    }

    let subCategoryTitle = possibleSubCategory.title || "Uncategorized";
    if (!possibleSubCategory.title) {
      const fetchedCategory = await fetchCategoryById(possibleSubCategory.id);
      if (fetchedCategory) {
        subCategoryTitle = fetchedCategory.title;
      }
    }

    const { posts: rawPosts, total } = await fetchPostsByCategory(postSlug, page, limit);

    // Resolve posts with full paths for the client component
    const posts = await Promise.all(
      rawPosts.map(async (p) => {
        const postLink = await resolvePostPathForContext(
          p,
          { topLevelSlug: categorySlug },
          fetchParentCategory
        );
        return { ...p, postLink };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return (
      <div className="site ">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="mb-2 text-sm font-medium text-gray-500 site"
        >
          <div className="flex items-center space-x-2 breadcrumbs pl-[16px]">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              Home
            </Link>
            <span className="text-gray-400">{">"}</span>
            <Link
              href={`/${categorySlug}`}
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              {topLevelCategoryTitle}
            </Link>
            <span className="text-gray-400">{">"}</span>
            <span className="text-gray-700">{subCategoryTitle}</span>
          </div>
        </nav>

        <div className="site-main">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
            <div className="lg:col-span-7">
              {/* Posts Grid */}
              {posts.length > 0 ? (
                <div className="bg-white dark:bg-[#23272e] pt-4 px-4 md:px-8 pb-6 md:pb-8 md:rounded-2xl md:shadow-md md:border border-gray-100 dark:border-gray-800">
                  {/* Category Header Bar - Now merged inside the main card */}
                  <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white para-txt">
                      {subCategoryTitle}
                    </h1>
                  </div>

                  <CategoryFeed 
                    initialPosts={posts}
                    categoryId={possibleSubCategory.id}
                    categorySlug={categorySlug}
                    apiUrl={apiUrl}
                    initialOffset={10}
                  />
                </div>
              ) : (
                <div className="bg-white dark:bg-[#111] p-20 rounded-2xl shadow-md border border-gray-100 dark:border-gray-800 text-center">
                  <p className="text-gray-600">
                    No posts available in this subcategory.
                  </p>
                </div>
              )}
            </div>
            {/* Empty Right Column (3/10th width = 30%) */}
            <div className="hidden lg:block lg:col-span-3" />
          </div>
        </div>
      </div>
    );
  }

  const post = await fetchPost(postSlug);
  if (!post) {
    notFound();
  }

  const incomingPath = `/${categorySlug}/${postSlug}`;
  const validPaths = await resolvePostPathCandidates(post, fetchParentCategory);
  const canonicalPath = await resolveCanonicalPostPath(post, fetchParentCategory);
  const isExactPathMatch = validPaths.includes(incomingPath);
  const isLegacyTopLevelAlias = hasTopLevelAliasMatch(
    validPaths,
    categorySlug,
    postSlug
  );

  if (!isExactPathMatch && !isLegacyTopLevelAlias) {
    notFound();
  }

  // Legacy two-segment links like /news/{post} should canonicalize to /news/{sub}/{post} when needed.
  if (isLegacyTopLevelAlias && canonicalPath !== incomingPath) {
    redirect(canonicalPath);
  }

  const postContent = post.content
    ? extractPlainTextFromRichText(post.content)
    : "";
  const layoutContentText = (post.layout ?? [])
    .map((block: any) => {
      if (block.blockType === "content" && block.content) {
        return stripHtml(block.content);
      }
      return "";
    })
    .join(" ");
  const fullContentText = `${post.title || ""} ${postContent} ${layoutContentText} ${post.meta?.description || ""}`;
  const wordsCount = fullContentText.trim().split(/\s+/).filter(Boolean).length;
  const readTimeMinutes = estimateReadTimeMinutes(fullContentText);
  const publishedLabel = formatNewsTimestamp(post.publishedAt);
  const updatedLabel = formatNewsTimestamp(post.updatedAt || post.publishedAt);
  const showUpdated = Boolean(updatedLabel);
  const canonicalUrl = `https://www.dinasuvadu.com${canonicalPath}`;
  const authorLine =
    (post.populatedAuthors ?? [])
      .map((author) => author?.name)
      .filter(Boolean)
      .join(", ") || "Dinasuvadu Team";

  return (
    <>

        {/* Breadcrumb JSON‑LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: buildBreadcrumbLd([
              { name: "Home", url: "https://www.dinasuvadu.com/" },
              { name: topLevelCategoryTitle, url: `https://www.dinasuvadu.com/${categorySlug}` },
              { name: post.title, url: `https://www.dinasuvadu.com/${categorySlug}/${postSlug}` },
            ]),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: buildArticleLd({ post, categorySlug, postSlug, apiUrl }) }}
        />

      <div className="site site-main">
      <div className="single-post-layout">
        {/* Main Article Content */}
        <article className="single-post-main">
          <header className="single-post-header-card">
            <nav aria-label="Breadcrumb" className="single-post-breadcrumbs">
              <div className="flex items-center space-x-2 breadcrumbs">
                <Link
                  href="/"
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Home
                </Link>
                <span className="text-gray-400">{">"}</span>
                <Link
                  href={`/${categorySlug}`}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {topLevelCategoryTitle}
                </Link>
              </div>
            </nav>

            <h1 className="single-post-title single-post-title--hero">{post.title}</h1>

            {post.meta?.description && (
              <p className="single-post-subtitle">{post.meta.description}</p>
            )}

            <div className="single-post-meta">
              <div className="single-post-meta-top">
                <p className="single-post-author">
                  <span className="single-post-author-prefix">By</span>
                  <span className="single-post-author-name">
                    {post.populatedAuthors && post.populatedAuthors.length > 0 ? (
                      post.populatedAuthors.map((author: any, index: number) => (
                        <React.Fragment key={author.id}>
                          <Link 
                            href={`/author/${author.slug || author.id}`} 
                            className="text-gray-900 dark:text-gray-100 font-bold transition-all"
                          >
                            {author.name}
                          </Link>
                          {index < (post.populatedAuthors?.length || 0) - 1 && ", "}
                        </React.Fragment>
                      ))
                    ) : (
                      <span className="font-bold text-gray-900">Dinasuvadu Team</span>
                    )}
                  </span>
                  <span
                    className="single-post-verified"
                    aria-label="Verified"
                    title="Verified"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <circle cx="8" cy="8" r="8" fill="#2AA9FF" />
                      <path
                        d="M4.3 8.1L6.5 10.1L11.8 5.4"
                        stroke="#FFFFFF"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </p>
                <div className="single-post-readtime">
                  <span className="single-post-clock" aria-hidden="true">
                    ◷
                  </span>
                  <span>{wordsCount} Words | {readTimeMinutes} Min Read</span>
                </div>
              </div>
              <div className="single-post-meta-bottom">
                {publishedLabel && <span>Published - {publishedLabel}</span>}
                {showUpdated && updatedLabel && (
                  <span className="single-post-updated">Updated - {updatedLabel}</span>
                )}
              </div>
            </div>
          </header>

          {/* Hero Image */}
          {(post.layout?.[0]?.blockType === "mediaBlock" &&
            post.layout[0].media?.url) ||
          (post.heroImage && post.heroImage.url) ? (
            <>
              <figure className="mb-0">
                <div className="relative md:rounded-lg overflow-hidden md:shadow-lg">
                  {post.layout?.[0]?.blockType === "mediaBlock" &&
                  post.layout[0].media ? (
                    <Image
                      src={getImageUrl(post.layout[0].media, "hero")!}
                      alt={post.layout[0].media.alt || "Hero Image"}
                      width={1200}
                      height={675}
                      className="w-full aspect-video object-cover"
                      sizes="(max-width: 1024px) 100vw, 66vw"
                      priority
                      fetchPriority="high"
                      unoptimized
                    />
                  ) : (
                    <Image
                      src={getImageUrl(post.heroImage, "hero")!}
                      alt={post.heroImage?.alt || "Hero Image"}
                      width={1200}
                      height={675}
                      className="w-full aspect-video object-cover"
                      sizes="(max-width: 1024px) 100vw, 66vw"
                      priority
                      fetchPriority="high"
                      unoptimized
                    />
                  )}
                  {(post.layout?.[0]?.media?.caption ||
                    post.heroImage?.caption) && (
                    <figcaption className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-sm p-4">
                      {post.layout?.[0]?.media?.caption ||
                        post.heroImage?.caption}
                    </figcaption>
                  )}
                </div>
              </figure>
              <PostImageActions
                url={canonicalUrl}
                title={post.title}
                postSlug={postSlug}
                description={post.meta?.description}
              />
            </>
          ) : null}

          {/* Hero Rich Text */}
          {Array.isArray(post.hero?.richText) &&
            post.hero.richText.length > 0 && (
              <section className="prose prose-lg prose-blue max-w-none mb-12 text-gray-800">
                {post.hero!.richText!.map((block, index) => (
                  <p key={index} className="leading-relaxed">
                    {block.children.map((child, i) => (
                      <span
                        key={i}
                        className={`${child.bold ? "font-semibold" : ""} ${
                          child.italic ? "italic" : ""
                        }`}
                      >
                        {child.text}
                      </span>
                    ))}
                  </p>
                ))}
              </section>
            )}

          {/* Post Content */}
          {post.layout && post.layout.slice(1).length > 0 ? (
            post.layout.slice(1).map((block, index) => (
              <section key={index} className="mb-12">
                {block.blockType === "mediaBlock" && block.media && (
                  <figure className="my-8">
                    {getImageUrl(block.media, "content") && (
                      <Image
                        src={getImageUrl(block.media, "content")!}
                        alt={block.media.alt || "Media"}
                        width={1200}
                        height={675}
                        className="w-full max-w-2xl mx-auto h-auto object-cover md:rounded-md md:shadow-md"
                        sizes="(max-width: 1024px) 100vw, 768px"
                        unoptimized
                      />
                    )}
                    {block.media.caption && (
                      <figcaption className="text-sm text-gray-600 mt-3 text-center">
                        {block.media.caption}
                      </figcaption>
                    )}
                  </figure>
                )}

                {block.blockType === "content" && block.content && (
                  <div
                    className="prose prose-lg prose-blue max-w-none text-gray-800 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: trimTrailingEmptyHtmlBlocks(block.content),
                    }}
                  />
                )}
              </section>
            ))
          ) : postContent ? (
            <section className="mb-12">
              <div className="prose prose-lg prose-blue max-w-none text-gray-800 leading-relaxed">
                {postContent.split("\n").map((paragraph, index) => {
                   if (!paragraph.trim()) return null;
                   
                    // Skip any of the first few paragraphs if they are already in the summary box
                    if (index < 5 && post.meta?.description) {
                      // Normalize by stripping ALL whitespace and punctuation for a 'fingerprint' match
                      const fingerprint = (str: string) => str.replace(/[^a-zA-Z0-9\u0B80-\u0BFF]/g, '');
                      const fPara = fingerprint(paragraph);
                      const fSummary = fingerprint(post.meta.description);
                      
                      // If either includes a substantial part of the other (fingerprint based)
                      if (fPara.length > 20 && (fSummary.includes(fPara.substring(0, 40)) || fPara.includes(fSummary.substring(0, 40)))) {
                        return null;
                      }
                    }
                   
                   return (
                     <p className="post-desc" key={index}>
                       {paragraph}
                     </p>
                   );
                 })}
              </div>
            </section>
          ) : null}

          {/* Tags */}
          {(post.tags ?? []).length > 0 && (
            <div className="post-tags mt-4">
              <div className="tags-bar">
                {(post.tags ?? []).map((tag) => (
                  <Link key={tag.id} href={`/tag/${tag.slug}`} className="tag-chip">
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <PostBottomInteraction
            url={canonicalUrl}
            title={post.title}
            postSlug={postSlug}
            description={post.meta?.description}
          />
        </article>

        <Suspense fallback={<LatestPostsSidebarFallback />}>
          <LatestPostsSidebar currentPostSlug={postSlug} />
        </Suspense>
      </div>
    </div>
    </>
  );
}


