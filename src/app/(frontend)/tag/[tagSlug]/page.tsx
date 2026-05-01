export const revalidate = 60;
export const dynamicParams = true;
import React from "react";
import type { Metadata } from "next";
import { buildMetadata, buildBreadcrumbLd } from "@/lib/seo";
import { resolvePostPathForContext } from "@/lib/post-url";
import Link from "next/link";
import ShareButton from "@/components/ShareButton";
import { getPayload } from "payload";
import config from "@/payload.config";
import { TagFeed } from "@/components/TagFeed";

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
  categories?: Category[];
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

async function fetchTags(): Promise<Tag[]> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "tags",
      depth: 1,
      limit: 100,
    });
    return (res.docs as unknown as Tag[]) || [];
  } catch (err) {
    console.error("Error fetching tags:", err);
    return [];
  }
}

async function fetchTagBySlug(slug: string): Promise<Tag | null> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "tags",
      where: {
        slug: {
          equals: slug,
        },
      },
      depth: 1,
    });
    return (res.docs[0] as unknown as Tag) || null;
  } catch (err) {
    console.error(`Error fetching tag with slug ${slug}:`, err);
    return null;
  }
}

async function fetchPostsByTag(
  tagId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ posts: Post[]; total: number }> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "posts",
      where: {
        tags: {
          contains: tagId,
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
    console.error(`Error fetching posts for tag ID ${tagId}:`, err);
    return { posts: [], total: 0 };
  }
}async function fetchParentCategory(parentId: string) {
  const payload = await getPayload({ config });
  const res = await payload.findByID({
    collection: "categories",
    id: parentId,
    depth: 1,
  });
  return res || null;
}

export async function generateMetadata({ params }: { params: Promise<{ tagSlug: string }> }): Promise<Metadata> {
  const { tagSlug } = await params;
  const tag = await fetchTagBySlug(tagSlug);
  if (tag) {
    const title = `${tag.name} – Dinasuvadu`;
    const description = `Explore the latest articles tagged with "${tag.name}" on Dinasuvadu.`;
    return buildMetadata({
      title,
      description,
      canonical: `https://www.dinasuvadu.com/tag/${tagSlug}`,
    });
  }
  return { title: "Dinasuvadu - Latest Tamil News" };
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ tagSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tagSlug } = await params;
  const query = await searchParams;
  const page = getPageNumber(query.page);
  const initialListLimit = 12;
  const limit = initialListLimit;

  const tag = await fetchTagBySlug(tagSlug);

  if (!tag) {
    return <div className="site" style={{ padding: '20px' }}>Tag not found</div>;
  }

  const { posts, total } = await fetchPostsByTag(tag.id, page, limit);

  // Sidebar Data: Fetch top parent categories to show in the sidebar
  const payload = await getPayload({ config });
  const topCategoriesRes = await payload.find({
    collection: "categories",
    where: {
      parent: { exists: false },
    },
    limit: 3,
    depth: 1,
  });
  
  const sidebarCategories = topCategoriesRes.docs as any[];
  const sidebarContent = await Promise.all(
    sidebarCategories.map(async (cat) => {
      const { posts: catPosts } = await (payload as any).find({
        collection: "posts",
        where: { categories: { in: [cat.id] } },
        limit: 4,
        sort: "-publishedAt",
        depth: 2,
      });
      return {
        category: cat,
        posts: await Promise.all((catPosts || []).map(async (p: any) => {
          const postLink = `/${cat.slug}/${p.slug}`;
          return { ...p, postLink };
        }))
      };
    })
  );

  return (
    <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: buildBreadcrumbLd([
              { name: "Home", url: "https://www.dinasuvadu.com/" },
              { name: `Tag: ${tag.name}`, url: `https://www.dinasuvadu.com/tag/${tagSlug}` },
            ]),
          }}
        />

      <div className="site">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-4 text-sm font-medium text-gray-500 site">
          <div className="flex items-center space-x-2 breadcrumbs pl-[12px]">
            <Link href="/" className="text-blue-600 hover:text-blue-800 transition-colors">Home</Link>
            <span className="text-gray-400">{">"}</span>
            <span className="text-gray-700">Tag: {tag.name}</span>
          </div>
        </nav>

        <div className="site-main">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
            <div className="lg:col-span-7">
              {posts.length > 0 ? (
                <div className="bg-white dark:bg-[#111] pt-4 px-6 pb-6 md:pt-5 md:px-8 md:pb-8 rounded-2xl shadow-md border border-gray-100 dark:border-gray-800">
                  {/* Unified Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white para-txt">
                      Tag: {tag.name}
                    </h1>
                  </div>

                  <TagFeed 
                    initialPosts={await Promise.all(posts.map(async (post) => {
                      const postLink = await resolvePostPathForContext(
                        post,
                        {},
                        fetchParentCategory as any
                      );
                      return { ...post, postLink };
                    }))}
                    tagId={tag.id}
                    apiUrl={apiUrl}
                  />
                </div>
              ) : (
                <div className="bg-white dark:bg-[#111] p-10 rounded-2xl shadow-md text-center">
                  <p className="text-gray-500">No posts found for this tag.</p>
                </div>
              )}
            </div>

            {/* Right Sidebar for Tags */}
            <div className="lg:col-span-3 space-y-8">
              {sidebarContent.map(({ category: sidebarCat, posts: sidebarPosts }) => {
                if (sidebarPosts.length === 0) return null;
                const featuredPost = sidebarPosts[0];
                const listPosts = sidebarPosts.slice(1);

                return (
                  <div key={sidebarCat.id} className="bg-white dark:bg-[#111] p-5 rounded-2xl shadow-md border border-gray-100 dark:border-gray-800 flex flex-col">
                    <Link href={`/${sidebarCat.slug}`} className="flex items-center justify-between mb-4 hover:opacity-80 transition-opacity">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white para-txt">{sidebarCat.title}</h2>
                      <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
                        </svg>
                      </div>
                    </Link>
                    <div className="mb-4">
                      <Link href={featuredPost.postLink} className="group block">
                        <div className="relative aspect-[16/11] rounded-xl overflow-hidden mb-2 border border-gray-100 dark:border-gray-800">
                          <img
                            src={featuredPost.heroImage?.url ? (featuredPost.heroImage.url.startsWith("http") ? featuredPost.heroImage.url : `${apiUrl}${featuredPost.heroImage.url}`) : "/placeholder-news.jpg"}
                            alt={featuredPost.title}
                            className="object-cover transition-transform duration-500 group-hover:scale-105 w-full h-full"
                          />
                        </div>
                        <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 para-txt group-hover:text-blue-600 transition-colors">
                          {featuredPost.title}
                        </h3>
                      </Link>
                    </div>
                    <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                      {listPosts.map((post: any) => (
                        <Link key={post.id} href={post.postLink} className="group flex gap-3 items-start">
                          <div className="relative w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800">
                            <img
                              src={post.heroImage?.url ? (post.heroImage.url.startsWith("http") ? post.heroImage.url : `${apiUrl}${post.heroImage.url}`) : "/placeholder-news.jpg"}
                              alt={post.title}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <h4 className="text-[13px] font-bold text-gray-800 dark:text-gray-200 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors para-txt">
                            {post.title}
                          </h4>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export async function generateStaticParams() {
  try {
    const tags = await fetchTags();
    return tags
      .filter(tag => tag.slug)
      .map((tag: Tag) => ({
        tagSlug: tag.slug,
      }));
  } catch (err) {
    console.error("Error generating static params for tags:", err);
    return [];
  }
}
