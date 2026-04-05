import React from "react";
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

// Define the clamping style for text overflow
const clampStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
  lineHeight: "1.4",
};

// Helper function to get the image URL with proper base URL
function getImageUrl(media: any): string | null {
  if (!media) return null;
  
  // Use explicit URL if available
  let path = typeof media === 'string' ? media : media.url;
  
  // Fallback to reconstructing from prefix and filename if URL is missing
  if (!path && media.filename) {
    const prefix = media.prefix ? media.prefix : 'media';
    const cleanPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
    path = `/${cleanPrefix}${media.filename}`;
  }
  
  if (!path) return null;
  if (path.startsWith("http")) return path;
  
  // Ensure the path starts with a slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiUrl}${cleanPath}`;
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
  
  // First, check if this is a subcategory index page
  const possibleSubCategory = await fetchCategoryBySlug(postSlug);
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
  const imageUrl = post.meta?.image ? getImageUrl(post.meta.image) || undefined : undefined;
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
  const page = 1;
  const limit = 10;
  const [topLevelCategory, possibleSubCategory] = await Promise.all([
    fetchCategoryBySlug(categorySlug),
    fetchCategoryBySlug(postSlug),
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
                const imageUrl = getImageUrl(post.heroImage);
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

  const latestPosts = await fetchLatestPosts(postSlug);

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

  // Extract plain text content if layout is not available
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
                <span>
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>

            <div className="post-meta-social">
              <div className="d-flex gap al-cn social-media-icon fl-wrap-mob">
                {/* WhatsApp Share */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    post.title
                  )}%20${encodeURIComponent(
                    `https://www.dinasuvadu.com/${categorySlug}/${postSlug}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on WhatsApp"
                >
                  <span>
                    <svg
                      fill="#38AE41"
                      height="20px"
                      width="20px"
                      version="1.1"
                      id="Layer_1"
                      viewBox="0 0 308 308"
                    >
                      <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                      <g
                        id="SVGRepo_tracerCarrier"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></g>
                      <g id="SVGRepo_iconCarrier">
                        <g id="XMLID_468_">
                          <path
                            id="XMLID_469_"
                            d="M227.904,176.981c-0.6-0.288-23.054-11.345-27.044-12.781c-1.629-0.585-3.374-1.156-5.23-1.156 c-3.032,0-5.579,1.511-7.563,4.479c-2.243,3.334-9.033,11.271-11.131,13.642c-0.274,0.313-0.648,0.687-0.872,0.687 c-0.201,0-3.676-1.431-4.728-1.888c-24.087-10.463-42.37-35.624-44.877-39.867c-0.358-0.61-0.373-0.887-0.376-0.887 c0.088-0.323,0.898-1.135,1.316-1.554c1.223-1.21,2.548-2.805,3.83-4.348c0.607-0.731,1.215-1.463,1.812-2.153 c1.86-2.164,2.688-3.844,3.648-5.79l0.503-1.011c2.344-4.657,0.342-8.587-0.305-9.856c-0.531-1.062-10.012-23.944-11.02-26.348 c-2.424-5.801-5.627-8.502-10.078-8.502c-0.413,0,0,0-1.732,0.073c-2.109,0.089-13.594,1.601-18.672,4.802 c-5.385,3.395-14.495,14.217-14.495,33.249c0,17.129,10.87,33.302,15.537,39.453c0.116,0.155,0.329,0.47,0.638,0.922 c17.873,26.102,40.154,45.446,62.741,54.469c21.745,8.686,32.042,9.69,37.896,9.69c0.001,0,0.001,0,0.001,0 c2.46,0,4.429-0.193,6.166-0.364l1.102-0.105c7.512-0.666,24.02-9.22,27.775-19.655c2.958-8.219,3.738-17.199,1.77-20.458 C233.168,179.508,230.845,178.393,227.904,176.981z"
                          ></path>
                          <path
                            id="XMLID_470_"
                            d="M156.734,0C73.318,0,5.454,67.354,5.454,150.143c0,26.777,7.166,52.988,20.741,75.928L0.212,302.716 c-0.484,1.429-0.124,3.009,0.933,4.085C1.908,307.58,2.943,308,4,308c0.405,0,0.813-0.061,1.211-0.188l79.92-25.396 c21.87,11.685,46.588,17.853,71.604,17.853C240.143,300.27,308,232.923,308,150.143C308,67.354,240.143,0,156.734,0z M156.734,268.994c-23.539,0-46.338-6.797-65.936-19.657c-0.659-0.433-1.424-0.655-2.194-0.655c-0.407,0-0.815,0.062-1.212,0.188 l-40.035,12.726l12.924-38.129c0.418-1.234,0.209-2.595-0.561-3.647c-14.924-20.392-22.813-44.485-22.813-69.677 c0-65.543,53.754-118.867,119.826-118.867c66.064,0,119.812,53.324,119.812,118.867 C276.546,215.678,222.799,268.994,156.734,268.994z"
                          ></path>
                        </g>
                      </g>
                    </svg>
                  </span>
                </a>

                {/* Facebook Share */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                    `https://www.dinasuvadu.com/${categorySlug}/${postSlug}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on Facebook"
                >
                  <span>
                    <svg width="10" height="15" viewBox="0 0 10 15" fill="none">
                      <path
                        d="M6.59998 3.30001H8.09998C8.26558 3.30001 8.39998 3.16561 8.39998 3.00001V0.978906C8.39998 0.821706 8.27908 0.690906 8.12248 0.679806C7.64518 0.645906 6.71278 0.600006 6.04228 0.600006C4.19998 0.600006 2.99998 1.70401 2.99998 3.71041V5.70001H0.899976C0.734376 5.70001 0.599976 5.83441 0.599976 6.00001V8.10001C0.599976 8.26561 0.734376 8.40001 0.899976 8.40001H2.99998V14.1C2.99998 14.2656 3.13438 14.4 3.29998 14.4H5.39998C5.56558 14.4 5.69998 14.2656 5.69998 14.1V8.40001H7.86658C8.01958 8.40001 8.14798 8.28511 8.16478 8.13301L8.39818 6.03301C8.41798 5.85541 8.27878 5.70001 8.09998 5.70001H5.69998V4.20001C5.69998 3.70291 6.10288 3.30001 6.59998 3.30001Z"
                        fill="#4267B2"
                      ></path>
                    </svg>
                  </span>
                </a>

                {/* Twitter (X) Share */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    post.title
                  )}&url=${encodeURIComponent(
                    `https://www.dinasuvadu.com/${categorySlug}/${postSlug}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="twitter-logo"
                  aria-label="Share on Twitter"
                >
                  <span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <g clipPath="url(#clip0_4587_21)">
                        <path
                          d="M15.58 15.3333L9.71667 6.78534L9.72667 6.79334L15.0133 0.666672H13.2467L8.94 5.65334L5.52 0.666672H0.88667L6.36067 8.64734L6.36 8.64667L0.58667 15.3333H2.35334L7.14134 9.78534L10.9467 15.3333H15.58ZM4.82 2.00001L13.0467 14H11.6467L3.41334 2.00001H4.82Z"
                          fill="black"
                        ></path>
                      </g>
                      <defs>
                        <clipPath id="clip0_4587_21">
                          <rect width="16" height="16" fill="white"></rect>
                        </clipPath>
                      </defs>
                    </svg>
                  </span>
                </a>

                {/* LinkedIn Share */}
                <a
                  href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
                    `https://www.dinasuvadu.com/${categorySlug}/${postSlug}`
                  )}&title=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on LinkedIn"
                >
                  <span>
                    <svg
                      x="0px"
                      y="0px"
                      width="100"
                      height="100"
                      viewBox="0 0 48 48"
                    >
                      <path
                        fill="#0078d4"
                        d="M42,37c0,2.762-2.238,5-5,5H11c-2.761,0-5-2.238-5-5V11c0-2.762,2.239-5,5-5h26c2.762,0,5,2.238,5,5	V37z"
                      ></path>
                      <path
                        d="M30,37V26.901c0-1.689-0.819-2.698-2.192-2.698c-0.815,0-1.414,0.459-1.779,1.364	c-0.017,0.064-0.041,0.325-0.031,1.114L26,37h-7V18h7v1.061C27.022,18.356,28.275,18,29.738,18c4.547,0,7.261,3.093,7.261,8.274	L37,37H30z M11,37V18h3.457C12.454,18,11,16.528,11,14.499C11,12.472,12.478,11,14.514,11c2.012,0,3.445,1.431,3.486,3.479	C18,16.523,16.521,18,14.485,18H18v19H11z"
                        opacity=".05"
                      ></path>
                      <path
                        d="M30.5,36.5v-9.599c0-1.973-1.031-3.198-2.692-3.198c-1.295,0-1.935,0.912-2.243,1.677	c-0.082,0.199-0.071,0.989-0.067,1.326L25.5,36.5h-6v-18h6v1.638c0.795-0.823,2.075-1.638,4.238-1.638	c4.233,0,6.761,2.906,6.761,7.774L36.5,36.5H30.5z M11.5,36.5v-18h6v18H11.5z M14.457,17.5c-1.713,0-2.957-1.262-2.957-3.001	c0-1.738,1.268-2.999,3.014-2.999c1.724,0,2.951,1.229,2.986,2.989c0,1.749-1.268,3.011-3.015,3.011H14.457z"
                        opacity=".07"
                      ></path>
                      <path
                        fill="#fff"
                        d="M12,19h5v17h-5V19z M14.485,17h-0.028C12.965,17,12,15.888,12,14.499C12,13.08,12.995,12,14.514,12	c1.521,0,2.458,1.08,2.486,2.499C17,15.887,16.035,17,14.485,17z M36,36h-5v-9.099c0-2.198-1.225-3.698-3.192-3.698	c-1.501,0-2.313,1.012-2.707,1.99C24.957,25.543,25,26.511,25,27v9h-5V19h5v2.616C25.721,20.5,26.85,19,29.738,19	c3.578,0,6.261,2.25,6.261,7.274L36,36L36,36z"
                      ></path>
                    </svg>
                  </span>
                </a>

                {/* Google News */}
                <a
                  href="https://news.google.com/publications/CAAiEHlXIe0p4nrMZPqHkIfq8H4qFAgKIhB5VyHtKeJ6zGT6h5CH6vB-?hl=ta&gl=IN&ceid=IN%3Ata"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow on Google News"
                  className="inline-flex items-center rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                >
                  Google News
                </a>
              </div>
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
                    src={getImageUrl(post.layout[0].media)!}
                    alt={post.layout[0].media.alt || "Hero Image"}
                    width={1200}
                    height={640}
                    className="w-full h-80 object-cover"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    priority
                    unoptimized
                  />
                ) : (
                  <Image
                    src={getImageUrl(post.heroImage)!}
                    alt={post.heroImage?.alt || "Hero Image"}
                    width={1200}
                    height={640}
                    className="w-full h-80 object-cover"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    priority
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
                    {getImageUrl(block.media) && (
                      <Image
                        src={getImageUrl(block.media)!}
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

          <div className="post-svg">
            <h2 className="category-title">Follow us</h2>
            <div className="social-icons">
              <a
                className="whatsapp"
                href="https://whatsapp.com/channel/0029Va4U8pVKLaHkkCs8Xx0L"
                aria-label="Menu"
              >
                <svg
                  fill="#38AE41"
                  height="20px"
                  width="20px"
                  version="1.1"
                  id="Layer_1"
                  viewBox="0 0 308 308"
                >
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    {" "}
                    <g id="XMLID_468_">
                      {" "}
                      <path
                        id="XMLID_469_"
                        d="M227.904,176.981c-0.6-0.288-23.054-11.345-27.044-12.781c-1.629-0.585-3.374-1.156-5.23-1.156 c-3.032,0-5.579,1.511-7.563,4.479c-2.243,3.334-9.033,11.271-11.131,13.642c-0.274,0.313-0.648,0.687-0.872,0.687 c-0.201,0-3.676-1.431-4.728-1.888c-24.087-10.463-42.37-35.624-44.877-39.867c-0.358-0.61-0.373-0.887-0.376-0.887 c0.088-0.323,0.898-1.135,1.316-1.554c1.223-1.21,2.548-2.805,3.83-4.348c0.607-0.731,1.215-1.463,1.812-2.153 c1.86-2.164,2.688-3.844,3.648-5.79l0.503-1.011c2.344-4.657,0.342-8.587-0.305-9.856c-0.531-1.062-10.012-23.944-11.02-26.348 c-2.424-5.801-5.627-8.502-10.078-8.502c-0.413,0,0,0-1.732,0.073c-2.109,0.089-13.594,1.601-18.672,4.802 c-5.385,3.395-14.495,14.217-14.495,33.249c0,17.129,10.87,33.302,15.537,39.453c0.116,0.155,0.329,0.47,0.638,0.922 c17.873,26.102,40.154,45.446,62.741,54.469c21.745,8.686,32.042,9.69,37.896,9.69c0.001,0,0.001,0,0.001,0 c2.46,0,4.429-0.193,6.166-0.364l1.102-0.105c7.512-0.666,24.02-9.22,27.775-19.655c2.958-8.219,3.738-17.199,1.77-20.458 C233.168,179.508,230.845,178.393,227.904,176.981z"
                      ></path>
                      <path
                        id="XMLID_470_"
                        d="M156.734,0C73.318,0,5.454,67.354,5.454,150.143c0,26.777,7.166,52.988,20.741,75.928L0.212,302.716 c-0.484,1.429-0.124,3.009,0.933,4.085C1.908,307.58,2.943,308,4,308c0.405,0,0.813-0.061,1.211-0.188l79.92-25.396 c21.87,11.685,46.588,17.853,71.604,17.853C240.143,300.27,308,232.923,308,150.143C308,67.354,240.143,0,156.734,0z M156.734,268.994c-23.539,0-46.338-6.797-65.936-19.657c-0.659-0.433-1.424-0.655-2.194-0.655c-0.407,0-0.815,0.062-1.212,0.188 l-40.035,12.726l12.924-38.129c0.418-1.234,0.209-2.595-0.561-3.647c-14.924-20.392-22.813-44.485-22.813-69.677 c0-65.543,53.754-118.867,119.826-118.867c66.064,0,119.812,53.324,119.812,118.867 C276.546,215.678,222.799,268.994,156.734,268.994z"
                      ></path>
                    </g>{" "}
                  </g>
                </svg>
                Whatsapp
              </a>

              <a
                className="g-news"
                href="https://news.google.com/publications/CAAiEHlXIe0p4nrMZPqHkIfq8H4qFAgKIhB5VyHtKeJ6zGT6h5CH6vB-?hl=ta&gl=IN&ceid=IN%3Ata"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow on Google News"
              >
                Google News
              </a>

              <a
                className="y-tube"
                href="https://www.youtube.com/@dinasuvadumedia"
                target="_blank"
                aria-label="Menu"
                rel="noopener"
              >
                <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
                  <g clipPath="url(#clip0_4590_43)">
                    <path
                      d="M14.3 9.00625C14.1583 9.75 13.5562 10.3167 12.8125 10.4229C11.6437 10.6 9.69579 10.8125 7.49996 10.8125C5.33954 10.8125 3.39163 10.6 2.18746 10.4229C1.44371 10.3167 0.841626 9.75 0.699959 9.00625C0.558293 8.19167 0.416626 6.9875 0.416626 5.5C0.416626 4.0125 0.558293 2.80833 0.699959 1.99375C0.841626 1.25 1.44371 0.683333 2.18746 0.577083C3.35621 0.4 5.30413 0.1875 7.49996 0.1875C9.69579 0.1875 11.6083 0.4 12.8125 0.577083C13.5562 0.683333 14.1583 1.25 14.3 1.99375C14.4416 2.80833 14.6187 4.0125 14.6187 5.5C14.5833 6.9875 14.4416 8.19167 14.3 9.00625Z"
                      fill="#FF3D00"
                    ></path>
                    <path
                      d="M6.08337 7.97916V3.02083L10.3334 5.49999L6.08337 7.97916Z"
                      fill="white"
                    ></path>
                  </g>
                  <defs>
                    <clipPath id="clip0_4590_43">
                      <rect width="15" height="11" fill="white"></rect>
                    </clipPath>
                  </defs>
                </svg>
                Youtube
              </a>
              <a
                className="fb"
                href="https://m.facebook.com/dinasuvaduta?wtsid=rdr_0nhAQjg4CKxUhSz4b"
                target="_blank"
                aria-label="Visit our Facebook Page"
                rel="noopener"
              >
                <svg
                  width="10"
                  height="15"
                  viewBox="0 0 10 15"
                  fill="none"
                  role="img"
                >
                  <title>Facebook</title>
                  <path
                    d="M6.59998 3.30001H8.09998C8.26558 3.30001 8.39998 3.16561 8.39998 3.00001V0.978906C8.39998 0.821706 8.27908 0.690906 8.12248 0.679806C7.64518 0.645906 6.71278 0.600006 6.04228 0.600006C4.19998 0.600006 2.99998 1.70401 2.99998 3.71041V5.70001H0.899976C0.734376 5.70001 0.599976 5.83441 0.599976 6.00001V8.10001C0.599976 8.26561 0.734376 8.40001 0.899976 8.40001H2.99998V14.1C2.99998 14.2656 3.13438 14.4 3.29998 14.4H5.39998C5.56558 14.4 5.69998 14.2656 5.69998 14.1V8.40001H7.86658C8.01958 8.40001 8.14798 8.28511 8.16478 8.13301L8.39818 6.03301C8.41798 5.85541 8.27878 5.70001 8.09998 5.70001H5.69998V4.20001C5.69998 3.70291 6.10288 3.30001 6.59998 3.30001Z"
                    fill="#4267B2"
                  ></path>
                </svg>
                Facebook
              </a>
              <a
                className="twit"
                href="https://x.com/Dinasuvadu"
                target="_blank"
                aria-label="Follow us on X (formerly Twitter)"
                rel="noopener"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  role="img"
                >
                  <title>X (formerly Twitter)</title>
                  <g clipPath="url(#clip0_4587_21)">
                    <path
                      d="M15.58 15.3333L9.71667 6.78534L9.72667 6.79334L15.0133 0.666672H13.2467L8.94 5.65334L5.52 0.666672H0.88667L6.36067 8.64734L6.36 8.64667L0.58667 15.3333H2.35334L7.14134 9.78534L10.9467 15.3333H15.58ZM4.82 2.00001L13.0467 14H11.6467L3.41334 2.00001H4.82Z"
                      fill="black"
                    ></path>
                  </g>
                  <defs>
                    <clipPath id="clip0_4587_21">
                      <rect width="16" height="16" fill="white"></rect>
                    </clipPath>
                  </defs>
                </svg>
                Twitter
              </a>
              <a
                className="insta"
                href="https://www.instagram.com/dinasuvadunews/"
                target="_blank"
                aria-label="Follow us on Instagram"
                rel="noopener"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  role="img"
                >
                  <title>Instagram</title>
                  <g clipPath="url(#clip0_4587_17)">
                    <path
                      d="M11 0H5C3.67392 0 2.40215 0.526784 1.46447 1.46447C0.526784 2.40215 0 3.67392 0 5L0 11C0 12.3261 0.526784 13.5979 1.46447 14.5355C2.40215 15.4732 3.67392 16 5 16H11C12.3261 16 13.5979 15.4732 14.5355 14.5355C15.4732 13.5979 16 12.3261 16 11V5C16 3.67392 15.4732 2.40215 14.5355 1.46447C13.5979 0.526784 12.3261 0 11 0ZM14.5 11C14.5 12.93 12.93 14.5 11 14.5H5C3.07 14.5 1.5 12.93 1.5 11V5C1.5 3.07 3.07 1.5 5 1.5H11C12.93 1.5 14.5 3.07 14.5 5V11Z"
                      fill="url(#paint0_linear_4587_17)"
                    ></path>
                    <path
                      d="M8 4C6.93913 4 5.92172 4.42143 5.17157 5.17157C4.42143 5.92172 4 6.93913 4 8C4 9.06087 4.42143 10.0783 5.17157 10.8284C5.92172 11.5786 6.93913 12 8 12C9.06087 12 10.0783 11.5786 10.8284 10.8284C11.5786 10.0783 12 9.06087 12 8C12 6.93913 11.5786 5.92172 10.8284 5.17157C10.0783 4.42143 9.06087 4 8 4ZM8 10.5C7.3372 10.4992 6.70178 10.2356 6.23311 9.76689C5.76444 9.29822 5.50079 8.6628 5.5 8C5.5 6.621 6.622 5.5 8 5.5C9.378 5.5 10.5 6.621 10.5 8C10.5 9.378 9.378 10.5 8 10.5Z"
                      fill="url(#paint1_linear_4587_17)"
                    ></path>
                    <path
                      d="M12.3 4.23301C12.5943 4.23301 12.833 3.99438 12.833 3.70001C12.833 3.40564 12.5943 3.16701 12.3 3.16701C12.0056 3.16701 11.767 3.40564 11.767 3.70001C11.767 3.99438 12.0056 4.23301 12.3 4.23301Z"
                      fill="url(#paint2_linear_4587_17)"
                    ></path>
                  </g>
                  <defs>
                    <linearGradient
                      id="paint0_linear_4587_17"
                      x1="1.464"
                      y1="14.536"
                      x2="14.536"
                      y2="1.464"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#FFC107"></stop>
                      <stop offset="0.507" stopColor="#F44336"></stop>
                      <stop offset="0.99" stopColor="#9C27B0"></stop>
                    </linearGradient>
                    <linearGradient
                      id="paint1_linear_4587_17"
                      x1="5.172"
                      y1="10.828"
                      x2="10.828"
                      y2="5.172"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#FFC107"></stop>
                      <stop offset="0.507" stopColor="#F44336"></stop>
                      <stop offset="0.99" stopColor="#9C27B0"></stop>
                    </linearGradient>
                    <linearGradient
                      id="paint2_linear_4587_17"
                      x1="11.923"
                      y1="4.07701"
                      x2="12.677"
                      y2="3.32301"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#FFC107"></stop>
                      <stop offset="0.507" stopColor="#F44336"></stop>
                      <stop offset="0.99" stopColor="#9C27B0"></stop>
                    </linearGradient>
                    <clipPath id="clip0_4587_17">
                      <rect width="16" height="16" fill="white"></rect>
                    </clipPath>
                  </defs>
                </svg>
                Instagram
              </a>
            </div>
          </div>

          {/* Tags */}
          {(post.tags ?? []).length > 0 && (
            <div className="post-tags mt-8">
              <div className="tags flex flex-wrap gap-2">
                {(post.tags ?? []).map((tag) => (
                  <Link key={tag.id} href={`/tag/${tag.slug}`}>
                    <span className="inline-block bg-blue-100 text-blue-800 rounded-full px-4 py-1.5 text-sm font-medium hover:bg-blue-200 transition-colors">
                      {tag.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Sidebar: Latest Posts */}
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
                  let latestCategorySlug =
                    latestCategory?.slug || "uncategorized";
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
                    latestPost.heroImage || 
                    latestPost.meta?.image || 
                    latestPost.layout?.find((b: any) => b.blockType === "mediaBlock" && b.media)?.media
                  );
                  const imageAlt =
                    latestPost.heroImage?.alt ||
                    latestPost.meta?.image?.alt ||
                    latestPost.layout?.find(
                      (block) =>
                        block.blockType === "mediaBlock" && block.media?.alt
                    )?.media?.alt ||
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
                          {/* <div style={{ marginTop: "4px" }}>
                            <Space size={4}>
                              <ClockCircleOutlined
                                style={{ fontSize: "12px", color: "#8c8c8c" }}
                              />
                              <Text
                                type="secondary"
                                style={{ fontSize: "12px" }}
                              >
                                5 Min Read
                              </Text>
                            </Space>
                          </div> */}
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
      </div>
    </div>
    </>
  );
}


