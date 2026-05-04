export const revalidate = 60;
export const dynamicParams = true;
import Link from "next/link";
import { notFound } from "next/navigation";
import ShareButton from "@/components/ShareButton";
import { getPayload } from "payload";
import config from "@/payload.config";
import type { Metadata } from "next";
import { buildMetadata, buildPersonLd } from "@/lib/seo";
import { resolvePostPathForContext } from "@/lib/post-url";
import { AuthorFeed } from "@/components/AuthorFeed";

// Generate dynamic metadata for author pages
export async function generateMetadata({ params }: { params: Promise<{ authorSlug: string }> }): Promise<Metadata> {
  const { authorSlug } = await params;
  const author = await fetchAuthorBySlug(authorSlug);
  if (!author) {
    return { title: "Author not found – Dinasuvadu" };
  }
  return buildMetadata({
    title: `${author.name} | Author at Dinasuvadu`,
    description: author.bio || `Articles written by ${author.name} on Dinasuvadu.`,
    canonical: `https://www.dinasuvadu.com/author/${authorSlug}`,
  });
}

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
  const initialListLimit = 15;
  const limit = initialListLimit;

  const author = await fetchAuthorBySlug(authorSlug);

  if (!author) {
    notFound();
  }

  const { posts, total } = await fetchPostsByAuthor(author.id, page, limit);

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
        limit: 5,
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
          __html: buildPersonLd({
            name: author.name,
            description: author.bio,
            url: `https://www.dinasuvadu.com/author/${authorSlug}`,
          }),
        }}
      />
    <div className="site">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm font-medium text-gray-500 site">
        <div className="flex items-center space-x-2 breadcrumbs">
          <Link href="/" className="text-blue-600 hover:text-blue-800 transition-colors">Home</Link>
          <span className="text-gray-400">{">"}</span>
          <span className="text-gray-700">Author: {author.name}</span>
        </div>
      </nav>

      <div className="site-main">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
          <div className="lg:col-span-7">
            {posts.length > 0 ? (
              <div className="bg-white dark:bg-[#23272e] pt-2 md:pt-5 px-4 md:px-8 pb-6 md:pb-8 md:rounded-2xl md:shadow-md md:border border-gray-100 dark:border-gray-800">
                {/* Unified Header */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white para-txt">
                    Author: {author.name}
                  </h1>
                </div>

                <AuthorFeed 
                  initialPosts={await Promise.all(posts.map(async (post) => {
                    const postLink = await resolvePostPathForContext(
                      post,
                      {},
                      fetchParentCategory as any
                    );
                    return { ...post, postLink };
                  }))}
                  authorId={author.id}
                  apiUrl={apiUrl}
                />
              </div>
            ) : (
              <div className="bg-white dark:bg-[#111] p-10 rounded-2xl shadow-md text-center">
                <p className="text-gray-500">No posts found by this author.</p>
              </div>
            )}
          </div>

          {/* Right Sidebar for Author */}
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
  const authors = await fetchAuthors();
  return authors
    .filter(a => a.slug)
    .map((author: Author) => ({
      authorSlug: author.slug,
    }));
}
