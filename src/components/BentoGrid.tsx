"use client";

import React from "react";
import { BentoCard } from "./BentoCard";

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
  readingTime?: string;
};

type BentoGridProps = {
  posts: Post[];
  baseUrl: string;
};

export const BentoGrid: React.FC<BentoGridProps> = ({ posts, baseUrl }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {posts.map((post, index) => {
        const variant = index === 0 ? "hero" : "standard";
        const spanClass = index === 0 ? "lg:col-span-2" : "lg:col-span-1";
        
        const heightClass = "h-full";

        return (
          <div key={post.id} className={`${spanClass} ${heightClass}`}>
            <BentoCard 
              post={post} 
              variant={variant} 
            />
          </div>
        );
      })}
    </div>
  );
};
