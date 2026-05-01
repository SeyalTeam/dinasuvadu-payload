"use client";

import React, { useState } from "react";
import { FeedCard } from "./FeedCard";
import { FeedBigCard } from "./FeedBigCard";
import { fetchMorePostsAction } from "@/app/(frontend)/latest-feed/actions";

type Post = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  url: string;
  heroImage?: {
    url: string;
    alt?: string;
  };
  categories?: {
    title: string;
    slug: string;
  }[];
  meta?: {
    description?: string;
  };
  readingTime?: number;
};

type FeedListProps = {
  initialPosts: Post[];
  initialHasMore: boolean;
};

export const FeedList: React.FC<FeedListProps> = ({
  initialPosts,
  initialHasMore,
}) => {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(2); // Initial fetch was page 1 (or slices)
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  const handleLoadMore = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const result = await fetchMorePostsAction(page, 10);
      
      if (result.posts && result.posts.length > 0) {
        setPosts((prev) => [...prev, ...result.posts]);
        setPage((prev) => prev + 1);
        setHasMore(result.hasNextPage);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more posts:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Existing and Newly Loaded Posts with Hybrid Layout */}
      {posts.map((post, index) => {
        const isBigCard = (index + 1) % 5 === 0;
        
        if (isBigCard) {
          return <FeedBigCard key={post.id} post={post as any} url={post.url} />;
        }
        
        return <FeedCard key={post.id} post={post as any} url={post.url} />;
      })}

      {/* Load More Button */}
      {hasMore && (
        <div className="py-8 flex justify-center">
          <button 
            onClick={handleLoadMore}
            disabled={loading}
            className={`px-10 py-3 bg-white dark:bg-[#111] hover:bg-blue-600 hover:text-white border border-blue-600 text-blue-600 font-black rounded-full transition-all text-sm uppercase tracking-widest shadow-xl flex items-center gap-2 ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ஏற்றப்படுகிறது...
              </>
            ) : (
              "மேலும் செய்திகள்"
            )}
          </button>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
         <p className="text-center text-gray-400 text-xs font-bold uppercase tracking-widest py-8">
            எல்லாச் செய்திகளும் ஏற்றப்பட்டன
         </p>
      )}
    </div>
  );
};
