export const revalidate = 10; // Revalidate every 60 seconds
import Link from "next/link";
import { Row, Col, Card, Space } from "antd";
import "antd/dist/reset.css";
// import { ClockCircleOutlined } from '@ant-design/icons';
import Text from "antd/es/typography/Text";
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

// Fetch categories
async function fetchCategories(): Promise<Category[]> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "categories",
      limit: 100,
      depth: 2,
    });
    const categories = (res.docs as unknown as Category[]) || [];
    console.log("Fetched categories:", categories.length);
    return categories;
  } catch (err) {
    console.error("Error fetching categories:", err);
    return [];
  }
}

// Fetch latest posts
async function fetchLatestPosts(): Promise<Post[]> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "posts",
      limit: 34,
      depth: 2,
      sort: "-publishedAt",
    });
    const posts = (res.docs as unknown as Post[]) || [];
    console.log("Fetched latest posts:", posts.length);
    return posts;
  } catch (err) {
    console.error("Error fetching latest posts:", err);
    return [];
  }
}

// Fetch posts by category
async function fetchPostsByCategory(categoryId: string): Promise<Post[]> {
  try {
    const payload = await getPayload({ config });

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

    const res = await payload.find({
      collection: "posts",
      limit: 7,
      depth: 2,
      sort: "-publishedAt",
      where: {
        categories: {
          in: allCategoryIds,
        },
      },
    });
    console.log(`Fetched ${res.docs.length} posts for category ID ${categoryId} (including children)`);
    return (res.docs as unknown as Post[]) || [];
  } catch (err) {
    console.error(`Error fetching posts for category ID ${categoryId}:`, err);
    return [];
  }
}

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
    if (!parentCategory) {
      console.log(`No parent category found for ID: ${parentId}`);
      return null;
    }
    console.log(`Fetched parent category for ID ${parentId}:`, parentCategory.title);
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
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo`;
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y`;
}

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Dinasuvadu - Latest Tamil News, Cinema, Politics & Sports",
    description: "Dinasuvadu is your leading source for breaking Tamil news, insightful analysis, and the latest updates on cinema, politics, and sports from Tamil Nadu and across the globe.",
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
    // Use the explicitly ordered categories from the CMS
    sortedCategories = homepageSettings.categories
      .map((c) => (typeof c === "string" ? null : c))
      .filter(Boolean) as Category[];
  } else {
    // Fallback if the CMS global is empty
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

  const featuredPost = latestPosts.length > 0 ? latestPosts[0] : null;
  const smallerPosts = latestPosts.length > 1 ? latestPosts.slice(1, 4) : [];
  const nextFivePosts = latestPosts.length > 4 ? latestPosts.slice(4, 9) : [];
  const additionalPosts = latestPosts.length > 9 ? latestPosts.slice(9, 34) : [];

  console.log(
    "Sorted categories:",
    sortedCategories.map((cat) => cat.title)
  );

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
        {/* First Post: Image Top, Title Bottom */}
        {latestPosts[0] && (
          <div className="mb-8 border-b-2 border-gray-100 pb-8">
            <Link 
              href={await getPostUrl(latestPosts[0])} 
              className="block group"
            >
              <div className="relative w-full h-[240px] rounded-2xl overflow-hidden mb-5">
                <img
                  alt={latestPosts[0].heroImage?.alt || latestPosts[0].title}
                  src={getImageUrl(latestPosts[0].heroImage?.url) || ""}
                  className="w-full h-full object-cover shadow-sm"
                />
              </div>
              <h3 
                className="text-[24px] font-black leading-[1.2] text-[#111] px-1"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  letterSpacing: "-0.5px"
                }}
              >
                {latestPosts[0].title}
              </h3>
            </Link>
          </div>
        )}

        {/* Next Posts: Image Left, Title Right List */}
        <div className="space-y-0">
          {await Promise.all(
            latestPosts.slice(1, 12).map(async (post) => (
              <Link 
                key={post.id} 
                href={await getPostUrl(post)} 
                className="block py-5 border-b border-gray-200 last:border-0"
              >
                <div className="flex gap-4 items-start">
                  <div className="w-32 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-50 shadow-sm">
                    <img
                      alt={post.heroImage?.alt || post.title}
                      src={getImageUrl(post.heroImage?.url) || ""}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h3 className="text-[17px] font-extrabold text-[#222] line-clamp-3 leading-[1.35] tracking-tight">
                      {post.title}
                    </h3>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="hidden md:block">
      {/* Latest News Section */}
      {(featuredPost || smallerPosts.length > 0) && (
        <section className="mb-8 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Featured Post */}
            {featuredPost && (
              <Link href={await getPostUrl(featuredPost)} className="block group w-full h-[260px] md:h-[280px] md:col-span-2 lg:col-span-2">
                <div className="relative w-full h-full rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800">
                  <img
                    alt={featuredPost.heroImage?.alt || featuredPost.title}
                    src={getImageUrl(featuredPost.heroImage?.url) || ""}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 z-20 text-white md:p-6">
                    <div className="flex items-center gap-2 mb-3">
                       <span className="text-sm font-medium text-gray-200 drop-shadow-md">{featuredPost.categories?.[0]?.title || "News"}</span>
                       <span className="text-sm text-gray-400">•</span>
                       <span className="text-sm text-gray-300 shadow-sm">{timeAgo(featuredPost.publishedAt)}</span>
                    </div>
                    <div
                      className="text-[19px] md:text-[22px] lg:text-[24px] font-bold leading-tight mb-4"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textShadow: "0 2px 4px rgba(0,0,0,0.5)"
                      }}
                    >
                      {featuredPost.title}
                    </div>

                  </div>
                </div>
              </Link>
            )}

            {/* Cards 2, 3, 4: Smaller Posts */}
            {await Promise.all(
              smallerPosts.map(async (post) => (
                <Link href={await getPostUrl(post)} className="block group w-full h-[260px] md:h-[280px] lg:col-span-1" key={post.id}>
                  <div className="flex flex-col w-full h-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                    <div className="relative w-full h-[45%] md:h-[48%] overflow-hidden bg-gray-100 dark:bg-gray-900 shrink-0">
                      <img
                        alt={post.heroImage?.alt || post.title}
                        src={getImageUrl(post.heroImage?.url) || ""}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-col flex-1 p-3 md:p-4 bg-white dark:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-1.5 mb-2">
                         <span className="text-[11px] md:text-xs font-medium text-gray-700 dark:text-gray-300">{post.categories?.[0]?.title || "News"}</span>
                         <span className="text-[11px] md:text-xs text-gray-400 dark:text-gray-600">•</span>
                         <span className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">{timeAgo(post.publishedAt)}</span>
                      </div>
                      <div
                        className="text-[14px] md:text-[15px] font-bold leading-snug mb-auto text-gray-900 dark:text-gray-100"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
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

      {/* 5 Additional Grid Posts Section */}
      {nextFivePosts.length > 0 && (
        <section className="mb-10 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {await Promise.all(
              nextFivePosts.map(async (post) => (
                <Link href={await getPostUrl(post)} className="block group w-full h-[260px] md:h-[280px]" key={post.id}>
                  <div className="flex flex-col w-full h-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                    <div className="relative w-full h-[45%] md:h-[48%] overflow-hidden bg-gray-100 dark:bg-gray-900 shrink-0">
                      <img
                        alt={post.heroImage?.alt || post.title}
                        src={getImageUrl(post.heroImage?.url) || ""}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-col flex-1 p-3 md:p-4 bg-white dark:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-1.5 mb-2">
                         <span className="text-[11px] md:text-xs font-medium text-gray-700 dark:text-gray-300">{post.categories?.[0]?.title || "News"}</span>
                         <span className="text-[11px] md:text-xs text-gray-400 dark:text-gray-600">•</span>
                         <span className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">{timeAgo(post.publishedAt)}</span>
                      </div>
                      <div
                        className="text-[14px] md:text-[15px] font-bold leading-snug mb-auto text-gray-900 dark:text-gray-100"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
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

      {/* Additional Posts Section */}
      {additionalPosts.length > 0 && (
        <section
          className="latest-posts-grid mob-50"
          style={{ marginTop: "30px" }}
        >
          <div className="category-grid">
            {await Promise.all(
              additionalPosts.map(async (post) => {
                const imageUrl = getImageUrl(post.heroImage?.url);
                const imageAlt = post.heroImage?.alt || post.title;

                return (
                  <div
                    key={post.id}
                    className="flex flex-col md:flex-row gap-4 border-b pb-6 hover:bg-gray-50 transition"
                    style={{
                      borderBottom: "1px solid #ccc",
                      paddingBottom: "20px",
                    }}
                  >
                    <Link
                      href={await getPostUrl(post)}
                      className="flex flex-col md:flex-row flex-1"
                    >
                      {imageUrl ? (
                        <div
                          className="relative w-full md:w-48 h-48 overflow-hidden rounded-t-lg md:rounded-lg"
                          style={{ padding: "0 20px" }}
                        >
                          <img
                            src={imageUrl}
                            alt={imageAlt}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            style={{ borderRadius: "10px" }}
                          />
                        </div>
                      ) : (
                        <div className="w-full md:w-48 h-48 bg-gray-100 rounded-t-lg md:rounded-lg flex items-center justify-content-center">
                          <span className="text-gray-400 text-sm">
                            No Image
                          </span>
                        </div>
                      )}
                      <article
                        className="flex flex-col h-full flex-1"
                        style={{ padding: "0 20px" }}
                      >
                        <div className="post-item-category api-title">
                          <div className="flex-1">
                            <h3 className="latest-post-title">
                              {post.title || "Untitled Post"}
                            </h3>
                          </div>
                        </div>
                      </article>
                    </Link>
                    <div
                      className="flex flex-col h-full flex-1"
                      style={{ padding: "0 20px" }}
                    >
                      <div className="post-first-tag">
                        {/* Define categoryLink for additionalPosts section */}
                        {(() => {
                          let categoryLink = "/uncategorized";
                          let categoryTitle = "Uncategorized";
                          if (post.categories && post.categories.length > 0) {
                            const cat = post.categories[0];
                            if (cat) {
                              categoryLink = `/${cat.slug}`;
                              categoryTitle = cat.title || "Uncategorized";
                              if (cat.parent) {
                                const parent =
                                  typeof cat.parent === "string"
                                    ? null
                                    : cat.parent;
                                if (parent) {
                                  categoryLink = `/${parent.slug}/${cat.slug}`;
                                }
                              }
                            }
                          }
                          return (
                            <Link href={categoryLink}>
                              <h2 className="home-category">{categoryTitle}</h2>
                            </Link>
                          );
                        })()}

                        {/* <span style={{ marginTop: "4px", marginLeft: ((post.tags ?? []).length > 0 ? "8px" : "0") }}>
                    <Space size={4}>
                      <ClockCircleOutlined style={{ fontSize: "12px", color: "#8c8c8c" }} />
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        5 Min Read
                      </Text>
                    </Space>
                  </span> */}
                        <span
                          className="shareButton"
                          data-url=""
                          style={{ marginLeft: "8px" }}
                        >
                          <svg
                            width="22"
                            height="18"
                            viewBox="0 0 22 18"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <g clipPath="url(#clip0_4600_28)">
                              <path
                                d="M0.656855 18.3763C0.57123 18.3767 0.486122 18.363 0.40498 18.3356C0.235292 18.2805 0.088454 18.1711 -0.0128684 18.0243C-0.114191 17.8774 -0.164364 17.7013 -0.155645 17.5231C-0.155645 17.4013 0.68123 5.60375 12.5112 4.6775V0.436251C12.5111 0.274716 12.5591 0.116806 12.6491 -0.0173126C12.7392 -0.151431 12.8671 -0.255668 13.0167 -0.316712C13.1662 -0.377755 13.3306 -0.392834 13.4888 -0.360022C13.6469 -0.32721 13.7917 -0.247996 13.9047 -0.132499L21.924 8.0575C22.0729 8.20938 22.1563 8.41358 22.1563 8.62625C22.1563 8.83893 22.0729 9.04312 21.924 9.195L13.9047 17.385C13.7917 17.5005 13.6469 17.5797 13.4888 17.6125C13.3306 17.6453 13.1662 17.6303 13.0167 17.5692C12.8671 17.5082 12.7392 17.4039 12.6491 17.2698C12.5591 17.1357 12.5111 16.9778 12.5112 16.8163V12.6563C4.61373 12.9569 1.37592 17.9375 1.34342 17.9984C1.27012 18.1142 1.16873 18.2095 1.0487 18.2756C0.928659 18.3416 0.793867 18.3763 0.656855 18.3763ZM14.1362 2.42688V5.43719C14.1364 5.64784 14.0547 5.85031 13.9084 6.00189C13.7621 6.15347 13.5627 6.24232 13.3522 6.24969C5.69842 6.53 2.96029 11.6284 1.97717 14.9069C4.00842 13.1519 7.6281 11.0069 13.275 11.0069H13.3115C13.527 11.0069 13.7337 11.0925 13.8861 11.2449C14.0384 11.3972 14.124 11.6039 14.124 11.8194V14.8297L20.2178 8.63031L14.1362 2.42688Z"
                                fill="#A0A0A0"
                              ></path>
                            </g>
                            <defs>
                              <clipPath id="clip0_4600_28">
                                <rect
                                  width="22"
                                  height="18"
                                  fill="white"
                                ></rect>
                              </clipPath>
                            </defs>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* Category-Based Sections */}
      {sortedCategories.length === 0 ? (
        <Text>No categories found.</Text>
      ) : (
        await Promise.all(
          sortedCategories.map(async (category) => {
            const posts = await fetchPostsByCategory(category.id);
            if (posts.length === 0) return null;

            const categoryFeaturedPost = posts.length > 0 ? posts[0] : null;
            const categorySmallerPosts1 =
              posts.length > 1 ? posts.slice(1, 4) : [];
            const categorySmallerPosts2 =
              posts.length > 4 ? posts.slice(4, 7) : [];

            if (
              !categoryFeaturedPost &&
              categorySmallerPosts1.length === 0 &&
              categorySmallerPosts2.length === 0
            )
              return null;

            let categoryLink = `/${category.slug}`;
            let contextTopLevelSlug = category.slug;
            let contextSubCategorySlug: string | undefined;
            if (category.parent) {
              const parent =
                typeof category.parent === "string"
                  ? await fetchParentCategory(category.parent)
                  : category.parent;
              if (parent) {
                const parentCategorySlug = parent.slug || "uncategorized";
                categoryLink = `/${parentCategorySlug}/${category.slug}`;
                contextTopLevelSlug = parentCategorySlug;
                contextSubCategorySlug = category.slug;
              }
            }

            return (
              <section key={category.slug} className="home-cate">
                <Link href={categoryLink}>
                  <h2 className="category-title para-txt">{category.title}</h2>
                </Link>
                <Row className="row-03">
                  {categoryFeaturedPost && (
                    <Col className="col-md-3">
                      <Link
                        href={await getPostUrl(categoryFeaturedPost, {
                          topLevelSlug: contextTopLevelSlug,
                          subCategorySlug: contextSubCategorySlug,
                        })}
                      >
                        <div>
                          {(() => {
                            const imageUrl = getImageUrl(
                              categoryFeaturedPost.heroImage?.url
                            );
                            const imageAlt =
                              categoryFeaturedPost.heroImage?.alt ||
                              categoryFeaturedPost.title;
                            return imageUrl ? (
                              <img
                                alt={imageAlt}
                                src={imageUrl}
                                style={{ borderRadius: "6px" }}
                              />
                            ) : (
                              <div>
                                <Text type="secondary">No Image</Text>
                              </div>
                            );
                          })()}
                          <div className="flex flex-col flex-1">
                            <div
                              className="para-txt"
                              style={{
                                ...clampStyle,
                                fontSize: "13px",
                                fontWeight: "600",
                                padding: "10px",
                              }}
                            >
                              {categoryFeaturedPost.title}
                            </div>
                            <div style={{ padding: "0 10px 10px" }} className="mt-auto">
                              <Text
                                className="para-txt"
                                type="secondary"
                                style={{ fontSize: "12px" }}
                              >
                                {new Date(
                                  categoryFeaturedPost.publishedAt
                                ).toLocaleDateString("en-US", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </Text>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </Col>
                  )}

                  <Col className="col-md-3">
                    <Row style={{ margin: "0" }}>
                      {await Promise.all(categorySmallerPosts1.map(async (post) => {
                        const imageUrl = getImageUrl(post.heroImage?.url);
                        const imageAlt = post.heroImage?.alt || post.title;
                        const postUrl = await getPostUrl(post, {
                          topLevelSlug: contextTopLevelSlug,
                          subCategorySlug: contextSubCategorySlug,
                        });

                        return (
                          <Col xs={24} key={post.id}>
                            <Link href={postUrl}>
                              <div className="news-post">
                                {imageUrl ? (
                                  <img alt={imageAlt} src={imageUrl} />
                                ) : (
                                  <div>
                                    <Text
                                      type="secondary"
                                      style={{ fontSize: "12px" }}
                                    >
                                      No Image
                                    </Text>
                                  </div>
                                )}
                                <div style={{ flex: 1 }} className="flex flex-col h-full min-h-[80px]">
                                  <div
                                    className="para-txt"
                                    style={{
                                      ...clampStyle,
                                      fontSize: "13px",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {post.title}
                                  </div>
                                  <div style={{ marginTop: "auto", paddingTop: "8px" }}>
                                    <Space size={4}>
                                      <Text
                                        className="para-txt"
                                        type="secondary"
                                        style={{ fontSize: "12px" }}
                                      >
                                        {new Date(
                                          post.publishedAt
                                        ).toLocaleDateString("en-US", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })}
                                      </Text>
                                    </Space>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </Col>
                        );
                      }))}
                    </Row>
                  </Col>

                  <Col className="col-md-3">
                    <Row style={{ margin: "0" }}>
                      {await Promise.all(categorySmallerPosts2.map(async (post) => {
                        const imageUrl = getImageUrl(post.heroImage?.url);
                        const imageAlt = post.heroImage?.alt || post.title;
                        const postUrl = await getPostUrl(post, {
                          topLevelSlug: contextTopLevelSlug,
                          subCategorySlug: contextSubCategorySlug,
                        });

                        return (
                          <Col xs={24} key={post.id}>
                            <Link href={postUrl}>
                              <div className="news-post">
                                {imageUrl ? (
                                  <img alt={imageAlt} src={imageUrl} />
                                ) : (
                                  <div>
                                    <Text
                                      type="secondary"
                                      style={{ fontSize: "12px" }}
                                    >
                                      No Image
                                    </Text>
                                  </div>
                                )}
                                <div style={{ flex: 1 }} className="flex flex-col h-full min-h-[80px]">
                                  <div
                                    className="para-txt"
                                    style={{
                                      ...clampStyle,
                                      fontSize: "13px",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {post.title}
                                  </div>
                                  <div style={{ marginTop: "auto", paddingTop: "8px" }}>
                                    <Space size={4}>
                                      <Text
                                        className="para-txt"
                                        type="secondary"
                                        style={{ fontSize: "12px" }}
                                      >
                                        {new Date(
                                          post.publishedAt
                                        ).toLocaleDateString("en-US", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })}
                                      </Text>
                                    </Space>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </Col>
                        );
                      }))}
                    </Row>
                  </Col>
                </Row>
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
