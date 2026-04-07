export const revalidate = 60; // Revalidate every 60 seconds
export const dynamicParams = true; // Enable on-demand rendering
import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
// import { Space } from "antd";
// import { ClockCircleOutlined } from "@ant-design/icons";
import { notFound, redirect } from "next/navigation";
import { getPayload } from "payload";
import config from "@/payload.config";
import type { Metadata } from "next";
import { Suspense } from "react";
import { buildMetadata, buildBreadcrumbLd, buildArticleLd } from "@/lib/seo";
import {
  hasTopLevelAndPostSlugMatch,
  resolveCanonicalPostPath,
  resolvePostPathCandidates,
} from "@/lib/post-url";
import { convertLexicalToHTML } from "@payloadcms/richtext-lexical/html";
import { EmbedHydrator } from "@/components/RichText/EmbedHydrator";
import PostImageActions from "@/components/PostImageActions";

// Generate dynamic metadata for subcategory post pages
export async function generateMetadata({ params }: { params: Promise<{ categorySlug: string; postSlug: string; subPostSlug: string }> }): Promise<Metadata> {
  const { subPostSlug } = await params;
  const post = await fetchPost(subPostSlug);
  if (!post) {
    return { title: "Post not found – Dinasuvadu" };
  }
  const title = post.title;
  const description = post.meta?.description || "Read the latest article on Dinasuvadu.";
  const imageUrl = getImageUrl(post.heroImage, "og") || undefined;
  const canonicalPath = await resolveCanonicalPostPath(post, fetchParentCategory);
  const canonical = `https://www.dinasuvadu.com${canonicalPath}`;
  return buildMetadata({ title, description, imageUrl, type: "article", canonical });
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

// API base URL
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type ImageVariant = "original" | "og" | "hero" | "thumb";

const imageVariantSizes: Record<ImageVariant, string[]> = {
  original: [],
  og: ["og", "large", "xlarge", "medium"],
  hero: ["medium", "large", "og", "small", "xlarge"],
  thumb: ["thumbnail", "small", "medium"],
};

function toAbsoluteImageUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiUrl}${cleanPath}`;
}

// Helper function to get the image URL with proper base URL (Added from Home page)
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
  ["subpost-route-category-by-slug"],
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
  ["subpost-route-parent-category"],
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
      return (response.docs[0] as unknown as Post) || null;
    } catch (error) {
      console.error("Error fetching post with slug " + slug + ":", error);
      return null;
    }
  },
  ["subpost-route-post-by-slug"],
  { revalidate: 60 }
);

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
  ["subpost-route-latest-posts"],
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
      <div className="single-post-sidebar-card sticky top-20">
        <h2 className="single-post-sidebar-title">Latest Posts</h2>
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
                  className="block p-4 bg-white border border-gray-200 rounded-md hover:shadow-md hover:bg-gray-100 transition-all"
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
    <aside className="single-post-sidebar latest-posts">
      <div className="single-post-sidebar-card sticky top-20">
        <h2 className="single-post-sidebar-title">Latest Posts</h2>
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
    return convertLexicalToHTML({
      data: content as any,
      disableContainer: true,
    });
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

  // Fetch the post (subPostSlug is the actual post slug)
  const post = await fetchPost(subPostSlug);
  if (!post) {
    notFound();
  }

  const incomingPath = `/${categorySlug}/${postSlug}/${subPostSlug}`;
  const validPaths = await resolvePostPathCandidates(post, fetchParentCategory);
  const canonicalPath = await resolveCanonicalPostPath(post, fetchParentCategory);
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
    redirect(canonicalPath);
  }

  const subCategory = await fetchCategoryBySlug(postSlug);

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
                  <span className="single-post-author-name">{authorLine}</span>
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
                  <span>{readTimeMinutes} Min Read</span>
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
          {post.heroImage && (
            <>
              <figure className="mb-0">
                <div className="relative">
                  {(() => {
                    const imageUrl = getImageUrl(post.heroImage, "hero");
                    const imageAlt = post.heroImage.alt || "Hero Image";
                    return imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={imageAlt}
                        width={1200}
                        height={640}
                        className="w-full h-64 sm:h-96 object-cover rounded-lg shadow-lg"
                        sizes="(max-width: 1024px) 100vw, 66vw"
                        priority
                        fetchPriority="high"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-64 sm:h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-gray-500">No Image</span>
                      </div>
                    );
                  })()}
                  {post.heroImage.caption && (
                    <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent text-white text-sm p-4 rounded-b-lg">
                      {post.heroImage.caption}
                    </figcaption>
                  )}
                </div>
              </figure>
              <PostImageActions
                url={canonicalUrl}
                title={post.title}
                description={post.meta?.description}
              />
            </>
          )}

          {/* Post Content */}
          {(postContentHtml || postContentPlainText) && (
            <section className="mb-12">
              {postContentHtml ? (
                <>
                  {(hasTwitterEmbed || hasInstagramEmbed) && (
                    <EmbedHydrator
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
        </article>

        <Suspense fallback={<LatestPostsSidebarFallback />}>
          <LatestPostsSidebar currentPostSlug={subPostSlug} />
        </Suspense>
      </div>
    </div>
    </>
  );
}
