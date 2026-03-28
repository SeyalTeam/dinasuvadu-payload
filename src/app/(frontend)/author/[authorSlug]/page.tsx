export const revalidate = 60;
export const dynamicParams = true;
import axios from "axios";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  categories?: Category[];
  populatedAuthors?: { id: string; name: string; slug: string }[];
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

const getPageNumber = (pageParam: string | string[] | undefined): number => {
  if (Array.isArray(pageParam)) {
    return parseInt(pageParam[0] || "1", 10);
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
      limit: 100,
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
    const payload = await getPayload({ config });
    const res = await payload.findByID({
      collection: "categories",
      id: parentId,
      depth: 1,
    });
    const parentCategory = (res as any) || null;
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
    notFound();
  }

  const { posts, total } = await fetchPostsByAuthor(author.id, page, limit);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="site" style={{ minHeight: "100vh", padding: "20px" }}>
      <div className="site-main" style={{ marginBottom: "40px" }}>
        <h1 className="category-title">
          Author: {author.name}
        </h1>
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-500 text-center">
          No posts found by this author.
        </p>
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
                    postUrl = `/${(parent as any).slug}/${categorySlug}/${post.slug}`;
                  }
                }

                return (
                  <article key={post.id} className="post-item-category">
                    <div className="flex-1">
                      <Link href={postUrl}>
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
                          url={`${baseUrl}${postUrl}`}
                          title={post.title}
                          description={post.meta?.description}
                        />
                      </div>
                    </div>
                    {/* Image */}
                    {imageUrl && imageUrl !== "/placeholder-image.jpg" ? (
                      <Link href={postUrl}>
                        <img
                          src={imageUrl}
                          alt={imageAlt}
                        />
                      </Link>
                    ) : (
                      <div className="bg-gray-100 rounded-lg flex items-center justify-center shrink-0" style={{ width: '280px', height: '180px' }}>
                        <span className="text-gray-400 text-sm">No Image</span>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="web-stories-pagination">
              {page > 1 && (
                <Link
                  href={`/author/${authorSlug}?page=${page - 1}`}
                  className="pagination-link"
                >
                  Prev
                </Link>
              )}
              {[...Array(totalPages)].map((_, i) => {
                const p = i + 1;
                // Simple pagination: show first, last, and current surroundings
                if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
                  return (
                    <Link
                      key={p}
                      href={`/author/${authorSlug}?page=${p}`}
                      className={`pagination-link ${page === p ? "active" : ""}`}
                    >
                      {p}
                    </Link>
                  );
                }
                if (p === 2 || p === totalPages - 1) {
                  return <span key={p} className="pagination-ellipsis">…</span>;
                }
                return null;
              })}
              {page < totalPages && (
                <Link
                  href={`/author/${authorSlug}?page=${page + 1}`}
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

export async function generateStaticParams() {
  const authors = await fetchAuthors();
  return authors
    .filter(a => a.slug)
    .map((author: Author) => ({
      authorSlug: author.slug,
    }));
}
