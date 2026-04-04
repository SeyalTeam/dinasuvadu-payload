import React from "react";
export const revalidate = 60; // Revalidate every 60 seconds
export const dynamicParams = true;
import type { Metadata } from "next";

import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import "antd/dist/reset.css";
import { notFound, redirect } from "next/navigation";
import ShareButton from "@/components/ShareButton";
import { getPayload } from "payload";
import config from "@/payload.config";
import { buildMetadata } from "@/lib/seo";

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
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";

function getImageUrl(media: any): string | null {
  if (!media) return null;

  let path = typeof media === "string" ? media : media.url;

  if (!path && media.filename) {
    const prefix = media.prefix ? media.prefix : "media";
    const cleanPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
    path = `/${cleanPrefix}${media.filename}`;
  }

  if (!path) return null;
  if (path.startsWith("http")) return path;

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiUrl}${cleanPath}`;
}

const normalizeSlug = (slug: string): string => {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
};

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
  ["post-route-paginated-category-by-slug"],
  { revalidate: 300 }
);

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
  ["post-route-paginated-parent-category"],
  { revalidate: 300 }
);

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
    if (!category) return null;
    return {
      title: category.title || "Uncategorized",
    };
  } catch (err) {
    console.error(`Error fetching category with ID ${categoryId}:`, err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; postSlug: string; page: string }>;
}): Promise<Metadata> {
  const { categorySlug, postSlug, page } = await params;
  const pageNumber = Number.parseInt(page, 10);

  if (!Number.isFinite(pageNumber) || pageNumber < 1) {
    return buildMetadata({
      title: "Category News",
      description: "Explore category news on Dinasuvadu.",
      canonical: `https://www.dinasuvadu.com/${categorySlug}/${postSlug}`,
    });
  }

  const possibleSubCategory = await fetchCategoryBySlug(postSlug);
  if (possibleSubCategory && possibleSubCategory.parent) {
    const title =
      pageNumber > 1
        ? `${possibleSubCategory.title || "Category"} News - Page ${pageNumber} - Dinasuvadu`
        : `${possibleSubCategory.title || "Category"} News - Dinasuvadu`;
    const description = `Read the latest ${possibleSubCategory.title || "category"} news and updates on Dinasuvadu.`;
    const canonical =
      pageNumber > 1
        ? `https://www.dinasuvadu.com/${categorySlug}/${postSlug}/p/${pageNumber}`
        : `https://www.dinasuvadu.com/${categorySlug}/${postSlug}`;
    return buildMetadata({
      title,
      description,
      canonical,
    });
  }

  return buildMetadata({
    title: "Category News",
    description: "Explore category news on Dinasuvadu.",
    canonical: `https://www.dinasuvadu.com/${categorySlug}/${postSlug}`,
  });
}

export default async function SubCategoryPaginatedPage({
  params,
}: {
  params: Promise<{ categorySlug: string; postSlug: string; page: string }>;
}) {
  const { categorySlug, postSlug, page } = await params;
  const pageNumber = Number.parseInt(page, 10);

  if (!Number.isFinite(pageNumber) || pageNumber < 1) {
    notFound();
  }

  if (pageNumber === 1) {
    redirect(`/${categorySlug}/${postSlug}`);
  }

  const limit = 10;
  const pageHref = (value: number): string =>
    value <= 1
      ? `/${categorySlug}/${postSlug}`
      : `/${categorySlug}/${postSlug}/p/${value}`;

  const topLevelCategory = await fetchCategoryBySlug(categorySlug);
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

  const possibleSubCategory = await fetchCategoryBySlug(postSlug);
  if (!possibleSubCategory || !possibleSubCategory.parent) {
    notFound();
  }

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

  const { posts, total } = await fetchPostsByCategory(postSlug, pageNumber, limit);
  const totalPages = Math.ceil(total / limit);

  if (totalPages > 0 && pageNumber > totalPages) {
    redirect(pageHref(totalPages));
  }

  return (
    <div className="site ">
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

      <header className="mb-10 site-main">
        <h1 className="category-title">{subCategoryTitle}</h1>
      </header>

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
                        <p className="post-description">{post.meta.description}</p>
                      )}
                    </Link>
                    <div className="post-meta-footer">
                      <div className="post-meta-left">
                        {Array.isArray(post.tags) &&
                          post.tags.length > 0 &&
                          post.tags[0] && (
                            <Link
                              href={`/tag/${post.tags[0].slug}`}
                              className="category-tag-link"
                            >
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
                    <div
                      className="bg-gray-100 rounded-lg flex items-center justify-center shrink-0"
                      style={{ width: "280px", height: "180px" }}
                    >
                      <span className="text-gray-400 text-sm">No Image</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center space-x-2 mt-8 web-stories-pagination">
              {pageNumber > 1 && (
                <Link href={pageHref(pageNumber - 1)} className="pagination-link">
                  Prev
                </Link>
              )}

              <Link
                href={pageHref(1)}
                className={`pagination-link ${pageNumber === 1 ? "active" : ""}`}
              >
                1
              </Link>

              {pageNumber > 2 && <span className="pagination-ellipsis">…</span>}

              {pageNumber !== 1 && pageNumber !== totalPages && (
                <Link href={pageHref(pageNumber)} className="pagination-link active">
                  {pageNumber}
                </Link>
              )}

              {pageNumber < totalPages - 1 && (
                <span className="pagination-ellipsis">…</span>
              )}

              {totalPages > 1 && (
                <Link
                  href={pageHref(totalPages)}
                  className={`pagination-link ${
                    pageNumber === totalPages ? "active" : ""
                  }`}
                >
                  {totalPages}
                </Link>
              )}

              {pageNumber < totalPages && (
                <Link href={pageHref(pageNumber + 1)} className="pagination-link">
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
