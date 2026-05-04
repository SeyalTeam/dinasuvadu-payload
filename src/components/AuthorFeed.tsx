"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchAuthorPostsAction } from "@/app/(frontend)/author/[authorSlug]/actions";

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
  postLink?: string;
};

type AuthorFeedProps = {
  initialPosts: Post[];
  authorId: string;
  apiUrl: string;
  initialOffset?: number;
};

export function AuthorFeed({ 
  initialPosts, 
  authorId, 
  apiUrl,
  initialOffset = 15
}: AuthorFeedProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [offset, setOffset] = useState(initialOffset); 
  const [hasMore, setHasMore] = useState(initialPosts.length >= 10);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    const result = await fetchAuthorPostsAction(authorId, 5, offset);
    
    if (result.posts && result.posts.length > 0) {
      const newPosts = result.posts.filter(newP => !posts.some(p => p.id === newP.id));
      if (newPosts.length > 0) {
        setPosts((prev) => [...prev, ...newPosts]);
        setOffset((prev) => prev + newPosts.length);
        setHasMore(result.hasNextPage || newPosts.length === 5);
      } else {
        setHasMore(false);
      }
    } else {
      setHasMore(false);
    }
    
    setIsLoading(false);
  };


  return (
    <div className="space-y-0">
      {/* Mobile View - Single Hero at top + List items */}
      <div className="md:hidden">
        {posts.map((post, index) => {
          const imageUrl = post.heroImage?.url 
            ? (post.heroImage.url.startsWith("http") ? post.heroImage.url : `${apiUrl}${post.heroImage.url}`) 
            : null;
          const imageAlt = post.heroImage?.alt || post.title;
          const postLink = post.postLink || "#";

          if (index === 0) {
            // Only the first post is a Hero
            return (
              <div key={post.id} className="mb-4 border-b border-gray-100 dark:border-gray-800 pb-6">
                <Link href={postLink} className="block group">
                  <div className="relative w-full h-[240px] rounded-2xl overflow-hidden mb-5 shadow-sm">
                    <Image
                      alt={imageAlt}
                      src={imageUrl || "/placeholder-news.jpg"}
                      fill
                      className="object-cover"
                      priority
                      unoptimized
                    />
                  </div>
                  <h3 className="text-[24px] font-black leading-[1.2] text-[#111] dark:text-white px-1 line-clamp-3 tracking-tight para-txt">
                    {post.title}
                  </h3>
                </Link>
              </div>
            );
          }

          // All other posts are List items
          return (
            <Link 
              key={post.id} 
              href={postLink} 
              className="block py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 md:px-0"
            >
              <div className="flex gap-4 items-start">
                <div className="relative w-32 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-50 shadow-sm">
                  <Image
                    alt={imageAlt}
                    src={imageUrl || "/placeholder-news.jpg"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex-1 pt-0.5">
                  <h3 className="text-[17px] font-extrabold text-[#222] dark:text-gray-100 line-clamp-3 leading-[1.35] tracking-tight para-txt">
                    {post.title}
                  </h3>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop View - Continuous standard list */}
      <div className="hidden md:flex flex-col space-y-0">
        {posts.map((post) => {
          const imageUrl = post.heroImage?.url 
            ? (post.heroImage.url.startsWith("http") ? post.heroImage.url : `${apiUrl}${post.heroImage.url}`) 
            : null;
          const imageAlt = post.heroImage?.alt || post.title;
          const postLink = post.postLink || "#";

          return (
            <article key={post.id} className="news-list-item">
              <div className="news-list-content flex-1">
                <Link href={postLink} className="news-list-text">
                  <h3 className="news-list-title text-[20px] font-bold leading-normal text-gray-900 dark:text-white">
                    {post.title}
                  </h3>
                  {post.meta?.description && (
                    <p className="news-list-desc line-clamp-2 mt-2">{post.meta.description}</p>
                  )}
                </Link>
              </div>
              {imageUrl && (
                <Link href={postLink} className="news-list-image w-[160px] h-[100px] shrink-0 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 ml-6">
                  <Image
                    src={imageUrl}
                    alt={imageAlt}
                    width={160}
                    height={100}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </Link>
              )}
            </article>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-8 mb-8 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className={`
              px-8 py-3 rounded-full font-bold transition-all duration-200
              ${isLoading 
                ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:scale-95"}
            `}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                ஏற்றப்படுகிறது...
              </span>
            ) : (
              "மேலும் படிக்க"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
