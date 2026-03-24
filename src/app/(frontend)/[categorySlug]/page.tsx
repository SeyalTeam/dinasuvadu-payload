import axios from "axios";
import Link from "next/link";
// import { Space } from "antd";
// import { ClockCircleOutlined } from "@ant-design/icons";
// import Text from "antd/es/typography/Text";
import "antd/dist/reset.css";
import { notFound } from "next/navigation";
import ShareButton from "@/components/ShareButton";

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

// Fetch a category by slug
async function fetchCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    console.log(`Fetching category with slug: ${slug}`);
    const response = await axios.get(
      `${apiUrl}/api/categories?where[slug][equals]=${slug}&depth=2`
    );
    const category = response.data.docs[0] || null;
    if (!category) {
      console.log(`No category found for slug: ${slug}`);
      return null;
    }
    console.log(`Fetched category ${slug}:`, JSON.stringify(category, null, 2));
    return category;
  } catch (error) {
    let errorMessage = "";
    if (typeof error === "object" && error !== null) {
      if (
        "response" in error &&
        typeof (error as any).response?.data !== "undefined"
      ) {
        errorMessage = (error as any).response.data;
      } else if (
        "message" in error &&
        typeof (error as any).message === "string"
      ) {
        errorMessage = (error as any).message;
      } else {
        errorMessage = JSON.stringify(error);
      }
    } else {
      errorMessage = String(error);
    }
    console.error(`Error fetching category with slug ${slug}:`, errorMessage);
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
    console.log(`Fetching category ID for slug: ${categorySlug}`);
    const categoryResponse = await axios.get(
      `${apiUrl}/api/categories?where[slug][equals]=${categorySlug}&depth=0`
    );
    const category = categoryResponse.data.docs[0] || null;
    if (!category) {
      console.log(`Category not found for slug: ${categorySlug}`);
      return { posts: [], total: 0 };
    }
    const categoryId = category.id;
    // Fetch child categories to include their posts in the parent view
    console.log(`Fetching child categories for: ${categoryId}`);
    const childrenResponse = await axios.get(
      `${apiUrl}/api/categories?where[parent][equals]=${categoryId}&depth=0&limit=100`
    );
    const childIds = childrenResponse.data.docs.map((c: any) => c.id);
    const allCategoryIds = [categoryId, ...childIds];
    
    // Construct IDs string for the "in" query
    const idsString = allCategoryIds.join(",");
    console.log(`Fetching posts for category tree: ${idsString}`);

    console.log(
      `Fetching posts for category IDs: ${allCategoryIds}, page: ${page}, limit: ${limit}`
    );
    // Fetch posts using axios params for proper URL encoding of the "in" query
    console.log(
      `Fetching posts for category IDs: ${allCategoryIds}, page: ${page}, limit: ${limit}`
    );
    const response = await axios.get(`${apiUrl}/api/posts`, {
      params: {
        where: {
          categories: {
            in: allCategoryIds,
          },
        },
        sort: "-publishedAt",
        depth: 2,
        limit,
        page,
      },
    });
    const posts = response.data.docs || [];
    const total = response.data.totalDocs || 0;
    console.log(
      `Fetched ${posts.length} posts for category tree ${categorySlug}, total: ${total}`
    );
    return { posts, total };
  } catch (error) {
    let errorMessage = "";
    if (typeof error === "object" && error !== null) {
      if (
        "response" in error &&
        typeof (error as any).response?.data !== "undefined"
      ) {
        errorMessage = (error as any).response.data;
      } else if (
        "message" in error &&
        typeof (error as any).message === "string"
      ) {
        errorMessage = (error as any).message;
      } else {
        errorMessage = JSON.stringify(error);
      }
    } else {
      errorMessage = String(error);
    }
    console.error(
      "Error fetching posts for category " + categorySlug + ":",
      errorMessage
    );
    return { posts: [], total: 0 };
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
      `Error fetching category with ID ${categoryId}:`,
      errorMessage
    );
    return null;
  }
}

