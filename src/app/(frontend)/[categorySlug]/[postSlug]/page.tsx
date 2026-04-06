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
import { getPayload } from "payload";
import config from "@/payload.config";
import { buildMetadata, buildBreadcrumbLd, buildArticleLd } from "@/lib/seo";
import {
  hasTopLevelAliasMatch,
  resolveCanonicalPostPath,
  resolvePostPathCandidates,
} from "@/lib/post-url";

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
  hero: ["medium", "large", "og", "small", "xlarge"],
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

// Utility function to extract plain text from richText content
function extractPlainTextFromRichText(content: Post["content"]): string {
  if (!content?.root?.children) return "";
  return content.root.children
    .map((block) => {
      if (block && block.children && Array.isArray(block.children)) {
        return block.children.map((child: any) => child?.text || "").join("");
      }
      return "";
    })
    .join("\n");
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
    <aside className="lg:col-span-1 mt-12 lg:mt-0 latest-posts">
      <div className="sticky top-20 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="category-title">Latest Posts</h2>
        {latestPosts.length > 0 ? (
          <div
            className="space-y-4"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
            }}
          >
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
              const imageAlt =
                latestPost.heroImage?.alt ||
                latestPost.meta?.image?.alt ||
                "Post Image";

              return (
                <Link
                  key={latestPost.id}
                  href={
                    latestSubCategorySlug
                      ? `/${latestCategorySlug}/${latestSubCategorySlug}/${latestPost.slug}`
                      : `/${latestCategorySlug}/${latestPost.slug}`
                  }
                  className="group block border-b border-gray-200 pb-4 last:border-b-0"
                >
                  <div className="latest-post-rt">
                    <div style={{ flex: 1 }}>
                      <div
                        className="para-txt"
                        style={{
                          ...clampStyle,
                          fontSize: "13px",
                          fontWeight: "500",
                          WebkitBoxOrient: "vertical" as const,
                        }}
                      >
                        {latestPost.title}
                      </div>
                    </div>
                    {imageUrl ? (
                      <Image
                        alt={imageAlt}
                        src={imageUrl}
                        width={120}
                        height={80}
                        sizes="120px"
                        style={{
                          objectFit: "cover",
                          borderRadius: "4px",
                          marginLeft: "12px",
                        }}
                        unoptimized
                      />
                    ) : (
                      <div>
                        <span
                          className="text-gray-500"
                          style={{ fontSize: "12px" }}
                        >
                          No Image
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-600">No recent posts available.</p>
        )}
      </div>
    </aside>
  );
}

