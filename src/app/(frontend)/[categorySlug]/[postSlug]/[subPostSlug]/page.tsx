export const revalidate = 300; // Revalidate every 5 minutes (ISR cache for TTFB)
export const dynamicParams = true; // Enable on-demand rendering
import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
// import { Space } from "antd";
// import { ClockCircleOutlined } from "@ant-design/icons";
import { notFound, redirect, permanentRedirect } from "next/navigation";
import { getPayload } from "payload";
import config from "@/payload.config";
import type { Metadata } from "next";
import React, { Suspense } from "react";
import { buildMetadata, buildBreadcrumbLd, buildArticleLd } from "@/lib/seo";
import {
  hasTopLevelAndPostSlugMatch,
  resolveCanonicalPostPath,
  resolvePostPathCandidates,
} from "@/lib/post-url";
import { convertLexicalToHTML } from "@payloadcms/richtext-lexical/html";
import { EmbedHydrator } from "@/components/RichText/EmbedHydrator";
import { ArticleFontScaleScript } from "@/components/ArticleFontScaleScript";
import PostImageActions from "@/components/PostImageActions";
import PostBottomInteraction from "@/components/PostBottomInteraction";
import { PostHeroImage } from "@/components/PostHeroImage";
import {
  getImageUrl,
  resolvePostHeroSources,
  resolvePostOgImageUrl,
} from "@/lib/post-images";

function resolvePostDescription(post: Pick<Post, "title" | "meta">): string {
  const metaDescription = post.meta?.description?.trim();
  if (metaDescription && metaDescription.length > 50) return metaDescription;
  
  // Create a richer fallback description if the meta description is missing or too short
  const fallback = `${post.title} - Get the latest Tamil news updates, breaking news, in-depth analysis, and exclusive reports on cinema, and sports from Tamil Nadu and across the globe on Dinasuvadu.`;
  return fallback.slice(0, 160);
}

// Generate dynamic metadata for subcategory post pages
export async function generateMetadata({ params }: { params: Promise<{ categorySlug: string; postSlug: string; subPostSlug: string }> }): Promise<Metadata> {
  const { subPostSlug } = await params;
  const post = await fetchPost(subPostSlug);
  if (!post) {
    return buildMetadata({
      title: "Post not found – Dinasuvadu",
      description: "Dinasuvadu - Tamil news portal. The requested post could not be found.",
    });
  }
  const title = post.title;
  const description = resolvePostDescription(post);
  const imageUrl = resolvePostOgImageUrl(post) || undefined;
  const canonicalPath = await resolveCanonicalPostPath(post, fetchParentCategory);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dinasuvadu.com';
  const canonical = `${baseUrl}${canonicalPath}`;
  const amphtml = post.isAMP ? `${baseUrl}/amp${canonicalPath}` : undefined;
  return buildMetadata({ title, description, imageUrl, type: "article", canonical, amphtml });
}

// Type definitions
type RichTextChild = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

type RichTextBlock = {
  children: RichTextChild[];
};

type Media = {
  url?: string;
  filename?: string;
  prefix?: string;
  sizes?: Record<string, { url?: string }>;
  alt?: string;
  width?: number;
  height?: number;
  caption?: string;
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
  isAMP?: boolean;
  heroImage?: Media;
  content?: {
    root: {
      children: RichTextBlock[];
    };
  };
  meta?: {
    description?: string;
    image?: Media;
  };
  categories?: Category[];
  populatedAuthors?: Author[];
  tags?: Tag[];
};

