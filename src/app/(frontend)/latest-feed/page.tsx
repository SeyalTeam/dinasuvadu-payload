import React from "react";
import Link from "next/link";
import { getPayload } from "payload";
import config from "@/payload.config";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { resolveCanonicalPostPath } from "@/lib/post-url";
import { ThumbsUp, ThumbsDown, MessageSquare, Clock, Plus, Cloud, Sun, Search, MessageCircle } from "lucide-react";
import { FeedCard } from "@/components/FeedCard";
import { FeedVerticalCard } from "@/components/FeedVerticalCard";
import { FeedList } from "@/components/FeedList";
import { WeatherWidget } from "@/components/WeatherWidget";
import { calculateReadingTime } from "@/utilities/readingTime";

// Type definitions
type Post = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  heroImage?: {
    url: string;
    alt?: string;
  };
  categories?: {
    title: string;
    slug: string;
    parent?: { slug: string; title: string } | string;
  }[];
  meta?: {
    description?: string;
  };
  content?: any;
  layout?: any;
  readingTime?: number;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

async function fetchLatestPosts(limit: number = 20): Promise<{ docs: Post[], hasNextPage: boolean }> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "posts",
      limit,
      sort: "-publishedAt",
      where: {
        _status: {
          equals: "published",
        },
      },
      depth: 2,
    });
    const posts = (res.docs as unknown as Post[]) || [];
    
    // Calculate reading time for each post
    const postsWithReadingTime = posts.map(post => ({
      ...post,
      readingTime: calculateReadingTime(post)
    }));

    return {
      docs: postsWithReadingTime,
      hasNextPage: res.hasNextPage
    };
  } catch (err) {
    console.error("Error fetching latest posts:", err);
    return { docs: [], hasNextPage: false };
  }
}

async function fetchParentCategory(parentId: string) {
  const payload = await getPayload({ config });
  return await payload.findByID({
    collection: "categories",
    id: parentId,
  });
}

function getImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http") ? url : `${apiUrl}${url}`;
}

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
  return date.toLocaleDateString();
}

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Top Stories - MSN Feed Style",
    description: "Catch up with the absolute latest news post in MSN lifestyle.",
    canonical: "https://www.dinasuvadu.com/latest-feed",
  });
}

