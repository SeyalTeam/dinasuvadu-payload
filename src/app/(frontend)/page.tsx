export const revalidate = 60; // Keep news discovery surfaces fresh for crawlers
import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";
import config from "@/payload.config";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { resolveCanonicalPostPath, resolvePostPathForContext } from "@/lib/post-url";

// Type definitions
type Category = {
  id: string;
  title: string;
  slug: string;
  parent?: { id: string; slug: string; title: string } | string;
};

type Post = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  author?: string;
  categories?: Category[];
  heroImage?: {
    url: string;
    alt?: string;
  };
  layout?: {
    blockType: string;
    media?: {
      url: string;
      alt?: string;
    };
  }[];
  meta?: {
    description?: string;
  };
  tags?: { id: string; title: string; slug: string }[];
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

async function fetchCategoriesRaw(): Promise<Category[]> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "categories",
      limit: 100,
      depth: 2,
    });
    return (res.docs as unknown as Category[]) || [];
  } catch (err) {
    console.error("Error fetching categories:", err);
    return [];
  }
}

const fetchCategories = () =>
  unstable_cache(fetchCategoriesRaw, ["homepage-categories"], {
    revalidate: 300,
    tags: ["homepage-categories"],
  })();

async function fetchLatestPostsRaw(): Promise<Post[]> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "posts",
      limit: 34,
      depth: 2,
      sort: "-publishedAt",
      where: {
        _status: {
          equals: "published",
        },
      },
    });
    return (res.docs as unknown as Post[]) || [];
  } catch (err) {
    console.error("Error fetching latest posts:", err);
    return [];
  }
}

const fetchLatestPosts = () =>
  unstable_cache(fetchLatestPostsRaw, ["homepage-latest-posts"], {
    revalidate: 60,
    tags: ["homepage-latest-posts", "published-posts"],
  })();

async function fetchPostsByCategoryRaw(categoryId: string): Promise<Post[]> {
  try {
    const payload = await getPayload({ config });

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

    const childIds = childrenRes.docs.map((c: { id: string }) => c.id);
    const allCategoryIds = [categoryId, ...childIds];

    const res = await payload.find({
      collection: "posts",
      limit: 10,
      depth: 2,
      sort: "-publishedAt",
      where: {
        and: [
          {
            categories: {
              in: allCategoryIds,
            },
          },
          {
            _status: {
              equals: "published",
            },
          },
        ],
      },
    });
    return (res.docs as unknown as Post[]) || [];
  } catch (err) {
    console.error(`Error fetching posts for category ID ${categoryId}:`, err);
    return [];
  }
}

const fetchPostsByCategory = (categoryId: string) =>
  unstable_cache(
    async () => fetchPostsByCategoryRaw(categoryId),
    ["homepage-category-posts", categoryId],
    {
      revalidate: 60,
      tags: [
        "homepage-category-posts",
        `homepage-category-posts-${categoryId}`,
        "published-posts",
      ],
    }
  )();

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

// Define the clamping style
const clampStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
  textOverflow: "ellipsis",
  lineHeight: "1.4",
};

// Shared post URL resolver used across listings.
async function getPostUrl(
  post: Post,
  context?: { topLevelSlug?: string; subCategorySlug?: string }
): Promise<string> {
  if (context?.topLevelSlug || context?.subCategorySlug) {
    return resolvePostPathForContext(post, context, fetchParentCategory);
  }

  return resolveCanonicalPostPath(post, fetchParentCategory);
}