function trimTrailingEmptyHtmlBlocks(html: string): string {
  if (!html) return html;
  return html
    .replace(
      /(?:<p(?:\s[^>]*)?>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>\s*)+$/gi,
      ""
    )
    .trim();
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function estimateReadTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (!words) return 1;
  return Math.max(1, Math.ceil(words / 220));
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
  if (diffInMinutes < 60) return `${diffInMinutes} hr ago`; 
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hr ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} day ago`;
  
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

// API base URL
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const normalizeSlug = (slug: string): string => {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
};

// Fetch a category by slug
async function fetchCategoryBySlugRaw(slug: string): Promise<Category | null> {
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
}

const fetchCategoryBySlug = (slug: string) => unstable_cache(
  async () => fetchCategoryBySlugRaw(slug),
  ["subpost-route-category-by-slug", slug],
  { revalidate: 300 }
)();

// Fetch parent category details by ID
async function fetchParentCategoryRaw(parentId: string): Promise<{ slug: string; title: string } | null> {
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

const fetchParentCategory = (parentId: string) => unstable_cache(
  async () => fetchParentCategoryRaw(parentId),
  ["subpost-route-parent-category", parentId],
  { revalidate: 300 }
)();

// Fetch a single post by slug
async function fetchPostRaw(slug: string): Promise<Post | null> {
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
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        layout: true,
        heroImage: true,
        meta: true,
        categories: true,
        authors: true,
        populatedAuthors: true,
        publishedAt: true,
        updatedAt: true,
        tags: true,
        isAMP: true,
      },
    });
    return (response.docs[0] as unknown as Post) || null;
  } catch (error) {
    console.error("Error fetching post with slug " + slug + ":", error);
    return null;
  }
}

const fetchPost = (slug: string) => unstable_cache(
  async () => fetchPostRaw(slug),
  ["subpost-route-post-by-slug", slug],
  { revalidate: 300 }
)();

async function resolvePostPathsForPage(post: Post) {
  return unstable_cache(
    async () => {
      const [validPaths, canonicalPath] = await Promise.all([
        resolvePostPathCandidates(post, fetchParentCategory),
        resolveCanonicalPostPath(post, fetchParentCategory),
      ]);
      return { validPaths, canonicalPath };
    },
    ["subpost-route-paths", String(post.id)],
    { revalidate: 300 }
  )();
}

// Fetch the latest posts (excluding the current post)
async function fetchLatestPostsRaw(currentPostSlug: string): Promise<Post[]> {
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
}

const fetchLatestPosts = (currentPostSlug: string) => unstable_cache(
  async () => fetchLatestPostsRaw(currentPostSlug),
  ["subpost-route-latest-posts", currentPostSlug],
  { revalidate: 300 }
)();

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
                  className="group flex gap-4 p-3 bg-white dark:bg-card border border-gray-100 dark:border-border rounded-xl hover:shadow-lg hover:border-blue-100 dark:hover:border-blue-900/30 transition-all duration-300"
                >
                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <h3 className="text-[14px] font-bold text-gray-800 dark:text-gray-200 leading-snug line-clamp-2 transition-colors para-txt">
                      {latestPost.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-200 px-2 py-0.5 rounded">
                        {latestCategory?.title || 'News'}
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-400 flex items-center gap-1">
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
    return {
      title: (res as any)?.title || "Uncategorized",
    };
  } catch (err) {
    console.error(`Error fetching category with ID ${categoryId}:`, err);
    return null;
  }
}

// Define the clamping style for text overflow
const clampStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
  lineHeight: "1.4",
};

// Utility function to extract plain text from richText content
function extractPlainTextFromRichText(content: any): string {
  if (!content?.root?.children) return "";
  return content.root.children
    .map((block: any) => {
      if (!block.children) return "";
      return block.children.map((child: any) => child.text || "").join("");
    })
    .join("\n");
}

function convertRichTextToHTML(content: Post["content"]): string {
  if (!content) return "";

  try {
    const html = convertLexicalToHTML({
      data: content as any,
      disableContainer: true,
      converters: ({ defaultConverters }) => ({
        ...defaultConverters,
        blocks: {
          embed: ({ node }: { node: any }) => {
            return `<div class="col-start-2 my-8 w-full flex justify-center overflow-hidden">${node.fields.url}</div>`;
          }
        }
      })
    });
    const strippedHtml = html ? html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") : "";
    return strippedHtml ? strippedHtml.replace(/<\/picture\$>/g, '</picture>').replace(/<\/a\$>/g, '</a>') : "";
  } catch (error) {
    console.error("Error converting rich text content to HTML:", error);
    return "";
  }
}

export default async function SubCategoryPostPage({
  params,
}: {
  params: Promise<{
    categorySlug: string;
    postSlug: string;
    subPostSlug: string;
  }>;
}) {
  const { categorySlug, postSlug, subPostSlug } = await params;

  const [post, subCategory] = await Promise.all([
    fetchPost(subPostSlug),
    fetchCategoryBySlug(postSlug),
  ]);
  if (!post) {
    notFound();
  }

  const incomingPath = `/${categorySlug}/${postSlug}/${subPostSlug}`;
  const { validPaths, canonicalPath } = await resolvePostPathsForPage(post);
  const isExactPathMatch = validPaths.includes(incomingPath);
  const isTopLevelPostSlugMatch = hasTopLevelAndPostSlugMatch(
    validPaths,
    categorySlug,
    subPostSlug
  );

  if (!isExactPathMatch && !isTopLevelPostSlugMatch) {
    notFound();
  }

  // Canonicalize non-exact but valid paths for migrated / legacy links.
  if (!isExactPathMatch && canonicalPath !== incomingPath) {
    permanentRedirect(canonicalPath);
  }

  // Fetch subcategory info for breadcrumbs/heading (soft fallback, no hard 404 here).
  const resolvedParentCategory =
    subCategory?.parent
      ? typeof subCategory.parent === "string"
        ? await fetchParentCategory(subCategory.parent)
        : subCategory.parent
      : null;

  const parentCategory = {
    slug: resolvedParentCategory?.slug || categorySlug,
    title: resolvedParentCategory?.title || categorySlug,
  };

  let subCategoryTitle = subCategory?.title || postSlug;
  if (subCategory && !subCategory.title) {
    const fetchedCategory = await fetchCategoryById(subCategory.id);
    if (fetchedCategory) {
      subCategoryTitle = fetchedCategory.title;
    }
  }

  const postContentHtml = trimTrailingEmptyHtmlBlocks(
    convertRichTextToHTML(post.content)
  );
  const postContentPlainText = postContentHtml
    ? ""
    : extractPlainTextFromRichText(post.content);
  const readTimeMinutes = estimateReadTimeMinutes(
    `${stripHtml(postContentHtml)} ${postContentPlainText} ${
      post.meta?.description || ""
    }`
  );
  const publishedLabel = formatNewsTimestamp(post.publishedAt);
  const updatedLabel = formatNewsTimestamp(post.updatedAt);
  const showUpdated = Boolean(updatedLabel && updatedLabel !== publishedLabel);
  const canonicalUrl = `https://www.dinasuvadu.com${canonicalPath}`;
  const heroSources = resolvePostHeroSources(post);
  const authorLine =
    (post.populatedAuthors ?? [])
      .map((author) => author?.name)
      .filter(Boolean)
      .join(", ") || "Dinasuvadu Team";
  const hasTwitterEmbed = /(twitter\.com|x\.com|platform\.twitter\.com)/i.test(
    postContentHtml
  );
  const hasInstagramEmbed = /instagram\.com/i.test(postContentHtml);

  // Render the page
  return (
    <>
      {/* Breadcrumb JSON‑LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: buildBreadcrumbLd([
            { name: "Home", url: "https://www.dinasuvadu.com/" },
            { name: parentCategory.title, url: `https://www.dinasuvadu.com/${categorySlug}` },
            { name: subCategoryTitle, url: `https://www.dinasuvadu.com/${categorySlug}/${postSlug}` },
            { name: post.title, url: `https://www.dinasuvadu.com/${categorySlug}/${postSlug}/${subPostSlug}` },
          ]),
        }}
      />
      {/* Article JSON‑LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ 
          __html: buildArticleLd({ post, categorySlug, postSlug, subPostSlug, apiUrl }) 
        }}
      />
    <div className="site site-main">
      <div className="single-post-layout">
        {/* Main Article Content */}
        <article className="single-post-main">
          <ArticleFontScaleScript />

          <header className="single-post-header-card">
            <nav aria-label="Breadcrumb" className="single-post-breadcrumbs">
              <div className="flex items-center space-x-2 breadcrumbs">
                <Link
                  href="/"
                  className="text-indigo-600 hover:underline transition-colors"
                >
                  Home
                </Link>

                <span className="text-gray-400">{">"}</span>

                <Link
                  href={`/${categorySlug}`}
                  className="text-indigo-600 hover:underline transition-colors"
                >
                  {parentCategory.title}
                </Link>

                <span className="text-gray-400">{">"}</span>

                <Link
                  href={`/${categorySlug}/${postSlug}`}
                  className="text-indigo-600 hover:underline transition-colors"
                >
                  {subCategoryTitle}
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
                            className="font-bold transition-all"
                          >
                            {author.name}
                          </Link>
                          {index < (post.populatedAuthors?.length || 0) - 1 && ", "}
                        </React.Fragment>
                      ))
                    ) : (
                      <span className="font-bold">Dinasuvadu Team</span>
                    )}
                  </span>
                  <span
                    className="single-post-verified"
                    title="Verified"
                    aria-hidden="true"
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
                  <span className="sr-only">Verified account</span>
                </p>
                <div className="single-post-readtime">
                  <span className="single-post-clock" aria-hidden="true">
                    ◷
                  </span>
                  <span>{readTimeMinutes} Min Read</span>
                </div>
              </div>
              <div className="single-post-meta-bottom">
                {publishedLabel && <span>Published - {publishedLabel}</span>}
              </div>
            </div>
          </header>

          {heroSources ? (
            <div className="single-post-hero-wrap">
              <figure className="mb-0">
                <div className="single-post-hero-media md:rounded-lg md:shadow-lg">
                  <PostHeroImage
                    sources={heroSources}
                    alt={post.heroImage?.alt || "Hero Image"}
                  />
                  {post.heroImage?.caption && (
                    <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent text-white text-sm p-4 rounded-b-lg">
                      {post.heroImage.caption}
                    </figcaption>
                  )}
                </div>
              </figure>
              <PostImageActions
                url={canonicalUrl}
                title={post.title}
                postSlug={subPostSlug}
                description={post.meta?.description}
              />
            </div>
          ) : null}

          <div className="single-post-body">
          {/* Post Content */}
          {(postContentHtml || postContentPlainText) && (
            <section className="mb-12">
              {postContentHtml ? (
                <>
                  {(hasTwitterEmbed || hasInstagramEmbed) && (
                    <EmbedHydrator
                      key={post.id}
                      enableTwitter={hasTwitterEmbed}
                      enableInstagram={hasInstagramEmbed}
                    />
                  )}
                  <div
                    className="payload-richtext prose md:prose-md max-w-none"
                    dangerouslySetInnerHTML={{ __html: postContentHtml }}
                  />
                </>
              ) : (
                <div className="prose prose-lg prose-blue max-w-none text-gray-800 leading-relaxed">
                  {postContentPlainText
                    .split("\n")
                    .map((paragraph, index) =>
                      paragraph.trim() ? (
                        <p key={index} className="post-desc">
                          {paragraph}
                        </p>
                      ) : null
                    )}
                </div>
              )}
            </section>
          )}

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
            postSlug={subPostSlug}
            description={post.meta?.description}
          />
          </div>
        </article>

        <Suspense fallback={<LatestPostsSidebarFallback />}>
          <LatestPostsSidebar currentPostSlug={subPostSlug} />
        </Suspense>
      </div>
    </div>
    </>
  );
}