export default async function LatestFeedPage() {
  const { docs: posts, hasNextPage } = await fetchLatestPosts();

  if (posts.length === 0) {
    return (
      <div className="site flex items-center justify-center min-h-[50vh]">
        <h2 className="para-txt text-xl text-gray-500">சமீபத்திய செய்திகள் எதுவும் கிடைக்கவில்லை.</h2>
      </div>
    );
  }

  const heroPosts = posts.slice(0, 1);
  const gridPostsRaw = posts.slice(1, 4);
  const listPostsRaw = posts.slice(4);

  // Resolve canonical URLs for all initial posts
  const heroPostsWithUrls = await Promise.all(
    heroPosts.map(async (post) => ({
      ...post,
      url: await resolveCanonicalPostPath(post, fetchParentCategory as any),
    }))
  );

  const gridPostsWithUrls = await Promise.all(
    gridPostsRaw.map(async (post) => ({
      ...post,
      url: await resolveCanonicalPostPath(post, fetchParentCategory as any),
    }))
  );

  const listPostsWithUrls = await Promise.all(
    listPostsRaw.map(async (post) => ({
      ...post,
      url: await resolveCanonicalPostPath(post, fetchParentCategory as any),
    }))
  );

  return (
    <div className="w-full bg-[#f5f5f5] dark:bg-[#0a0a0a] min-h-screen font-sans">
      <div className="site">
        
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-6 mt-6">
          
          {/* LEFT SIDEBAR: Suggested Content */}
          <aside className="hidden lg:flex flex-col gap-6">
             <div className="bg-white dark:bg-[#111] p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-4 tracking-widest">உங்களுக்குப் பிடித்தவை</h3>
                <div className="flex flex-col gap-4">
                   {["தலைப்புச் செய்திகள்", "சினிமா", "விளையாட்டு", "தொழில்நுட்பம்"].map((topic) => (
                      <div key={topic} className="flex items-center justify-between group cursor-pointer">
                         <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">{topic}</span>
                         <Plus size={16} className="text-gray-400 group-hover:text-blue-600" />
                      </div>
                   ))}
                </div>
             </div>
          </aside>

          {/* MAIN FEED: News Content */}
          <main className="flex flex-col gap-6">
            
            {/* HERO SECTION: Featured Story Spotlight */}
            <div className="w-full">
               {heroPostsWithUrls[0] && (
                  <Link 
                    key={heroPostsWithUrls[0].id} 
                    href={heroPostsWithUrls[0].url} 
                    className="relative group rounded-xl shadow-sm overflow-hidden bg-white dark:bg-[#111] border border-gray-100 dark:border-gray-800 block h-[260px] md:h-[300px] w-full"
                  >
                     <img 
                       src={getImageUrl(heroPostsWithUrls[0].heroImage?.url) || ""} 
                       alt={heroPostsWithUrls[0].title} 
                       className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
                     <div className="absolute bottom-0 left-0 right-0 p-4 z-20 text-white md:p-6">
                        <div className="flex items-center gap-2 mb-3">
                           <span className="text-sm font-medium text-gray-200 drop-shadow-md">{heroPostsWithUrls[0].categories?.[0]?.title || "செய்திகள்"}</span>
                           <span className="text-sm text-gray-400">•</span>
                           <span className="text-sm text-gray-300 shadow-sm">{timeAgo(heroPostsWithUrls[0].publishedAt)}</span>
                        </div>
                        <h2 
                          className="text-[19px] md:text-[24px] lg:text-[28px] font-bold leading-tight mb-2 para-txt group-hover:underline"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            textShadow: "0 2px 4px rgba(0,0,0,0.5)"
                          }}
                        >
                          {heroPostsWithUrls[0].title}
                        </h2>
                     </div>
                  </Link>
               )}
            </div>

            {/* GRID SECTION: Secondary Featured Stories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {gridPostsWithUrls.map((post) => (
                <FeedVerticalCard 
                  key={post.id} 
                  post={post as any} 
                  url={post.url} 
                  timeAgo={timeAgo(post.publishedAt)} 
                />
              ))}
            </div>

            {/* DYNAMIC LIST FEED: Handles pagination (Load More) */}
            <FeedList 
              initialPosts={listPostsWithUrls as any[]} 
              initialHasMore={hasNextPage} 
            />
          </main>

          {/* RIGHT SIDEBAR: Utilities and Promo */}
          <aside className="hidden lg:flex flex-col gap-6">
             {/* WhatsApp Work Chat Promo */}
             <a 
               href="https://www.whatsapp.com/channel/0029Va4U8pVKLaHkkCs8Xx0L" 
               target="_blank" 
               rel="noopener noreferrer"
               className="bg-[#25D366] p-5 rounded-2xl text-white shadow-lg hover:opacity-90 transition-all group overflow-hidden relative"
             >
                <div className="relative z-10">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                         <p className="text-[10px] font-black uppercase opacity-90 tracking-widest underline underline-offset-4 decoration-2 decoration-white/30">Work Chat</p>
                         <p className="text-lg font-extrabold leading-tight mt-1">தினச்சுவடு WhatsApp சேனலில் இணையுங்கள்</p>
                      </div>
                      <MessageCircle size={28} className="fill-white/20" />
                   </div>
                   <div className="flex items-center gap-2 bg-black/10 w-fit px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                      இப்போதே சேருங்கள்
                   </div>
                </div>
                <MessageCircle size={100} className="absolute -bottom-6 -right-6 text-white/10 rotate-12" />
             </a>

             {/* Weather Box */}
             <WeatherWidget />
          </aside>

        </div>
      </div>
    </div>
  );
}