// Helper function to get the image URL with proper base URL
function getImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${apiUrl}${url}`;
}

// Helper function for time ago formatting
function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Dinasuvadu - Latest Tamil News, Cinema, Politics & Sports",
    description: "Dinasuvadu is your leading source for breaking Tamil news, insightful analysis, and the latest updates on cinema, politics, sports, and world news from Tamil Nadu and across the globe. Stay informed with our real-time news coverage.",
    canonical: "https://www.dinasuvadu.com/",
  });
}

export default async function Home() {
  const payload = await getPayload({ config });
  const homepageSettings = await payload.findGlobal({
    slug: 'homepage-settings',
    depth: 2,
  }) as { categories?: (string | Category)[] };

  let sortedCategories: Category[] = [];

  if (homepageSettings.categories && homepageSettings.categories.length > 0) {
    sortedCategories = homepageSettings.categories
      .map((c) => (typeof c === "string" ? null : c))
      .filter(Boolean) as Category[];
  } else {
    const allCategories = await fetchCategories();
    const categories = allCategories.filter((category) => {
      if (!category.parent) return true;
      const parent = typeof category.parent === "string" ? null : category.parent;
      if (parent && parent.slug === "news") return true;
      return false;
    });

    const categoryOrder: { [key: string]: number } = {
      செய்திகள்: 0,
      தமிழ்நாடு: 1,
      இந்தியா: 2,
      உலகம்: 3,
    };

    sortedCategories = [...categories].sort((a, b) => {
      const orderA = categoryOrder[a.title] ?? 999;
      const orderB = categoryOrder[b.title] ?? 999;
      if (orderA !== 999 && orderB !== 999) return orderA - orderB;
      if (orderA !== 999) return -1;
      if (orderB !== 999) return 1;
      return categories.indexOf(b) - categories.indexOf(a);
    });
  }

  const latestPosts = await fetchLatestPosts();

  const postsByCategoryId = new Map(
    await Promise.all(
      sortedCategories.map(async (category) => {
        const posts = await fetchPostsByCategory(category.id);
        return [category.id, posts] as const;
      })
    )
  );

  const featuredPost = latestPosts.length > 0 ? latestPosts[0] : null;
  const smallerPosts = latestPosts.length > 1 ? latestPosts.slice(1, 4) : [];
  const nextFivePosts = latestPosts.length > 4 ? latestPosts.slice(4, 9) : [];
  const additionalPosts = latestPosts.length > 9 ? latestPosts.slice(9, 34) : [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Dinasuvadu",
            "url": "https://www.dinasuvadu.com/",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://www.dinasuvadu.com/search?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Dinasuvadu",
            "url": "https://www.dinasuvadu.com/",
            "logo": "https://www.dinasuvadu.com/logo.png",
            "sameAs": [
              "https://www.facebook.com/dinasuvadu",
              "https://twitter.com/dinasuvadu",
              "https://www.instagram.com/dinasuvadu"
            ]
          })
        }}
      />
    <div className="site">
      {/* Mobile-Only Redesign Feed */}
      <div className="md:hidden pt-2 bg-white px-4">
        {/* First Post */}
        {latestPosts[0] && (
          <div className="mb-4 border-b border-gray-100 pb-4">
            <Link 
              href={await getPostUrl(latestPosts[0])} 
              className="block group"
            >
              <div className="relative w-full h-[240px] rounded-2xl overflow-hidden mb-5">
                <Image
                  alt={latestPosts[0].heroImage?.alt || latestPosts[0].title}
                  src={getImageUrl(latestPosts[0].heroImage?.url) || "/placeholder-news.jpg"}
                  fill
                  className="object-cover shadow-sm"
                  priority
                  fetchPriority="high"
                />
              </div>
              <h3 
                className="text-[24px] font-black leading-[1.2] text-[#111] px-1 line-clamp-3 tracking-tight para-txt"
              >
                {latestPosts[0].title}
              </h3>
            </Link>
          </div>
        )}

        {/* Next Posts List */}
        <div className="space-y-0">
          {await Promise.all(
            latestPosts.slice(1, 10).map(async (post) => (
              <Link 
                key={post.id} 
                href={await getPostUrl(post)} 
                className="block py-5 border-b border-gray-200 last:border-0"
              >
                <div className="flex gap-4 items-start">
                  <div className="relative w-32 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-50 shadow-sm">
                    <Image
                      alt={post.heroImage?.alt || post.title}
                      src={getImageUrl(post.heroImage?.url) || "/placeholder-news.jpg"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h3 className="text-[17px] font-extrabold text-[#222] line-clamp-3 leading-[1.35] tracking-tight para-txt">
                      {post.title}
                    </h3>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Mobile Category Sections */}
        {await Promise.all(
          sortedCategories.map(async (category) => {
            const posts = postsByCategoryId.get(category.id) ?? [];
            if (posts.length === 0) return null;

            let categoryLink = `/${category.slug}`;
            if (category.parent) {
              const parent = typeof category.parent === "string" ? await fetchParentCategory(category.parent) : category.parent;
              if (parent) {
                categoryLink = `/${parent.slug}/${category.slug}`;
              }
            }

            return (
              <section key={category.slug} className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                <Link href={categoryLink} className="flex items-center justify-between mb-5 px-1">
                  <h2 className="text-[20px] font-black text-[#111] dark:text-white uppercase tracking-tight para-txt">{category.title}</h2>
                  <span className="text-blue-600 text-[14px] font-bold uppercase">மேலும் படிக்க ›</span>
                </Link>

                {posts[0] && (
                  <div className="mb-4 border-b border-gray-100 dark:border-gray-800 pb-6">
                    <Link href={await getPostUrl(posts[0])} className="block group">
                      <div className="relative w-full h-[240px] rounded-2xl overflow-hidden mb-5 shadow-sm">
                        <Image
                          alt={posts[0].heroImage?.alt || posts[0].title}
                          src={getImageUrl(posts[0].heroImage?.url) || "/placeholder-news.jpg"}
                          fill
                          className="object-cover shadow-sm"
                        />
                      </div>
                      <h3 className="text-[24px] font-black leading-[1.2] text-[#111] dark:text-white px-1 line-clamp-3 tracking-tight para-txt">
                        {posts[0].title}
                      </h3>
                    </Link>
                  </div>
                )}

                <div className="space-y-0">
                  {await Promise.all(
                    posts.slice(1, 10).map(async (post) => (
                      <Link 
                        key={post.id} 
                        href={await getPostUrl(post)} 
                        className="block py-5 border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <div className="flex gap-4 items-start">
                          <div className="relative w-32 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 shadow-sm">
                            <Image
                              alt={post.heroImage?.alt || post.title}
                              src={getImageUrl(post.heroImage?.url) || "/placeholder-news.jpg"}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 pt-0.5">
                            <h3 className="text-[17px] font-extrabold text-[#222] dark:text-gray-100 line-clamp-3 leading-[1.35] tracking-tight para-txt">
                              {post.title}
                            </h3>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        {/* Latest News Grid */}
        {(featuredPost || smallerPosts.length > 0) && (
          <section className="mb-8 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {featuredPost && (
                <Link href={await getPostUrl(featuredPost)} className="block group w-full h-[260px] md:h-[280px] md:col-span-2 lg:col-span-2">
                  <div className="relative w-full h-full rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800">
                    <Image
                      alt={featuredPost.heroImage?.alt || featuredPost.title}
                      src={getImageUrl(featuredPost.heroImage?.url) || "/placeholder-news.jpg"}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      priority
                      fetchPriority="high"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 z-20 text-white md:p-6">
                      <div className="flex items-center gap-2 mb-3">
                         <span className="text-sm font-medium text-gray-200">{featuredPost.categories?.[0]?.title || "News"}</span>
                         <span className="text-sm text-gray-400">•</span>
                         <span className="text-sm text-gray-300">{timeAgo(featuredPost.publishedAt)}</span>
                      </div>
                      <div className="text-[22px] md:text-[24px] font-bold leading-tight mb-4 line-clamp-3 text-white shadow-sm para-txt">
                        {featuredPost.title}
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {await Promise.all(
                smallerPosts.map(async (post) => (
                  <Link href={await getPostUrl(post)} className="block group w-full h-[260px] md:h-[280px] lg:col-span-1" key={post.id}>
                    <div className="flex flex-col w-full h-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                      <div className="relative w-full h-[45%] md:h-[48%] overflow-hidden bg-gray-100 dark:bg-gray-900 shrink-0">
                        <Image
                          alt={post.heroImage?.alt || post.title}
                          src={getImageUrl(post.heroImage?.url) || "/placeholder-news.jpg"}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex flex-col flex-1 p-3 md:p-4 transition-colors">
                        <div className="flex items-center gap-1.5 mb-2">
                           <span className="text-[11px] md:text-xs font-medium text-gray-700 dark:text-gray-300">{post.categories?.[0]?.title || "News"}</span>
                           <span className="text-[11px] md:text-xs text-gray-400">•</span>
                           <span className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">{timeAgo(post.publishedAt)}</span>
                        </div>
                        <div className="text-[14px] md:text-[15px] font-bold leading-snug mb-auto text-gray-900 dark:text-gray-100 line-clamp-3 para-txt">
                          {post.title}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        )}

        {/* 5 Additional Posts Section */}
        {nextFivePosts.length > 0 && (
          <section className="mb-10">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {await Promise.all(
                nextFivePosts.map(async (post) => (
                  <Link href={await getPostUrl(post)} className="block group w-full h-[260px] md:h-[280px]" key={post.id}>
                    <div className="flex flex-col w-full h-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                      <div className="relative w-full h-[45%] md:h-[48%] overflow-hidden bg-gray-100 dark:bg-gray-900 shrink-0">
                        <Image
                          alt={post.heroImage?.alt || post.title}
                          src={getImageUrl(post.heroImage?.url) || "/placeholder-news.jpg"}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex flex-col flex-1 p-3 md:p-4 transition-colors">
                        <div className="flex items-center gap-1.5 mb-2">
                           <span className="text-[11px] md:text-xs font-medium text-gray-700 dark:text-gray-300">{post.categories?.[0]?.title || "News"}</span>
                           <span className="text-[11px] md:text-xs text-gray-400">•</span>
                           <span className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">{timeAgo(post.publishedAt)}</span>
                        </div>
                        <div className="text-[14px] md:text-[15px] font-bold leading-snug mb-auto text-gray-900 dark:text-gray-100 line-clamp-3 para-txt">
                          {post.title}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        )}


        {/* Category-Based Grid Sections */}
        {sortedCategories.length > 0 && (
          await Promise.all(
            sortedCategories.map(async (category) => {
              const posts = postsByCategoryId.get(category.id) ?? [];
              if (posts.length === 0) return null;

              const categoryFeaturedPost = posts.length > 0 ? posts[0] : null;
              const categorySmallerPosts1 = posts.length > 1 ? posts.slice(1, 4) : [];
              const categorySmallerPosts2 = posts.length > 4 ? posts.slice(4, 7) : [];

              let categoryLink = `/${category.slug}`;
              let contextTopLevelSlug = category.slug;
              let contextSubCategorySlug: string | undefined;
              if (category.parent) {
                const parent = typeof category.parent === "string" ? await fetchParentCategory(category.parent) : category.parent;
                if (parent) {
                  const parentCategorySlug = parent.slug || "uncategorized";
                  categoryLink = `/${parentCategorySlug}/${category.slug}`;
                  contextTopLevelSlug = parentCategorySlug;
                  contextSubCategorySlug = category.slug;
                }
              }

              return (
                <section key={category.slug} className="mb-12">
                  <div className="flex items-center justify-between mb-8">
                    <Link href={categoryLink} className="group">
                      <h2 className="text-2xl md:text-[28px] font-black text-[#111] dark:text-white border-l-[5px] border-[#045de9] pl-4 hover:text-[#045de9] transition-colors para-txt leading-none">
                        {category.title}
                      </h2>
                    </Link>
                    <Link href={categoryLink} className="text-[#045de9] text-sm font-bold uppercase tracking-wide hover:underline">
                      மேலும் படிக்க ›
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Featured Column */}
                    {categoryFeaturedPost && (
                      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
                        <Link
                          href={await getPostUrl(categoryFeaturedPost, {
                            topLevelSlug: contextTopLevelSlug,
                            subCategorySlug: contextSubCategorySlug,
                          })}
                          className="flex flex-col h-full"
                        >
                          <div className="relative aspect-video overflow-hidden">
                            {(() => {
                              const imageUrl = getImageUrl(categoryFeaturedPost.heroImage?.url);
                              const imageAlt = categoryFeaturedPost.heroImage?.alt || categoryFeaturedPost.title;
                              return imageUrl ? (
                                <Image alt={imageAlt} src={imageUrl} fill className="object-cover transition-transform duration-500 hover:scale-105" />
                              ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No Image</div>
                              );
                            })()}
                          </div>
                          <div className="p-4 flex flex-col flex-1">
                            <h3 className="text-[20px] font-black text-gray-900 dark:text-white leading-[1.3] mb-4 line-clamp-3 para-txt hover:text-[#045de9] transition-colors">
                              {categoryFeaturedPost.title}
                            </h3>
                            <span className="text-[11px] font-medium text-gray-400 mt-auto">
                              {timeAgo(categoryFeaturedPost.publishedAt)}
                            </span>
                          </div>
                        </Link>
                      </div>
                    )}

                    {/* List 1 Column */}
                    {categorySmallerPosts1.length > 0 && (
                      <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        {await Promise.all(categorySmallerPosts1.map(async (post) => {
                          const imageUrl = getImageUrl(post.heroImage?.url);
                          const imageAlt = post.heroImage?.alt || post.title;
                          const postUrl = await getPostUrl(post, {
                            topLevelSlug: contextTopLevelSlug,
                            subCategorySlug: contextSubCategorySlug,
                          });

                          return (
                            <Link key={post.id} href={postUrl} className="group flex gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                              <div className="relative w-32 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                                {imageUrl ? (
                                  <Image alt={imageAlt} src={imageUrl} fill className="object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">No Image</div>
                                )}
                              </div>
                              <div className="flex flex-col flex-1 min-w-0 py-0.5">
                                <h4 className="text-[15px] font-extrabold text-gray-900 dark:text-gray-100 leading-[1.3] line-clamp-2 mb-2 para-txt group-hover:text-[#045de9] transition-colors">
                                  {post.title}
                                </h4>
                                <span className="text-[11px] font-medium text-gray-400 mt-auto">
                                  {timeAgo(post.publishedAt)}
                                </span>
                              </div>
                            </Link>
                          );
                        }))}
                      </div>
                    )}

                    {/* List 2 Column */}
                    {categorySmallerPosts2.length > 0 && (
                      <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        {await Promise.all(categorySmallerPosts2.map(async (post) => {
                          const imageUrl = getImageUrl(post.heroImage?.url);
                          const imageAlt = post.heroImage?.alt || post.title;
                          const postUrl = await getPostUrl(post, {
                            topLevelSlug: contextTopLevelSlug,
                            subCategorySlug: contextSubCategorySlug,
                          });

                          return (
                            <Link key={post.id} href={postUrl} className="group flex gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                              <div className="relative w-32 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                                {imageUrl ? (
                                  <Image alt={imageAlt} src={imageUrl} fill className="object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">No Image</div>
                                )}
                              </div>
                              <div className="flex flex-col flex-1 min-w-0 py-0.5">
                                <h4 className="text-[15px] font-extrabold text-gray-900 dark:text-gray-100 leading-[1.3] line-clamp-2 mb-2 para-txt group-hover:text-[#045de9] transition-colors">
                                  {post.title}
                                </h4>
                                <span className="text-[11px] font-medium text-gray-400 mt-auto">
                                  {timeAgo(post.publishedAt)}
                                </span>
                              </div>
                            </Link>
                          );
                        }))}
                      </div>
                    )}
                  </div>
                </section>
              );
            })
          )
        )}
      </div>
    </div>
    </>
  );
}
