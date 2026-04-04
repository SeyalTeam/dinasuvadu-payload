export const revalidate = 60; // Revalidate every 60 seconds
export const dynamicParams = true; // Enable on-demand rendering
import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
// import { Space } from "antd";
// import { ClockCircleOutlined } from "@ant-design/icons";
import Text from "antd/es/typography/Text";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@/payload.config";
import type { Metadata } from "next";
import { buildMetadata, buildBreadcrumbLd, buildArticleLd } from "@/lib/seo";

// Generate dynamic metadata for subcategory post pages
export async function generateMetadata({ params }: { params: Promise<{ categorySlug: string; postSlug: string; subPostSlug: string }> }): Promise<Metadata> {
  const { categorySlug, postSlug, subPostSlug } = await params;
  const post = await fetchPost(subPostSlug);
  if (!post) {
    return { title: "Post not found – Dinasuvadu" };
  }
  const title = post.title;
  const description = post.meta?.description || "Read the latest article on Dinasuvadu.";
  const imageUrl = getImageUrl(post.heroImage) || undefined;
  const canonical = `https://www.dinasuvadu.com/${categorySlug}/${postSlug}/${subPostSlug}`;
  return buildMetadata({ title, description, imageUrl, type: "article", canonical });
}
import RichText from "@/components/RichText";

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
  url: string;
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

// API base URL
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Helper function to get the image URL with proper base URL (Added from Home page)
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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  return `${apiUrl}${cleanPath}`;
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

export default async function SubCategoryPostPage({
  params,
}: {
  params: Promise<{
    categorySlug: string;
    postSlug: string;
    subPostSlug: string;
  }>;
}) {
  console.log(
    "Entering SubCategoryPostPage component for [categorySlug]/[postSlug]/[subPostSlug]"
  );

  const { categorySlug, postSlug, subPostSlug } = await params;
  console.log(`Handling route: /${categorySlug}/${postSlug}/${subPostSlug}`);

  // Fetch the subcategory (postSlug should be a subcategory like "india")
  const subCategory = await fetchCategoryBySlug(postSlug);
  if (!subCategory) {
    console.log(`Subcategory ${postSlug} not found`);
    notFound();
  }

  // Ensure the subcategory has a parent
  if (!subCategory.parent) {
    console.log(
      `Category ${postSlug} has no parent, this route is for subcategories only.`
    );
    notFound();
  }

  // Fetch the parent category
  const parentCategory =
    typeof subCategory.parent === "string"
      ? await fetchParentCategory(subCategory.parent)
      : subCategory.parent;
  if (!parentCategory) {
    console.log(`Parent category not found for subcategory ${postSlug}`);
    notFound();
  }

  // Verify the parent category matches categorySlug
  if (parentCategory.slug !== categorySlug) {
    console.log(
      `Parent category slug ${parentCategory.slug} does not match categorySlug ${categorySlug}`
    );
    notFound();
  }

  // Fetch subcategory title
  let subCategoryTitle = subCategory.title || "Uncategorized";
  if (!subCategory.title) {
    const fetchedCategory = await fetchCategoryById(subCategory.id);
    if (fetchedCategory) {
      subCategoryTitle = fetchedCategory.title;
    }
  }

  // Fetch the post (subPostSlug is the actual post slug)
  const post = await fetchPost(subPostSlug);
  if (!post) {
    console.log(`Post not found for slug: ${subPostSlug}`);
    notFound();
  }

  // Get the post's category with a fallback
  let postCategory: Category | null = post.categories?.[0] || null;
  if (!postCategory) {
    console.log(
      `Post ${subPostSlug} has no associated category, using default`
    );
    postCategory = {
      id: "default",
      slug: "uncategorized",
      title: "Uncategorized",
    };
  }

  // Verify the post's category matches the subcategory
  if (postCategory.slug !== postSlug) {
    console.log(
      `Post category ${postCategory.slug} does not match subcategory ${postSlug}`
    );
    notFound();
  }

  // Fetch latest posts for the sidebar
  const latestPosts = await fetchLatestPosts(subPostSlug);

  // Pre-fetch parent categories for latest posts
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

  // Extract plain text content
  const postContent = extractPlainTextFromRichText(post.content);

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
      <div className="post-grid lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Main Article Content */}
        <article className="lg:col-span-2">
          {/* Breadcrumbs */}
          <nav
            aria-label="Breadcrumb"
            className="mb-6 text-sm font-medium text-gray-600"
          >
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

          {/* Post Title */}
          <h1 className="single-post-title">{post.title}</h1>

          {/* Meta Description Summary Box (Restored and moved after title) */}
          {post.meta?.description && (
            <p className="post-summary-box">{post.meta.description}</p>
          )}

          {/* Meta Information */}
          <div className="entry-meta">
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
                    `https://www.dinasuvadu.com/${categorySlug}/${postSlug}/${subPostSlug}`
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
                    `https://www.dinasuvadu.com/${categorySlug}/${postSlug}/${subPostSlug}`
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
                    `https://www.dinasuvadu.com/${categorySlug}/${postSlug}/${subPostSlug}`
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
                    `https://www.dinasuvadu.com/${categorySlug}/${postSlug}/${subPostSlug}`
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
          {post.heroImage && (
            <figure className="mb-10">
              <div className="relative">
                {(() => {
                  const imageUrl = getImageUrl(post.heroImage);
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
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-64 sm:h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Text type="secondary">No Image</Text>
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
          )}

          {/* Post Content (Rich Text) */}
          {post.content && (
            <section className="mb-12">
              <RichText data={post.content as any} />
            </section>
          )}

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
                rel="noopener noreferrer"
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
                rel="noopener noreferrer"
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
                rel="noopener noreferrer"
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
                rel="noopener noreferrer"
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
                    <span className="inline-block bg-gray-100 rounded-full px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-indigo-100 hover:text-indigo-700 transition-colors">
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
          <div className="sticky top-20 bg-gray-50 border border-gray-200 rounded-lg p-6 shadow-sm">
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
                    latestPost.heroImage?.url || latestPost.meta?.image?.url
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
    </>
  );
}