// Helper function to get the image URL with proper base URL
function getImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${apiUrl}${url}`;
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
  const page = parseInt((query.page as string) || "1", 10); // Access the resolved value
  const limit = 10;
  console.log(`Handling route: /${categorySlug}?page=${page}`);

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

  let categoryTitle = category.title || "Uncategorized";
  if (!category.title) {
    const fetchedCategory = await fetchCategoryById(category.id);
    if (fetchedCategory) {
      categoryTitle = fetchedCategory.title;
    }
  }

  const { posts, total } = await fetchPostsByCategory(
    categorySlug,
    page,
    limit
  );
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="site">
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
          <span className="text-gray-700">{categoryTitle}</span>
        </div>
      </nav>

      {/* Category Header */}
      <header className="mb-10 site-main">
        <h1 className="category-title">{categoryTitle}</h1>
      </header>

      {/* Posts Grid */}
      {posts.length > 0 ? (
        <>
          <div className="category-grid">
            {posts.map((post) => {
              const imageUrl = getImageUrl(post.heroImage?.url);
              const imageAlt = post.heroImage?.alt || post.title;

              return (
                <article
                  key={post.id}
                  className="group block bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300"
                >
                  <div className="post-item-category api-title bor-1">
                    <div className="flex-1 site-main">
                      <Link
                        href={`/${categorySlug}/${post.slug}`}
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
                        {Array.isArray(post.tags) && post.tags.length > 0 && (
                          <Link href={`/tag/${post.tags[0].slug}`}>
                            <span className="text-blue-600 hover:underline">
                              {post.tags[0].name}
                            </span>
                          </Link>
                        )}
                        {/* <span style={{ marginTop: "4px" }}>
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
                          </span> */}
                        <ShareButton
                          url={`http://localhost:3001/${categorySlug}/${post.slug}`}
                          title={post.title}
                          description={post.meta?.description}
                        />
                      </div>
                    </div>
                    {/* Image */}
                    {imageUrl ? (
                      <Link
                          href={`/${categorySlug}/${post.slug}`} className="relative w-full h-48 overflow-hidden rounded-t-lg site-main">
                        <img
                          src={imageUrl}
                          alt={imageAlt}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </Link>
                    ) : (
                      <div className="w-full h-48 bg-gray-100 rounded-t-lg flex items-center justify-center">
                        <span className="text-gray-400 text-sm">No Image</span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="web-stories-pagination">
              {page > 1 && (
                <Link
                  href={`/${categorySlug}?page=${page - 1}`}
                  className="pagination-link"
                >
                  Prev
                </Link>
              )}

              {/* First Page */}
              <Link
                href={`/${categorySlug}?page=1`}
                className={`pagination-link ${page === 1 ? "active" : ""}`}
              >
                1
              </Link>

              {/* Ellipsis after first page if current page is greater than 2 */}
              {page > 2 && <span className="pagination-ellipsis">…</span>}

              {/* Current Page (only if it's not the first or last page) */}
              {page !== 1 && page !== totalPages && (
                <Link
                  href={`/${categorySlug}?page=${page}`}
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
                  href={`/${categorySlug}?page=${totalPages}`}
                  className={`pagination-link ${
                    page === totalPages ? "active" : ""
                  }`}
                >
                  {totalPages}
                </Link>
              )}

              {page < totalPages && (
                <Link
                  href={`/${categorySlug}?page=${page + 1}`}
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
          No posts available in this category.
        </p>
      )}
    </div>
  );
}

export async function generateStaticParams() {
  console.log("Entering generateStaticParams for [categorySlug]");

  try {
    const res = await axios.get(`${apiUrl}/api/categories?limit=1000&depth=2`);
    const data = await res.data;
    console.log(`Fetched ${data.docs.length} categories for static generation`);

    const params = [];
    for (const category of data.docs) {
      if (!category.parent) {
        params.push({
          categorySlug: category.slug,
        });
        console.log(`Generated path: ${category.slug}`);
      }
    }

    console.log(`Total static params generated: ${params.length}`);
    return params;
  } catch (error) {
    let errorMessage = "";
    if (typeof error === "object" && error !== null) {
      if (
        "response" in error &&
        typeof (error as any).response?.data !== "undefined"
      ) {
        errorMessage = (error as any).response.data;
      } else if (
        "message" in error &&
        typeof (error as any).message === "string"
      ) {
        errorMessage = (error as any).message;
      } else {
        errorMessage = JSON.stringify(error);
      }
    } else {
      errorMessage = String(error);
    }
    console.error("Error generating static params:", errorMessage);
    return [];
  }
}
