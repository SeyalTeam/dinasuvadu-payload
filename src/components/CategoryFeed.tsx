"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { timeAgo } from "@/utilities/timeAgo";
import { fetchCategoryPostsAction } from "@/app/(frontend)/[categorySlug]/actions";

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

type CategoryFeedProps = {
  initialPosts: Post[];
  categoryId: string;
  categorySlug: string;
  apiUrl: string;
  initialOffset?: number;
};

export function CategoryFeed({ 
  initialPosts, 
  categoryId, 
  categorySlug,
  apiUrl,
  initialOffset = 16
}: CategoryFeedProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [offset, setOffset] = useState(initialOffset); 
  const [hasMore, setHasMore] = useState(initialPosts.length >= (initialOffset === 16 ? 12 : 5));
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    // We fetch 5 items at a time
    const result = await fetchCategoryPostsAction(categoryId, categorySlug, 1, 5, offset);
    
    if (result.posts && result.posts.length > 0) {
      // Filter out duplicates just in case
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
    <div className="space-y-8">
      <div className="news-list-container">
        {posts.map((post) => {
          const imageUrl = post.heroImage?.url 
            ? (post.heroImage.url.startsWith("http") ? post.heroImage.url : `${apiUrl}${post.heroImage.url}`) 
            : null;
          const imageAlt = post.heroImage?.alt || post.title;
          const postLink = post.postLink || `/${categorySlug}/${post.slug}`;

          return (
            <article key={post.id} className="news-list-item">
              <div className="news-list-content">
                <Link href={postLink} className="news-list-text">
                  <h3 className="news-list-title">{post.title}</h3>
                  {post.meta?.description && (
                    <p className="news-list-desc">
                      {post.meta.description}
                    </p>
                  )}
                </Link>
              </div>

              {imageUrl ? (
                <Link href={postLink} className="news-list-image">
                  <Image
                    src={imageUrl}
                    alt={imageAlt}
                    width={160}
                    height={100}
                    style={{ objectFit: 'cover' }}
                    unoptimized
                  />
                </Link>
              ) : (
                <div className="news-list-image-placeholder">
                  <span>No Image</span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-8 border-t border-gray-100 dark:border-gray-800">
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
              "மேலும் வாசிக்க"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
