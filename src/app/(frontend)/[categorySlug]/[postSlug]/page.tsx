export const revalidate = 60; // Revalidate every 60 seconds
export const dynamicParams = true; // Enable on-demand rendering for non-pre-rendered posts
import type { Metadata } from "next";
import axios from "axios";
import Link from "next/link";
// import { Space } from "antd";
// import { ClockCircleOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import "antd/dist/reset.css"; // Import Ant Design CSS
import { notFound } from "next/navigation";
import ShareButton from "@/components/ShareButton";
import { getPayload } from "payload";
import config from "@/payload.config";

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

// Fetch parent category details by ID
// Fetch parent category details by ID
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

// Fetch a single post by slug
async function fetchPost(slug: string): Promise<Post | null> {
  try {
    const payload = await getPayload({ config });
    const decoded = decodeURIComponent(slug);
    const encoded = encodeURIComponent(decoded);
    const response = await payload.find({
      collection: "posts",
      where: {
        or: [
          { slug: { equals: slug } },
          { slug: { equals: decoded } },
          { slug: { equals: encoded } },
          { slug: { equals: encoded.toLowerCase() } },
          { slug: { equals: encoded.toUpperCase() } },
        ],
      },
      depth: 3,
    });
    return (response.docs[0] as unknown as Post) || null;
  } catch (error) {
    console.error("Error fetching post with slug " + slug + ":", error);
    return null;
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
    const decoded = decodeURIComponent(categorySlug);
    const encoded = encodeURIComponent(decoded);
    const categoryRes = await payload.find({
      collection: "categories",
      where: {
        or: [
          { slug: { equals: categorySlug } },
          { slug: { equals: decoded } },
          { slug: { equals: encoded } },
          { slug: { equals: encoded.toLowerCase() } },
          { slug: { equals: encoded.toUpperCase() } },
        ],
      },
      depth: 0,
    });
    const category = categoryRes.docs[0] || null;
    if (!category) return { posts: [], total: 0 };

    const response = await payload.find({
      collection: "posts",
      where: {
        categories: {
          in: [category.id],
        },
      },
      sort: "-publishedAt",
      depth: 2,
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
async function fetchLatestPosts(currentPostSlug: string): Promise<Post[]> {
  try {
    const payload = await getPayload({ config });
    const response = await payload.find({
      collection: "posts",
      limit: 5,
      sort: "-publishedAt",
      where: {
        slug: {
          not_equals: currentPostSlug,
        },
      },
      depth: 2,
    });
    return (response.docs as unknown as Post[]) || [];
  } catch (error) {
    console.error("Error fetching latest posts:", error);
    return [];
  }
}

// Fetch category details by ID
async function fetchCategoryById(
  categoryId: string
): Promise<{ title: string } | null> {
  try {
    console.log(`Fetching category with ID: ${categoryId}`);
    const res = await axios.get(
      `${apiUrl}/api/categories/${categoryId}?depth=1`
    );
    const category = res.data || null;
    if (!category) {
      console.log(`No category found for ID: ${categoryId}`);
      return null;
    }
    console.log(`Fetched category by ID:`, JSON.stringify(category, null, 2));
    return {
      title: category.title || "Uncategorized",
    };
  } catch (err) {
    console.error(
      `Error fetching category with ID ${categoryId}:`,
      (err as any)?.response?.data || (err as any)?.message
    );
    return null;
  }
}

// Generate dynamic metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; postSlug: string }>;
}): Promise<Metadata> {
  const { categorySlug, postSlug } = await params;

  // Try finding post first
  const post = await fetchPost(postSlug);
  if (post) {
    const title = post.title;
    const description = post.meta?.description || extractPlainTextFromRichText(post.content).slice(0, 160);
    const imageUrl = getImageUrl(post.heroImage);

    return {
      title: `${title} | Dinasuvadu`,
      description: description,
      openGraph: {
        title: title,
        description: description,
        images: imageUrl ? [{ url: imageUrl }] : [],
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title: title,
        description: description,
        images: imageUrl ? [imageUrl] : [],
      },
    };
  }

  // If not post, check if it's a category
  const category = await fetchCategoryBySlug(postSlug);
  if (category) {
    const title = `${category.title || "Category"} News`;
    const description = `Read the latest ${category.title || "category"} news and updates on Dinasuvadu.`;
    return {
      title: `${title} | Dinasuvadu`,
      description: description,
    };
  }

  return {
    title: "Dinasuvadu - Latest Tamil News",
  };
}

export default async function PostOrSubCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string; postSlug: string }>;
  searchParams: Promise<{ page?: string }>; // Updated type to Promise
}) {
  console.log(
    "Entering PostOrSubCategoryPage component for [categorySlug]/[postSlug]"
  );

  const { categorySlug, postSlug } = await params;
  const query = await searchParams; // Await the Promise to get the resolved value
  const page = parseInt(query.page || "1", 10); // Access the resolved value
  const limit = 10;
  console.log(`Handling route: /${categorySlug}/${postSlug}?page=${page}`);

  // Rest of your component code remains unchanged
  const topLevelCategory = await fetchCategoryBySlug(categorySlug);
  if (!topLevelCategory) {
    console.log(`Top-level category ${categorySlug} not found`);
    notFound();
  }

  if (topLevelCategory.parent) {
    console.log(
      `Category ${categorySlug} has a parent, this route is for top-level categories only.`
    );
    notFound();
  }

  let topLevelCategoryTitle = topLevelCategory.title || "Uncategorized";
  if (!topLevelCategory.title) {
    const fetchedCategory = await fetchCategoryById(topLevelCategory.id);
    if (fetchedCategory) {
      topLevelCategoryTitle = fetchedCategory.title;
    }
  }

  const possibleSubCategory = await fetchCategoryBySlug(postSlug);
  if (possibleSubCategory && possibleSubCategory.parent) {
    const parentCategory =
      typeof possibleSubCategory.parent === "string"
        ? await fetchParentCategory(possibleSubCategory.parent)
        : possibleSubCategory.parent;
    if (!parentCategory || parentCategory.slug !== categorySlug) {
      console.log(
        `Parent category for ${postSlug} does not match ${categorySlug}`
      );
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
                  <article
                    key={post.id}
                    className="group block bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300"
                  >
                    <div className="post-item-category api-title bor-1">
                      <div className="flex-1 site-main">
                        <Link
                          href={`/${categorySlug}/${postSlug}/${post.slug}`}
                          className="flex flex-col h-full"
                        >
                          <h3 className="post-title-1">{post.title}</h3>
                          {post.meta?.description && (
                            <p className="post-description">
                              {post.meta.description}
                            </p>
                          )}
                        </Link>
                        <div className="post-first-tag">
                        {Array.isArray(post.tags) && post.tags.length > 0 && post.tags[0] && (
                          <Link href={`/tag/${post.tags[0].slug}`}>
                            <span className="text-blue-600 hover:underline">
                              {post.tags[0].name}
                            </span>
                          </Link>
                        )}
                          <ShareButton
                            url={`${baseUrl}/${categorySlug}/${postSlug}/${post.slug}`}
                            title={post.title}
                            description={post.meta?.description}
                          />
                        </div>
                      </div>

                      {imageUrl ? (
                       <Link
                          href={`/${categorySlug}/${postSlug}/${post.slug}`} className="relative w-full h-48 overflow-hidden rounded-t-lg site-main">
                          <img
                            src={imageUrl}
                            alt={imageAlt}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </Link>
                      ) : (
                        <div className="w-full h-48 bg-gray-100 rounded-t-lg flex items-center justify-center">
                          <span className="text-gray-400 text-sm">
                            No Image
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2 mt-8 web-stories-pagination">
                {page > 1 && (
                  <Link
                    href={`/${categorySlug}/${postSlug}?page=${page - 1}`}
                    className="pagination-link"
                  >
                    Prev
                  </Link>
                )}

                {/* First Page */}
                <Link
                  href={`/${categorySlug}/${postSlug}?page=1`}
                  className={`pagination-link ${page === 1 ? "active" : ""}`}
                >
                  1
                </Link>

                {/* Ellipsis after first page if current page is greater than 2 */}
                {page > 2 && <span className="pagination-ellipsis">…</span>}

                {/* Current Page (only if it's not the first or last page) */}
                {page !== 1 && page !== totalPages && (
                  <Link
                    href={`/${categorySlug}/${postSlug}?page=${page}`}
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
                    href={`/${categorySlug}/${postSlug}?page=${totalPages}`}
                    className={`pagination-link ${
                      page === totalPages ? "active" : ""
                    }`}
                  >
                    {totalPages}
                  </Link>
                )}

                {page < totalPages && (
                  <Link
                    href={`/${categorySlug}/${postSlug}?page=${page + 1}`}
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
    console.log(`Post not found for slug: ${postSlug}`);
    notFound();
  }

  let postCategory: Category | null = post.categories?.[0] || null;
  if (!postCategory) {
    console.log(`Post ${postSlug} has no associated category, using default`);
    postCategory = {
      id: "default",
      slug: "uncategorized",
      title: "Uncategorized",
    };
  }

  let isMatch = postCategory.slug === categorySlug;
  
  // If not a direct match, check if the URL categorySlug is the parent of the post's category
  if (!isMatch && postCategory.parent) {
    const parent = typeof postCategory.parent === 'string' 
      ? await fetchParentCategory(postCategory.parent)
      : postCategory.parent;
    if (parent && parent.slug === categorySlug) {
      isMatch = true;
    }
  }

  if (!isMatch) {
    console.log(
      `Post category ${postCategory.slug} (or its parent) does not match URL category ${categorySlug}`
    );
    notFound();
  }

  const latestPosts = await fetchLatestPosts(postSlug);

  const parentCategoriesMap: {
    [key: string]: { slug: string; title: string } | null;
  } = {};
  for (const latestPost of latestPosts) {
    const latestCategory = latestPost.categories?.[0];
    if (latestCategory?.parent && typeof latestCategory.parent === "string") {
      if (!parentCategoriesMap[latestCategory.parent]) {
        parentCategoriesMap[latestCategory.parent] = await fetchParentCategory(
          latestCategory.parent
        );
      }
    }
  }

  // Extract plain text content if layout is not available
  const postContent = post.content
    ? extractPlainTextFromRichText(post.content)
    : "";

  return (
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

                {/* Google News (Static Link as Provided) */}
                <a
                  href="https://news.google.com/publications/CAAiEHlXIe0p4nrMZPqHkIfq8H4qFAgKIhB5VyHtKeJ6zGT6h5CH6vB-?hl=ta&gl=IN&ceid=IN%3Ata"
                  aria-label="Follow on Google News"
                >
                  <svg width="110" height="40" viewBox="0 0 260 60" fill="none">
                    <path
                      d="M64.2002 47.5546C64.1791 50.607 64.1581 53.6594 64.1423 56.7118C64.1317 59.1168 63.2897 59.9641 60.8846 59.9641C44.1228 59.9641 27.3662 59.9641 10.6044 59.9641C9.64132 59.9641 8.54141 60.2009 7.99408 59.0905C7.70463 58.5116 7.46781 57.8327 7.46255 57.1959C7.42044 51.87 7.44676 46.5441 7.43097 41.2182C7.43097 40.5341 7.29414 39.8499 7.22046 39.1658C7.29414 38.7395 7.43623 38.3132 7.43623 37.8869C7.45202 31.6453 7.43623 25.409 7.45202 19.1673C7.45202 17.2517 8.35195 16.3676 10.2571 16.3518C11.8675 16.3413 13.4779 16.3518 15.0935 16.3518C25.0506 16.3413 35.0077 16.3255 44.9648 16.3149C50.2907 16.3255 55.6219 16.336 60.9478 16.3465C63.3581 16.3465 64.1318 17.1254 64.1318 19.5463C64.1318 28.3456 64.1318 37.1449 64.1318 45.9442C64.1318 46.481 64.1739 47.0125 64.2002 47.5493V47.5546ZM30.7344 30.7349C27.8925 27.5614 22.214 27.1615 18.4038 29.8139C14.1252 32.7926 12.7727 38.3658 15.2356 42.8865C17.7091 47.423 23.156 49.3544 28.0451 47.4283C32.1659 45.8073 34.6393 40.8551 33.4763 36.5239H24.1349V40.1604H29.3608C29.1082 42.2024 27.6031 43.6233 25.3506 44.0496C22.6824 44.5601 20.0037 43.2865 18.7669 40.9288C17.5249 38.5553 17.9354 35.7239 19.7984 33.8293C21.893 31.7032 24.4349 31.5716 28.0083 33.382C28.8977 32.5137 29.7818 31.6558 30.7291 30.7296L30.7344 30.7349ZM38.418 40.0341C38.8022 40.0604 39.0443 40.092 39.2863 40.092C44.7806 40.092 50.2802 40.092 55.7745 40.0815C57.3639 40.0815 57.7007 39.6499 57.6954 37.7817C57.6954 36.2818 57.3323 35.9239 55.764 35.9239C50.3486 35.9239 44.9385 35.9239 39.5232 35.9344C39.1653 35.9344 38.8127 35.9818 38.4127 36.0081V40.0394L38.418 40.0341ZM38.3654 47.9914C43.6544 47.9914 48.8382 48.0124 54.0273 47.944C54.3694 47.944 54.8114 47.2704 55.0062 46.8178C55.1693 46.4336 55.043 45.9231 55.0377 45.4705C55.0167 43.9654 54.9114 43.8496 53.4063 43.8391C49.4434 43.8128 45.4859 43.7917 41.523 43.7707C40.4652 43.7654 39.4074 43.7707 38.3654 43.7707V47.9914ZM38.2338 32.1979C38.7864 32.1979 39.1916 32.1979 39.5968 32.1979C43.9281 32.1979 48.2593 32.1926 52.5906 32.1926C54.9904 32.1926 55.1062 32.0769 55.0798 29.6823C55.064 28.2193 54.8167 27.9667 53.3273 27.9667C48.833 27.9667 44.3386 27.9667 39.8389 27.9667C39.3548 27.9667 38.8706 27.9667 38.3443 27.9667C38.297 28.2772 38.2391 28.4719 38.2338 28.6666C38.2233 29.777 38.2338 30.8822 38.2338 32.1926V32.1979Z"
                      fill="#4485F3"
                    ></path>
                    <path
                      d="M44.9596 16.3194C35.0025 16.3299 25.0454 16.3457 15.0883 16.3562C13.4779 16.3562 11.8675 16.3457 10.2518 16.3562C8.34145 16.372 7.44678 17.2561 7.44678 19.1718C7.43626 25.4134 7.44678 31.6497 7.431 37.8914C7.431 38.3176 7.2889 38.7439 7.21522 39.1702C5.88375 35.5705 4.54175 31.976 3.22606 28.3711C2.21035 25.5818 1.22096 22.782 0.236826 19.9822C-0.21577 18.6929 -0.157879 17.7193 1.60514 17.1035C5.86796 15.6194 10.0992 14.0406 14.341 12.5039C20.23 10.3883 26.1243 8.26738 32.0133 6.15176L34.7815 5.12026C35.5919 4.83081 36.3971 4.54662 37.2076 4.25717C40.06 3.24672 40.2758 3.34145 41.3652 6.11492C41.4704 6.38332 41.5704 6.64646 41.6757 6.91486C42.7703 10.0462 43.8597 13.1828 44.9543 16.3141L44.9596 16.3194Z"
                      fill="#FBBC08"
                    ></path>
                    <path
                      d="M32.0185 6.15224C26.1295 8.26786 20.2352 10.3887 14.3462 12.5044C14.3304 8.91518 14.3094 5.32073 14.2936 1.73154C14.2936 0.615837 14.8936 0.0895631 15.9619 0.0158847C16.2935 -0.00516627 16.6197 9.64679e-05 16.9513 9.64679e-05C29.5871 9.64679e-05 42.223 9.64679e-05 54.8536 9.64679e-05C57.0008 9.64679e-05 57.5744 0.568473 57.5744 2.67883C57.5744 5.48914 57.5744 8.29418 57.5744 11.1045C52.2748 9.70986 46.9752 8.31523 41.6757 6.9206C41.5704 6.6522 41.4704 6.3838 41.3652 6.12067C40.2705 3.3472 40.06 3.25247 37.2076 4.26292C36.3971 4.54711 35.5919 4.83656 34.7815 5.12601C33.3132 4.57868 32.6974 4.80498 32.008 6.1575L32.0185 6.15224Z"
                      fill="#37A854"
                    ></path>
                    <path
                      d="M41.6809 6.91504C46.9805 8.30967 52.2801 9.70429 57.5797 11.0989C60.9215 12.0199 64.2633 12.9409 67.6052 13.8619C69.0998 14.2724 70.5997 14.6618 72.089 15.0933C73.8257 15.5986 74.1415 16.1722 73.6836 17.8931C71.2523 27.0398 68.8314 36.1917 66.3842 45.3331C66.0842 46.4488 65.7159 47.5855 64.2054 47.5539C64.1844 47.0171 64.137 46.4856 64.137 45.9488C64.137 37.1495 64.137 28.3502 64.137 19.5509C64.137 17.1248 63.3634 16.3511 60.9531 16.3511C55.6219 16.3406 50.296 16.3301 44.9701 16.3196C43.8755 13.1882 42.7861 10.0516 41.6914 6.9203L41.6809 6.91504Z"
                      fill="#E84536"
                    ></path>
                    <path
                      d="M30.7344 30.7344C29.7871 31.6553 28.9029 32.5184 28.0135 33.3868C24.4401 31.5764 21.8982 31.708 19.8036 33.8341C17.9406 35.7234 17.5249 38.5601 18.7721 40.9336C20.0089 43.2913 22.6876 44.5648 25.3558 44.0544C27.603 43.6228 29.1134 42.2019 29.366 40.1652H24.1401V36.5286H33.4815C34.6498 40.8546 32.1711 45.8121 28.0504 47.433C23.156 49.3592 17.7091 47.4278 15.2408 42.8913C12.7779 38.3706 14.1304 32.7974 18.409 29.8186C22.2192 27.1662 27.8977 27.5662 30.7396 30.7396L30.7344 30.7344Z"
                      fill="#F9FBFD"
                    ></path>
                    <path
                      d="M38.418 40.0339V36.0027C38.8127 35.9763 39.1705 35.929 39.5284 35.929C44.9438 35.9237 50.3539 35.9185 55.7692 35.9185C57.3375 35.9185 57.6954 36.2763 57.7007 37.7762C57.7007 39.6497 57.3691 40.076 55.7798 40.076C50.2855 40.0918 44.7859 40.0865 39.2916 40.0865C39.0495 40.0865 38.8074 40.055 38.4232 40.0287L38.418 40.0339Z"
                      fill="#F7F9FC"
                    ></path>
                    <path
                      d="M38.3654 47.9912V43.7705C39.4074 43.7705 40.4652 43.7705 41.523 43.7705C45.4859 43.7916 49.4435 43.8126 53.4063 43.8389C54.9115 43.8495 55.0167 43.9652 55.0378 45.4704C55.043 45.923 55.1693 46.4335 55.0062 46.8176C54.8167 47.265 54.3694 47.9386 54.0273 47.9439C48.8435 48.0175 43.6544 47.9912 38.3654 47.9912Z"
                      fill="#F8FAFC"
                    ></path>
                    <path
                      d="M38.2339 32.1976C38.2339 30.8871 38.2339 29.7767 38.2339 28.6715C38.2339 28.4768 38.2917 28.2768 38.3444 27.9716C38.8654 27.9716 39.3548 27.9716 39.839 27.9716C44.3334 27.9716 48.8278 27.9663 53.3274 27.9716C54.8168 27.9716 55.0588 28.2242 55.0799 29.6872C55.1062 32.0765 54.9904 32.1923 52.5906 32.1976C48.2594 32.1976 43.9281 32.1976 39.5969 32.2028C39.1917 32.2028 38.7864 32.2028 38.2339 32.2028V32.1976Z"
                      fill="#FAFBFD"
                    ></path>
                    <path
                      d="M32.0185 6.15201C32.7079 4.80475 33.3237 4.57319 34.792 5.12051C33.8657 5.46259 32.9447 5.80993 32.0185 6.15201Z"
                      fill="#DC5434"
                    ></path>
                    <path
                      d="M99.9184 31.2138C99.0974 31.9927 98.3291 32.7189 97.6607 33.3505C96.2819 32.7505 94.9188 31.9032 93.44 31.5506C89.8034 30.6928 86.6826 31.8243 84.4565 34.8083C82.1514 37.8975 81.9409 41.3393 83.7723 44.718C85.5564 48.0019 88.5088 49.465 92.219 49.2387C95.8608 49.0177 98.3922 47.1546 99.2764 44.1865C99.4132 43.7286 99.45 43.2392 99.5605 42.6129H91.5875V39.2605C91.8401 39.2342 92.0717 39.1921 92.3085 39.1921C95.5293 39.1921 98.7553 39.2026 101.976 39.1763C102.645 39.1763 103.066 39.2658 103.113 40.0657C103.492 46.181 100.65 51.0175 94.2241 52.5542C90.6507 53.4068 87.0563 52.7384 84.0933 50.4754C80.8462 47.9967 78.8885 44.6969 78.8727 40.4183C78.8464 33.1979 84.6354 27.7351 91.6033 27.8772C94.7451 27.9404 97.6081 28.935 99.9289 31.2138H99.9184Z"
                      fill="#4285F4"
                    ></path>
                    <path
                      d="M199.058 33.0454C199.058 32.7928 199.058 32.5454 199.058 32.2928C199.095 32.2139 199.095 32.1349 199.058 32.0507C199.058 31.7981 199.058 31.5507 199.058 31.2981C199.095 31.2192 199.095 31.1403 199.058 31.0561C199.084 30.6877 199.111 30.3193 199.142 29.8772H202.01V52.7596C201.842 52.7964 201.621 52.8333 201.4 52.8912C199.274 53.4174 199.079 53.328 197.979 51.5439C194.553 45.9917 191.116 40.45 187.685 34.8979C187.601 34.7558 187.564 34.5821 187.506 34.4242C187.417 34.4926 187.327 34.561 187.243 34.6295V52.3702C186.464 53.4595 185.354 53.0017 184.28 53.1543V29.8088C185.354 29.8088 186.464 29.7141 187.538 29.8614C187.927 29.914 188.306 30.5087 188.569 30.9297C191.764 36.0188 194.932 41.1289 198.111 46.2233C198.358 46.6232 198.647 47.0022 199.058 47.5863V43.1972C199.095 43.1183 199.095 43.0393 199.058 42.9551C199.058 42.7025 199.058 42.4552 199.058 42.2025C199.095 42.1236 199.095 42.0447 199.058 41.9605C199.058 41.7078 199.058 41.4605 199.058 41.2079C199.095 41.1289 199.095 41.05 199.058 40.9658C199.058 40.7132 199.058 40.4658 199.058 40.2132C199.095 40.1343 199.095 40.0553 199.058 39.9711C199.058 39.7185 199.058 39.4712 199.058 39.2186C199.095 39.1396 199.095 39.0607 199.058 38.9765C199.058 38.7239 199.058 38.4765 199.058 38.2239C199.095 38.145 199.095 38.066 199.058 37.9818C199.058 37.7292 199.058 37.4819 199.058 37.2292C199.095 37.1503 199.095 37.0714 199.058 36.9872C199.058 36.7346 199.058 36.4872 199.058 36.2346C199.095 36.1556 199.095 36.0767 199.058 35.9925C199.058 35.7399 199.058 35.4925 199.058 35.2399C199.095 35.161 199.095 35.082 199.058 34.9978C199.058 34.7452 199.058 34.4979 199.058 34.2453C199.095 34.1663 199.095 34.0874 199.058 34.0032C199.058 33.7506 199.058 33.5032 199.058 33.2506C199.095 33.1717 199.095 33.0927 199.058 33.0085V33.0454Z"
                      fill="#323232"
                    ></path>
                    <path
                      d="M150.951 51.2388C146.82 53.9965 143.01 52.6492 140.742 49.639C138.489 46.6497 138.352 42.8132 140.873 39.6134C143.178 36.6874 147.094 35.5348 151.072 38.2504C151.146 37.9241 151.22 37.6241 151.299 37.2715H154.393C154.435 37.4399 154.504 37.5925 154.504 37.7452C154.504 42.5764 154.53 47.4076 154.493 52.2388C154.461 56.0121 152.03 59.6645 147.473 59.9013C144.368 60.0645 140.784 58.1751 139.873 55.1438C140.689 54.7596 141.505 54.3228 142.368 54.007C142.557 53.9386 143.004 54.2281 143.168 54.4702C144.857 56.9015 147.109 57.5015 149.493 55.8174C150.267 55.2701 150.635 54.0491 151.009 53.0703C151.199 52.5808 150.983 51.9335 150.946 51.2441L150.951 51.2388ZM147.194 39.9082C144.662 39.8871 142.794 41.9133 142.778 44.6972C142.762 47.4865 144.61 49.5337 147.146 49.5284C149.588 49.5232 151.467 47.4444 151.462 44.7446C151.456 42.0133 149.614 39.9292 147.194 39.9082Z"
                      fill="#4285F4"
                    ></path>
                    <path
                      d="M239.16 48.3807C240.197 44.8389 241.223 41.2918 242.291 37.7605C242.381 37.471 242.775 37.1132 243.06 37.0763C243.828 36.9816 244.612 37.0447 245.591 37.0447C244.633 39.9656 243.718 42.739 242.823 45.5125C242.17 47.5229 241.481 49.528 240.928 51.5646C240.591 52.8014 239.997 53.3856 238.686 53.1329C238.328 53.0645 237.95 53.1224 237.455 53.1224C236.181 49.228 234.913 45.3388 233.645 41.4497C233.524 41.4549 233.397 41.4654 233.276 41.4707C232.718 43.1969 232.155 44.9178 231.608 46.6492C231.013 48.507 230.471 50.3858 229.803 52.2225C229.661 52.6067 229.119 52.9856 228.692 53.0856C228.066 53.2329 227.382 53.1224 226.603 53.1224C224.887 47.8176 223.172 42.5338 221.425 37.1395H224.593C225.703 40.8655 226.835 44.6599 227.966 48.4544C228.071 48.4544 228.182 48.4544 228.287 48.4544C228.903 46.5177 229.519 44.581 230.14 42.6496C230.629 41.1286 231.161 39.6235 231.608 38.092C231.834 37.3184 232.182 36.9869 233.05 37.0132C235.134 37.0711 235.139 37.0184 235.792 39.0393C236.697 41.8233 237.602 44.6073 238.518 47.3913C238.634 47.7492 238.786 48.1018 238.918 48.4544C239.002 48.4281 239.081 48.3965 239.165 48.3702L239.16 48.3807Z"
                      fill="#323232"
                    ></path>
                    <path
                      d="M220.677 45.5605H208.31C208.41 47.6603 209.299 49.1654 210.946 50.0969C212.494 50.9758 214.178 50.9811 215.714 49.997C216.335 49.597 216.783 48.9339 217.367 48.4602C217.62 48.2602 218.077 48.0813 218.346 48.176C219.067 48.4287 219.73 48.8286 220.493 49.2128C219.135 51.5863 217.183 52.902 214.615 53.3546C209.147 54.3071 205.6 50.2706 205.284 45.9762C205.036 42.6081 206.031 39.8662 208.652 37.8032C210.115 36.6506 211.962 36.3928 213.778 36.577C218.946 37.098 220.961 41.045 220.683 45.5605H220.677ZM208.805 42.9712H217.43C217.441 40.8766 215.709 39.3557 213.283 39.2662C210.936 39.182 208.936 40.8135 208.805 42.9712Z"
                      fill="#323232"
                    ></path>
                    <path
                      d="M112.239 36.7557C116.833 36.7557 120.306 40.1554 120.227 44.7235C120.143 49.7599 116.575 52.8018 112.139 52.7912C107.46 52.7807 104.476 49.5073 104.16 45.3813C103.755 40.1133 107.813 36.561 112.239 36.7557ZM107.786 44.7182C107.786 47.5022 109.712 49.5862 112.302 49.5915C114.754 49.5968 116.764 47.439 116.78 44.7919C116.796 41.971 114.917 39.9133 112.323 39.9081C109.686 39.9028 107.792 41.9132 107.792 44.7182H107.786Z"
                      fill="#EA4335"
                    ></path>
                    <path
                      d="M129.737 36.7563C134.31 36.8195 137.779 39.9929 137.71 44.6189C137.631 50.0079 134.026 52.5867 129.584 52.8393C125.395 53.0761 121.117 48.7501 121.559 44.6399C122.069 39.8824 124.527 36.809 129.737 36.7563ZM129.753 39.9087C127.137 39.9193 125.201 41.9928 125.222 44.7557C125.248 47.4818 127.274 49.6185 129.811 49.5974C132.268 49.5764 134.279 47.3923 134.274 44.7557C134.268 41.9612 132.342 39.8982 129.748 39.9087H129.753Z"
                      fill="#FBBC05"
                    ></path>
                    <path
                      d="M176.57 42.7185C173.097 44.1605 169.618 45.6025 166.082 47.076C166.234 48.4233 167.266 49.0285 168.329 49.3601C170.508 50.039 172.239 49.1338 173.692 47.3813C174.607 47.9918 175.512 48.5917 176.476 49.2338C174.849 51.2178 173.049 52.4756 170.429 52.6756C165.403 53.0598 162.687 50.1179 162.014 46.4287C161.108 41.5028 163.934 36.4769 169.797 36.7663C172.771 36.9137 174.665 38.6767 175.981 41.187C176.202 41.6133 176.333 42.0922 176.57 42.7132V42.7185ZM172.397 41.5396C171.576 39.9924 170.134 39.4556 168.487 39.9766C166.529 40.5976 165.261 42.4343 165.487 44.4341C167.803 43.4658 170.097 42.508 172.402 41.5449L172.397 41.5396Z"
                      fill="#CB3D31"
                    ></path>
                    <path
                      d="M246.175 48.997C247.123 48.5497 247.712 48.155 248.349 48.0234C248.68 47.955 249.249 48.255 249.475 48.5602C251.064 50.7285 253.301 51.3653 255.375 50.1706C256.701 49.4075 256.906 48.2234 255.675 47.3814C254.78 46.7709 253.627 46.5077 252.57 46.1499C250.954 45.6026 249.254 45.4131 247.944 44.029C246.249 42.2291 246.696 39.3504 248.338 38.0032C250.964 35.8454 255.88 36.1244 258.259 38.5557C258.68 38.9873 258.985 39.5399 259.443 40.1767C258.474 40.6135 257.611 41.0082 256.748 41.3976C255.427 39.5451 253.738 38.9136 251.691 39.4504C250.78 39.6872 249.907 40.1872 250.033 41.1082C250.122 41.7502 250.849 42.5502 251.485 42.8186C252.78 43.3659 254.217 43.5817 255.585 43.9711C257.222 44.4395 258.658 45.2605 259.322 46.9025C260.332 49.397 258.811 52.2441 255.943 53.0283C253.343 53.7388 250.701 53.8019 248.517 51.8336C247.675 51.0758 247.049 50.0706 246.17 48.9918L246.175 48.997Z"
                      fill="#323232"
                    ></path>
                    <path
                      d="M160.329 52.1809H156.972V28.7354H160.329V52.1809Z"
                      fill="#34A853"
                    ></path>
                    <path
                      d="M82.7033 10.952H88.2873V12.712H82.7033V10.952ZM82.8793 17H80.7993V5.8H88.9753V7.544H82.8793V17ZM96.1098 17.16C95.2351 17.16 94.4298 17.016 93.6938 16.728C92.9578 16.44 92.3178 16.04 91.7738 15.528C91.2298 15.0053 90.8084 14.3973 90.5098 13.704C90.2111 13 90.0618 12.232 90.0618 11.4C90.0618 10.568 90.2111 9.80533 90.5098 9.112C90.8084 8.408 91.2298 7.8 91.7738 7.288C92.3178 6.76533 92.9578 6.36 93.6938 6.072C94.4298 5.784 95.2298 5.64 96.0938 5.64C96.9684 5.64 97.7684 5.784 98.4938 6.072C99.2298 6.36 99.8698 6.76533 100.414 7.288C100.958 7.8 101.379 8.408 101.678 9.112C101.976 9.80533 102.126 10.568 102.126 11.4C102.126 12.232 101.976 13 101.678 13.704C101.379 14.408 100.958 15.016 100.414 15.528C99.8698 16.04 99.2298 16.44 98.4938 16.728C97.7684 17.016 96.9738 17.16 96.1098 17.16ZM96.0938 15.336C96.6591 15.336 97.1818 15.24 97.6618 15.048C98.1418 14.856 98.5578 14.584 98.9098 14.232C99.2618 13.8693 99.5338 13.4533 99.7258 12.984C99.9284 12.504 100.03 11.976 100.03 11.4C100.03 10.824 99.9284 10.3013 99.7258 9.832C99.5338 9.352 99.2618 8.936 98.9098 8.584C98.5578 8.22133 98.1418 7.944 97.6618 7.752C97.1818 7.56 96.6591 7.464 96.0938 7.464C95.5284 7.464 95.0058 7.56 94.5258 7.752C94.0564 7.944 93.6404 8.22133 93.2778 8.584C92.9258 8.936 92.6484 9.352 92.4458 9.832C92.2538 10.3013 92.1578 10.824 92.1578 11.4C92.1578 11.9653 92.2538 12.488 92.4458 12.968C92.6484 13.448 92.9258 13.8693 93.2778 14.232C93.6298 14.584 94.0458 14.856 94.5258 15.048C95.0058 15.24 95.5284 15.336 96.0938 15.336ZM104.331 17V5.8H106.411V15.24H112.267V17H104.331ZM113.909 17V5.8H115.989V15.24H121.845V17H113.909ZM128.532 17.16C127.657 17.16 126.852 17.016 126.116 16.728C125.38 16.44 124.74 16.04 124.196 15.528C123.652 15.0053 123.23 14.3973 122.932 13.704C122.633 13 122.484 12.232 122.484 11.4C122.484 10.568 122.633 9.80533 122.932 9.112C123.23 8.408 123.652 7.8 124.196 7.288C124.74 6.76533 125.38 6.36 126.116 6.072C126.852 5.784 127.652 5.64 128.516 5.64C129.39 5.64 130.19 5.784 130.916 6.072C131.652 6.36 132.292 6.76533 132.836 7.288C133.38 7.8 133.801 8.408 134.1 9.112C134.398 9.80533 134.548 10.568 134.548 11.4C134.548 12.232 134.398 13 134.1 13.704C133.801 14.408 133.38 15.016 132.836 15.528C132.292 16.04 131.652 16.44 130.916 16.728C130.19 17.016 129.396 17.16 128.532 17.16ZM128.516 15.336C129.081 15.336 129.604 15.24 130.084 15.048C130.564 14.856 130.98 14.584 131.332 14.232C131.684 13.8693 131.956 13.4533 132.148 12.984C132.35 12.504 132.452 11.976 132.452 11.4C132.452 10.824 132.35 10.3013 132.148 9.832C131.956 9.352 131.684 8.936 131.332 8.584C130.98 8.22133 130.564 7.944 130.084 7.752C129.604 7.56 129.081 7.464 128.516 7.464C127.95 7.464 127.428 7.56 126.948 7.752C126.478 7.944 126.062 8.22133 125.7 8.584C125.348 8.936 125.07 9.352 124.868 9.832C124.676 10.3013 124.58 10.824 124.58 11.4C124.58 11.9653 124.676 12.488 124.868 12.968C125.07 13.448 125.348 13.8693 125.7 14.232C126.052 14.584 126.468 14.856 126.948 15.048C127.428 15.24 127.95 15.336 128.516 15.336ZM139.033 17L135.321 5.8H137.481L140.793 15.928H139.721L143.161 5.8H145.081L148.425 15.928H147.385L150.777 5.8H152.761L149.049 17H146.841L143.785 7.864H144.361L141.257 17H139.033ZM164.36 17.16C163.485 17.16 162.68 17.016 161.944 16.728C161.208 16.44 160.568 16.04 160.024 15.528C159.48 15.0053 159.058 14.3973 158.76 13.704C158.461 13 158.312 12.232 158.312 11.4C158.312 10.568 158.461 9.80533 158.76 9.112C159.058 8.408 159.48 7.8 160.024 7.288C160.568 6.76533 161.208 6.36 161.944 6.072C162.68 5.784 163.48 5.64 164.344 5.64C165.218 5.64 166.018 5.784 166.744 6.072C167.48 6.36 168.12 6.76533 168.664 7.288C169.208 7.8 169.629 8.408 169.928 9.112C170.226 9.80533 170.376 10.568 170.376 11.4C170.376 12.232 170.226 13 169.928 13.704C169.629 14.408 169.208 15.016 168.664 15.528C168.12 16.04 167.48 16.44 166.744 16.728C166.018 17.016 165.224 17.16 164.36 17.16ZM164.344 15.336C164.909 15.336 165.432 15.24 165.912 15.048C166.392 14.856 166.808 14.584 167.16 14.232C167.512 13.8693 167.784 13.4533 167.976 12.984C168.178 12.504 168.28 11.976 168.28 11.4C168.28 10.824 168.178 10.3013 167.976 9.832C167.784 9.352 167.512 8.936 167.16 8.584C166.808 8.22133 166.392 7.944 165.912 7.752C165.432 7.56 164.909 7.464 164.344 7.464C163.778 7.464 163.256 7.56 162.776 7.752C162.306 7.944 161.89 8.22133 161.528 8.584C161.176 8.936 160.898 9.352 160.696 9.832C160.504 10.3013 160.408 10.824 160.408 11.4C160.408 11.9653 160.504 12.488 160.696 12.968C160.898 13.448 161.176 13.8693 161.528 14.232C161.88 14.584 162.296 14.856 162.776 15.048C163.256 15.24 163.778 15.336 164.344 15.336ZM172.581 17V5.8H174.293L181.317 14.424H180.469V5.8H182.533V17H180.821L173.797 8.376H174.645V17H172.581Z"
                      fill="#333333"
                    ></path>
                  </svg>
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
                  <img
                    src={getImageUrl(post.layout[0].media) || undefined} // Pass full media object
                    alt={post.layout[0].media.alt || "Hero Image"}
                    className="w-full h-80 object-cover"
                  />
                ) : (
                  <img
                    src={getImageUrl(post.heroImage) || undefined} // Pass full media object
                    alt={post.heroImage?.alt || "Hero Image"}
                    className="w-full h-80 object-cover"
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
                    <img
                      src={getImageUrl(block.media) || undefined} // Pass full media object
                      alt={block.media.alt || "Media"}
                      className="w-full max-w-2xl mx-auto h-auto object-cover rounded-md shadow-md"
                    />
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
                href="https://news.google.com/publications/CAAiEHlXIe0p4nrMZPqHkIfq8H4qFAgKIhB5VyHtKeJ6zGT6h5CH6vB-?hl=ta&amp;gl=IN&amp;ceid=IN%3Ata"
                aria-label="Menu"
              >
                <svg width="20" height="18" viewBox="0 0 20 18" fill="none">
                  <g clipPath="url(#clip0_4590_27)">
                    <path
                      d="M4.16626 1.62102V12.0369C4.16626 12.5175 4.54126 12.9083 5.00251 12.9083H14.9975C15.4588 12.9083 15.8338 12.5175 15.8338 12.0369V1.62102C15.8338 1.14035 15.4588 0.749557 14.9975 0.749557H5.00251C4.54126 0.749557 4.16626 1.14035 4.16626 1.62102Z"
                      fill="url(#paint0_linear_4590_27)"
                    ></path>
                    <path
                      d="M15.6309 6.19717L11.5771 3.04002L15.8334 3.6883L15.8338 5.52979L15.6309 6.19717Z"
                      fill="black"
                      fillOpacity="0.047"
                    ></path>
                    <path
                      d="M15.6309 6.19717L11.5771 3.04002L15.8334 3.96576L15.8338 5.53022L15.6309 6.19717Z"
                      fill="black"
                      fillOpacity="0.071"
                    ></path>
                    <path
                      d="M9.37954 3.2541L6.94745 12.4333C6.83537 12.8571 7.07412 13.2961 7.48037 13.4129L16.1879 15.9178C16.5941 16.0347 17.015 15.7863 17.1275 15.3625L19.5595 6.18285C19.6716 5.7595 19.4329 5.32094 19.0266 5.20371L10.3191 2.69831C9.91287 2.58151 9.49204 2.83031 9.37954 3.2541Z"
                      fill="url(#paint1_linear_4590_27)"
                    ></path>
                    <path
                      d="M12.4996 5.52588L10.8329 3.35482L11.4608 3.02786L12.4991 3.3266L12.4996 5.52588Z"
                      fill="black"
                      fillOpacity="0.047"
                    ></path>
                    <path
                      d="M4.16626 4.12512L10.0838 1.25802C10.4654 1.07348 10.92 1.2463 11.0971 1.6436L11.6833 2.95709L4.16626 4.12512Z"
                      fill="black"
                      fillOpacity="0.047"
                    ></path>
                    <path
                      d="M4.16626 4.35786L10.0833 1.49077C10.465 1.30623 10.9196 1.47904 11.0967 1.87635L11.6829 3.18983L4.16626 4.35786Z"
                      fill="black"
                      fillOpacity="0.071"
                    ></path>
                    <path
                      d="M12.4996 5.52588L10.8329 3.35482L11.4608 3.02786L12.2275 3.24801L12.4996 5.52588Z"
                      fill="black"
                      fillOpacity="0.071"
                    ></path>
                    <path
                      d="M0.462459 6.38127L3.58288 15.3156C3.72663 15.7277 4.16579 15.9409 4.56079 15.791L14.3041 12.0955C14.6991 11.9457 14.9037 11.488 14.7595 11.0764L11.6391 2.14164C11.4954 1.73001 11.057 1.51681 10.6612 1.66618L0.918292 5.36218C0.522876 5.51198 0.318293 5.96877 0.462459 6.38127Z"
                      fill="url(#paint2_linear_4590_27)"
                    ></path>
                    <path
                      d="M2.49915 5.96314V16.379C2.49915 16.8596 2.87415 17.2504 3.3354 17.2504H16.6637C17.125 17.2504 17.5 16.8596 17.5 16.379V5.96314C17.5 5.48246 17.125 5.09167 16.6637 5.09167H3.33498C2.87415 5.09167 2.49915 5.48246 2.49915 5.96314Z"
                      fill="url(#paint3_linear_4590_27)"
                    ></path>
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M10.4163 9.43464V8.13158H14.5846C14.8133 8.13158 15 8.3261 15 8.56448V9.00173C15 9.24012 14.8133 9.43464 14.5846 9.43464H10.4163Z"
                      fill="white"
                    ></path>
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M10.4158 11.6048V10.3018H15.4174C15.6462 10.3018 15.8329 10.4963 15.8329 10.7347V11.1719C15.8329 11.4103 15.6462 11.6048 15.4174 11.6048H10.4158Z"
                      fill="white"
                    ></path>
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M10.4163 13.7759V12.4728H14.5846C14.8133 12.4728 15 12.6673 15 12.9057V13.343C15 13.5813 14.8133 13.7759 14.5846 13.7759H10.4163Z"
                      fill="white"
                    ></path>
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M4.16418 10.9535C4.16418 9.39426 5.37793 8.12897 6.8746 8.12897C7.62252 8.12897 8.30085 8.44551 8.79127 8.95744L7.90752 9.8784C7.64293 9.60268 7.27752 9.4316 6.8746 9.4316C6.06835 9.4316 5.41418 10.1142 5.41418 10.9535C5.41418 11.7937 6.06877 12.4754 6.8746 12.4754C7.68002 12.4754 8.33502 11.7933 8.33502 10.9535C8.33502 10.8801 8.3296 10.8076 8.32002 10.7364H9.57668C9.5821 10.808 9.58502 10.8806 9.58502 10.9535C9.58502 12.5132 8.37043 13.778 6.8746 13.778C5.37793 13.7785 4.16418 12.5132 4.16418 10.9535Z"
                      fill="white"
                    ></path>
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M7.08252 10.7373V11.6061H8.33294L8.7496 11.1706L8.33294 10.7368L7.08252 10.7373Z"
                      fill="white"
                    ></path>
                  </g>
                  <defs>
                    <linearGradient
                      id="paint0_linear_4590_27"
                      x1="4.79126"
                      y1="1.40087"
                      x2="9.56352"
                      y2="5.98031"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#33C481"></stop>
                      <stop offset="1" stopColor="#21A366"></stop>
                    </linearGradient>
                    <linearGradient
                      id="paint1_linear_4590_27"
                      x1="8.3712"
                      y1="4.22109"
                      x2="16.5951"
                      y2="12.1127"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#F44F5B"></stop>
                      <stop offset="1" stopColor="#E5202E"></stop>
                    </linearGradient>
                    <linearGradient
                      id="paint2_linear_4590_27"
                      x1="1.64079"
                      y1="2.50725"
                      x2="8.81479"
                      y2="9.39139"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#FFE074"></stop>
                      <stop offset="1" stopColor="#F8CF40"></stop>
                    </linearGradient>
                    <linearGradient
                      id="paint3_linear_4590_27"
                      x1="4.1579"
                      y1="5.08386"
                      x2="14.8161"
                      y2="15.311"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#55ADFD"></stop>
                      <stop offset="1" stopColor="#438FFD"></stop>
                    </linearGradient>
                    <clipPath id="clip0_4590_27">
                      <rect width="20" height="18" fill="white"></rect>
                    </clipPath>
                  </defs>
                </svg>
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
                          <img
                            alt={imageAlt}
                            src={imageUrl}
                            style={{
                              width: "120px",
                              height: "80px",
                              objectFit: "cover",
                              borderRadius: "4px",
                              marginLeft: "12px",
                            }}
                          />
                        ) : (
                          <div>
                            <Text type="secondary" style={{ fontSize: "12px" }}>
                              No Image
                            </Text>
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
  );
}