function LatestPostsSidebarFallback() {
  return (
    <aside className="lg:col-span-1 mt-12 lg:mt-0 latest-posts">
      <div className="sticky top-20 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="category-title">Latest Posts</h2>
        <p className="text-gray-600">Loading latest posts...</p>
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

    const { posts, total } = await fetchPostsByCategory(postSlug, page, limit);
    const totalPages = Math.ceil(total / limit);
    const pageHref = (pageNumber: number): string =>
      pageNumber <= 1
        ? `/${categorySlug}/${postSlug}`
        : `/${categorySlug}/${postSlug}/p/${pageNumber}`;

    return (
      <div className="site ">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="mb-8 text-sm font-medium text-gray-500 site-main"
        >
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
            <span className="text-gray-400">{">"}</span>
            <span className="text-gray-700">{subCategoryTitle}</span>
          </div>
        </nav>

        {/* Subcategory Header */}
        <header className="mb-10 site-main">
          <h1 className="category-title">{subCategoryTitle}</h1>
        </header>

        {/* Posts Grid */}
        {posts.length > 0 ? (
          <>
            <div className="category-grid">
              {posts.map((post: Post) => {
                const imageUrl = getImageUrl(post.heroImage, "card");
                const imageAlt = post.heroImage?.alt || post.title;

                return (
                  <article key={post.id} className="post-item-category">
                    <div className="flex-1">
                      <Link href={`/${categorySlug}/${postSlug}/${post.slug}`}>
                        <h3 className="post-title-1">{post.title}</h3>
                        {post.meta?.description && (
                          <p className="post-description">
                            {post.meta.description}
                          </p>
                        )}
                      </Link>
                      <div className="post-meta-footer">
                        <div className="post-meta-left">
                          {Array.isArray(post.tags) && post.tags.length > 0 && post.tags[0] && (
                            <Link href={`/tag/${post.tags[0].slug}`} className="category-tag-link">
                              #{post.tags[0].name}
                            </Link>
                          )}
                          <span className="read-time">5 Min Read</span>
                        </div>
                        <ShareButton
                          url={`${baseUrl}/${categorySlug}/${postSlug}/${post.slug}`}
                          title={post.title}
                          description={post.meta?.description}
                        />
                      </div>
                    </div>
                    {/* Image */}
                    {imageUrl ? (
                      <Link href={`/${categorySlug}/${postSlug}/${post.slug}`}>
                        <Image
                          src={imageUrl}
                          alt={imageAlt}
                          width={280}
                          height={180}
                          sizes="(max-width: 768px) 100vw, 280px"
                          unoptimized
                        />
                      </Link>
                    ) : (
                      <div className="bg-gray-100 rounded-lg flex items-center justify-center shrink-0" style={{ width: '280px', height: '180px' }}>
                        <span className="text-gray-400 text-sm">No Image</span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2 mt-8 web-stories-pagination">
                {page > 1 && (
                  <Link
                    href={pageHref(page - 1)}
                    className="pagination-link"
                  >
                    Prev
                  </Link>
                )}

                {/* First Page */}
                <Link
                  href={pageHref(1)}
                  className={`pagination-link ${page === 1 ? "active" : ""}`}
                >
                  1
                </Link>

                {/* Ellipsis after first page if current page is greater than 2 */}
                {page > 2 && <span className="pagination-ellipsis">…</span>}

                {/* Current Page (only if it's not the first or last page) */}
                {page !== 1 && page !== totalPages && (
                  <Link
                    href={pageHref(page)}
                    className="pagination-link active"
                  >
                    {page}
                  </Link>
                )}

                {/* Ellipsis before last page if current page is less than totalPages - 1 */}
                {page < totalPages - 1 && (
                  <span className="pagination-ellipsis">…</span>
                )}

                {/* Last Page (only if totalPages > 1) */}
                {totalPages > 1 && (
                  <Link
                    href={pageHref(totalPages)}
                    className={`pagination-link ${
                      page === totalPages ? "active" : ""
                    }`}
                  >
                    {totalPages}
                  </Link>
                )}

                {page < totalPages && (
                  <Link
                    href={pageHref(page + 1)}
                    className="pagination-link"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-600 text-center">
            No posts available in this subcategory.
          </p>
        )}
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
      <div className="post-grid lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Main Article Content */}
        <article className="lg:col-span-2">
          {/* Breadcrumbs */}
          <nav
            aria-label="Breadcrumb"
            className="mb-8 text-sm font-medium text-gray-500"
          >
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

          {/* Post Title */}
          <h1 className="single-post-title">{post.title}</h1>

          {/* Meta Description Summary Box (Restored and moved after title) */}
          {post.meta?.description && (
            <p className="post-summary-box">{post.meta.description}</p>
          )}

          <div className="entry-meta">
            {/* Meta Information */}
            <div
              className="flex flex-wrap items-center text-sm text-gray-600 mb-8 gap-2"
              style={{ marginBottom: "10px" }}
            >
              {post.populatedAuthors && post.populatedAuthors.length > 0 && (
                <>
                  <span>By </span>
                  {post.populatedAuthors.map((author, i) => (
                    <span key={author.id}>
                      <Link
                        href={`/author/${author.slug}`}
                        className="text-indigo-600 hover:underline transition-colors"
                      >
                        {author.name}
                      </Link>
                      {post.populatedAuthors &&
                        i < post.populatedAuthors.length - 1 &&
                        ", "}
                    </span>
                  ))}
                </>
              )}
              {post.populatedAuthors &&
                post.populatedAuthors.length > 0 &&
                post.publishedAt && (
                  <span
                    className="text-gray-400 mx-2"
                    style={{ marginLeft: "5px" }}
                  >
                    Posted on{" "}
                  </span>
                )}
              {post.publishedAt && (
                <span className="inline-flex items-center">
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  <ShareButton
                    url={"https://www.dinasuvadu.com" + canonicalPath}
                    title={post.title}
                    description={post.meta?.description}
                  />
                </span>
              )}
            </div>
          </div>

          {/* Hero Image */}
          {(post.layout?.[0]?.blockType === "mediaBlock" &&
            post.layout[0].media?.url) ||
          (post.heroImage && post.heroImage.url) ? (
            <figure className="mb-12">
              <div className="relative rounded-lg overflow-hidden shadow-lg">
                {post.layout?.[0]?.blockType === "mediaBlock" &&
                post.layout[0].media ? (
                  <Image
                    src={getImageUrl(post.layout[0].media, "hero")!}
                    alt={post.layout[0].media.alt || "Hero Image"}
                    width={1200}
                    height={640}
                    className="w-full h-80 object-cover"
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
                    height={640}
                    className="w-full h-80 object-cover"
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
                        className="w-full max-w-2xl mx-auto h-auto object-cover rounded-md shadow-md"
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
                    dangerouslySetInnerHTML={{ __html: block.content }}
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
            <div className="post-tags mt-8">
              <div className="tags-bar">
                <span className="tags-icon" aria-hidden="true">
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2.5 9.75V3.5H8.75L21.5 16.25L15.25 22.5L2.5 9.75Z"
                      fill="currentColor"
                    />
                    <circle cx="7.1" cy="7.1" r="1.35" fill="#FFFFFF" />
                  </svg>
                </span>
                {(post.tags ?? []).map((tag) => (
                  <Link key={tag.id} href={`/tag/${tag.slug}`} className="tag-chip">
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>

        <Suspense fallback={<LatestPostsSidebarFallback />}>
          <LatestPostsSidebar currentPostSlug={postSlug} />
        </Suspense>
      </div>
    </div>
    </>
  );
}


