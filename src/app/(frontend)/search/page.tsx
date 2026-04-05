import axios from "axios";
import Link from "next/link";
import ShareButton from "@/components/ShareButton";
import { getPayload } from "payload";
import config from "@/payload.config";

type Tag = {
  id: string;
  name: string;
  slug: string;
};

type Category = {
  id: string;
  slug: string;
  title?: string;
  parent?: { id: string; slug: string; title: string } | string;
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
  layout?: {
    blockType: string;
    media?: {
      url: string;
      alt?: string;
    };
  }[];
  categories?: Category[];
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

// Helper function to handle query parameters (string | string[] | undefined)
const getPageNumber = (pageParam: string | string[] | undefined): number => {
  if (Array.isArray(pageParam)) {
    return parseInt(pageParam[0] || "1", 10); // Take the first value if it's an array
  }
  return parseInt(pageParam || "1", 10);
};

// Helper function to get the search query (string | string[] | undefined)
const getSearchQuery = (queryParam: string | string[] | undefined): string => {
  if (Array.isArray(queryParam)) {
    return queryParam[0] || ""; // Take the first value if it's an array
  }
  return queryParam || "";
};

// Helper function to get the image URL with proper base URL
function getImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${apiUrl}${url}`;
}

// Helper function to calculate read time
function calculateReadTime(description: string | undefined): string {
  if (!description) return "1 Min Read";
  const words = description.split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} Min Read`;
}

// Fetch posts by search query with pagination
async function fetchPostsBySearch(
  query: string,
  page: number = 1,
  limit: number = 10
): Promise<{ posts: Post[]; total: number }> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "posts",
      where: {
        or: [
          {
            title: {
              contains: query,
            },
          },
          {
            "meta.description": {
              contains: query,
            },
          },
        ],
      },
      limit,
      page,
      sort: "-publishedAt",
      depth: 2,
    });

    return {
      posts: (res.docs as unknown as Post[]) || [],
      total: res.totalDocs || 0,
    };
  } catch (err) {
    console.error(`Error fetching posts for search query ${query}:`, err);
    return { posts: [], total: 0 };
  }
}

// Fetch parent category details by ID
async function fetchParentCategory(
  parentId: string
): Promise<{ slug: string; title: string } | null> {
  try {
    const res = await axios.get(
      `${apiUrl}/api/categories/${parentId}?depth=1`,
      {
        timeout: 10000,
      }
    );
    const parentCategory = res.data || null;
    if (!parentCategory) {
      console.log(`No parent category found for ID: ${parentId}`);
      return null;
    }
    return {
      slug: parentCategory.slug || "uncategorized",
      title: parentCategory.title || "Uncategorized",
    };
  } catch (err) {
    let errorMessage = "";
    if (typeof err === "object" && err !== null) {
      if (
        "response" in err &&
        typeof (err as any).response?.data !== "undefined"
      ) {
        errorMessage = (err as any).response.data;
      } else if ("message" in err && typeof (err as any).message === "string") {
        errorMessage = (err as any).message;
      } else {
        errorMessage = JSON.stringify(err);
      }
    } else {
      errorMessage = String(err);
    }
    console.error(
      `Error fetching parent category with ID ${parentId}:`,
      errorMessage
    );
    return null;
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const queryParams = await searchParams;
  const query = getSearchQuery(queryParams.s);
  const page = getPageNumber(queryParams.page);
  const limit = 10;

  if (!query) {
    return <div className="site">Please provide a search query.</div>;
  }

  const { posts, total } = await fetchPostsBySearch(query, page, limit);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="site">
      <div className="site-main">
        <h1 className="category-title">Search Results for: {query}</h1>
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-500">No posts found for this search query.</p>
      ) : (
        <>
          <div className="category-grid">
            {await Promise.all(
              posts.map(async (post) => {
                const imageUrl = getImageUrl(post.heroImage?.url);
                const imageAlt = post.heroImage?.alt || post.title;

                const category = post.categories?.[0];
                const categorySlug = category?.slug || "uncategorized";

                let postUrl = `/${categorySlug}/${post.slug}`;
                if (category?.parent) {
                  const parent =
                    typeof category.parent === "string"
                      ? await fetchParentCategory(category.parent)
                      : category.parent;
                  if (parent) {
                    postUrl = `/${parent.slug}/${categorySlug}/${post.slug}`;
                  }
                }

                const readTime = calculateReadTime(post.meta?.description);

                return (
                  <article
                    key={post.id}
                    className="flex flex-col md:flex-row gap-4 border-b pb-6 hover:bg-gray-50 transition"
                  >
                    <div className="post-item-category api-title bor-1">
                      <div className="flex-1 site-main">
                        <Link href={postUrl} className="flex flex-col h-full">
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
                          <span style={{ marginTop: "4px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "12px",
                                color: "#8c8c8c",
                              }}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="9"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                />
                                <path
                                  d="M12 7.5V12.2L15 14"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              <span>{readTime}</span>
                            </span>
                          </span>
                          <ShareButton
                            url={`${baseUrl}${postUrl}`} // Updated to use dynamic baseUrl
                            title={post.title}
                            description={post.meta?.description}
                          />
                        </div>
                      </div>
                      {imageUrl ? (
                        <Link
                          href={postUrl} className="relative w-full md:w-48 h-48 overflow-hidden rounded-t-lg site-main">
                          <img
                            src={imageUrl}
                            alt={imageAlt}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            style={{ borderRadius: "10px" }}
                          />
                        </Link>
                      ) : (
                        <div className="w-full md:w-48 h-48 bg-gray-100 rounded-t-lg flex items-center justify-center">
                          <span className="text-gray-400 text-sm">
                            No Image
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2 mt-8 web-stories-pagination">
              {page > 1 && (
                <Link
                  href={`/search?s=${encodeURIComponent(query)}&page=${
                    page - 1
                  }`}
                  className="pagination-link"
                >
                  Prev
                </Link>
              )}

              <Link
                href={`/search?s=${encodeURIComponent(query)}&page=1`}
                className={`pagination-link ${page === 1 ? "active" : ""}`}
              >
                1
              </Link>

              {page > 2 && <span className="pagination-ellipsis">…</span>}

              {page !== 1 && page !== totalPages && (
                <Link
                  href={`/search?s=${encodeURIComponent(query)}&page=${page}`}
                  className="pagination-link active"
                >
                  {page}
                </Link>
              )}

              {page < totalPages - 1 && (
                <span className="pagination-ellipsis">…</span>
              )}

              {totalPages > 1 && (
                <Link
                  href={`/search?s=${encodeURIComponent(
                    query
                  )}&page=${totalPages}`}
                  className={`pagination-link ${
                    page === totalPages ? "active" : ""
                  }`}
                >
                  {totalPages}
                </Link>
              )}

              {page < totalPages && (
                <Link
                  href={`/search?s=${encodeURIComponent(query)}&page=${
                    page + 1
                  }`}
                  className="pagination-link"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
