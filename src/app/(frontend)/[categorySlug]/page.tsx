import axios from "axios";
import Link from "next/link";
// import { Space } from "antd";
// import { ClockCircleOutlined } from "@ant-design/icons";
// import Text from "antd/es/typography/Text";
import "antd/dist/reset.css";
import { notFound } from "next/navigation";
import ShareButton from "@/components/ShareButton";
import { getPayload } from "payload";
import config from "@/payload.config";

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
    const res = await payload.find({
      collection: "categories",
      where: {
        slug: {
          equals: slug,
        },
      },
      depth: 2,
    });
    return (res.docs[0] as unknown as Category) || null;
  } catch (error) {
    console.error(`Error fetching category with slug ${slug}:`, error);
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

              // Correct URL generation logic
              let postLink = `/${categorySlug}/${post.slug}`;
              const primaryCategory = post.categories?.[0];
              if (primaryCategory) {
                if (primaryCategory.parent) {
                  // It's a subcategory, so we need /parent/sub/slug
                  // categorySlug is already the parent in this view's context usually,
                  // but let's be safe and use the actual parent slug if available.
                  const parent = primaryCategory.parent as any;
                  const parentSlug = parent?.slug || categorySlug;
                  postLink = `/${parentSlug}/${primaryCategory.slug}/${post.slug}`;
                } else {
                  // Top level category, but check if it matches current view
                  postLink = `/${primaryCategory.slug}/${post.slug}`;
                }
              }

              return (
                <article
                  key={post.id}
                  className="group block bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300"
                >
                  <div className="post-item-category api-title bor-1">
                    <div className="flex-1 site-main">
                      <Link
                        href={postLink}
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
                            url={`${baseUrl}${postLink}`}
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
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "categories",
      limit: 1000,
      depth: 1,
    });

    const params = [];
    for (const category of res.docs) {
      if (!category.parent) {
        params.push({
          categorySlug: category.slug,
        });
      }
    }
    return params;
  } catch (error) {
    console.error("Error generating static params for [categorySlug]:", error);
    return [];
  }
}
