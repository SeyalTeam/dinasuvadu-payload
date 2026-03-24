import axios from "axios";
import Link from "next/link";
// import { Space } from "antd";
// import { ClockCircleOutlined } from "@ant-design/icons";
// import Text from "antd/es/typography/Text";
import "antd/dist/reset.css"; // Import Ant Design CSS
import ShareButton from "@/components/ShareButton";
import { getPayload } from "payload";
import config from "@/payload.config";

type Author = {
  id: string;
  name: string;
  slug: string;
  bio?: string;
};

type Category = {
  id: string;
  slug: string;
  title?: string;
  parent?: { id: string; slug: string; title: string } | string;
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
  categories?: Category[];
  populatedAuthors?: { id: string; name: string; slug: string }[];
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

function getImageUrl(url: string | undefined): string {
  if (!url) return "/placeholder-image.jpg";
  return url.startsWith("http") ? url : `${apiUrl}${url}`;
}

async function fetchAuthors(): Promise<Author[]> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "users",
      depth: 1,
      limit: 50,
    });
    return (res.docs as unknown as Author[]) || [];
  } catch (err) {
    console.error("Error fetching authors:", err);
    return [];
  }
}

async function fetchAuthorBySlug(slug: string): Promise<Author | null> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "users",
      where: {
        slug: {
          equals: slug,
        },
      },
      depth: 1,
    });
    return (res.docs[0] as unknown as Author) || null;
  } catch (err) {
    console.error(`Error fetching author with slug ${slug}:`, err);
    return null;
  }
}

async function fetchPostsByAuthor(
  authorId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ posts: Post[]; total: number }> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "posts",
      where: {
        authors: {
          contains: authorId,
        },
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
    console.error(`Error fetching posts for author ID ${authorId}:`, err);
    return { posts: [], total: 0 };
  }
}

async function fetchParentCategory(
  parentId: string
): Promise<{ slug: string; title: string } | null> {
  try {
    console.log(`Fetching parent category with ID: ${parentId}`);
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
    console.log(
      `Fetched parent category:`,
      JSON.stringify(parentCategory, null, 2)
    );
    return {
      slug: parentCategory.slug || "uncategorized",
      title: parentCategory.title || "Uncategorized",
    };
  } catch (err) {
    let errorMessage = "";
    if (typeof err === "object" && err !== null) {
      if ("response" in err && (err as any).response?.data) {
        errorMessage = (err as any).response.data;
      } else if ("message" in err) {
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

export default async function AuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ authorSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { authorSlug } = await params;
  const query = await searchParams;
  const page = getPageNumber(query.page);
  const limit = 10;

  const author = await fetchAuthorBySlug(authorSlug);

  if (!author) {
    return (
      <div className="site" style={{ minHeight: "100vh", padding: "20px" }}>
        Author not found. Please check if the author exists or try a different
        slug.
      </div>
    );
  }

  const { posts, total } = await fetchPostsByAuthor(author.id, page, limit);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="site" style={{ minHeight: "100vh", padding: "20px" }}>
      <div className="site-main" style={{ marginBottom: "20px" }}>
        <h1
          className="category-title text-3xl font-bold mb-6"
          style={{ color: "black" }}
        >
          Author: {author.name}
        </h1>
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-500 text-center">
          No posts found by this author.
        </p>
      ) : (
        <>
          <div className="category-grid space-y-6">
            {await Promise.all(
              posts.map(async (post) => {
                // const mediaBlock = post.layout?.find(
                //   (block) => block.blockType === "mediaBlock"
                // );
                const imageUrl = getImageUrl(post.heroImage?.url);
                const imageAlt = post.heroImage?.alt || post.title;

                const category = post.categories?.[0];
                const categorySlug = category?.slug || "uncategorized";
                // const categoryTitle = category?.title || "Uncategorized";

                let postUrl = `/${categorySlug}/${post.slug}`;
                if (category?.parent) {
                  const parent =
                    typeof category.parent === "string"
                      ? await fetchParentCategory(category.parent)
                      : category.parent;
                  if (parent) {
                    postUrl = `/${parent.slug}/${categorySlug}/${post.slug}`;
                  } else {
                    console.warn(
                      `Parent category fetch failed for post ${post.id}, using fallback URL: ${postUrl}`
                    );
                  }
                }

                return (
                  <article
                    key={post.id}
                    className="flex flex-col md:flex-row gap-4 border-b pb-6 hover:bg-gray-50 transition"
                  >
                    <div className="post-item-category bor-1 api-title flex flex-col md:flex-row gap-4">
                      <div className="flex-1 site-main">
                        <Link href={postUrl} className="flex flex-col h-full">
                          <h3 className="post-title-1 text-xl font-semibold mb-2">
                            {post.title}
                          </h3>
                          {post.meta?.description && (
                            <p className="post-description text-gray-600 mb-3">
                              {post.meta.description}
                            </p>
                          )}
                        </Link>
                        <div className="post-first-tag flex items-center gap-3">
                          {Array.isArray(post.tags) && post.tags.length > 0 && post.tags[0] && (
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
                            url={`${baseUrl}${postUrl}`}
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

          {totalPages > 1 && (
            <div className="flex justify-center space-x-2 web-stories-pagination mt-8">
              {page > 1 && (
                <Link
                  href={`/author/${authorSlug}?page=${page - 1}`}
                  className="pagination-link px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                >
                  Prev
                </Link>
              )}
              <Link
                href={`/author/${authorSlug}?page=1`}
                className={`pagination-link px-4 py-2 rounded ${
                  page === 1
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                } transition`}
              >
                1
              </Link>
              {page > 2 && (
                <span className="pagination-ellipsis px-2 py-2">…</span>
              )}
              {page !== 1 && page !== totalPages && (
                <Link
                  href={`/author/${authorSlug}?page=${page}`}
                  className="pagination-link px-4 py-2 bg-indigo-600 text-white rounded"
                >
                  {page}
                </Link>
              )}
              {page < totalPages - 1 && (
                <span className="pagination-ellipsis px-2 py-2">…</span>
              )}
              {totalPages > 1 && (
                <Link
                  href={`/author/${authorSlug}?page=${totalPages}`}
                  className={`pagination-link px-4 py-2 rounded ${
                    page === totalPages
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300"
                  } transition`}
                >
                  {totalPages}
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/author/${authorSlug}?page=${page + 1}`}
                  className="pagination-link px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
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

export async function generateStaticParams() {
  console.log("Entering generateStaticParams for authors/[authorSlug]");
  const authors = await fetchAuthors();
  console.log(`Fetched ${authors.length} authors`);
  const validAuthors = authors.filter((author: Author) => {
    if (!author.slug || typeof author.slug !== "string") {
      console.warn(`Skipping author with invalid slug:`, author);
      return false;
    }
    return true;
  });

  const params = validAuthors.map((author: Author) => ({
    authorSlug: author.slug,
  }));
  console.log(
    `Generated static params for ${params.length} authors:`,
    JSON.stringify(params, null, 2)
  );
  return params;
}
