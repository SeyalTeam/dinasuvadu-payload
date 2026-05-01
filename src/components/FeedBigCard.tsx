"use client";

import React from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { FeedEngagementBar } from "./FeedEngagementBar";

type FeedBigCardProps = {
  post: {
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
      parent?: any;
    }[];
    meta?: {
      description?: string;
    };
    readingTime?: number;
  };
  url: string;
};

export const FeedBigCard: React.FC<FeedBigCardProps> = ({ post, url }) => {
  const imageUrl = post.heroImage?.url 
    ? (post.heroImage.url.startsWith("http") ? post.heroImage.url : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}${post.heroImage.url}`)
    : "";

  return (
    <article className="relative bg-white dark:bg-[#111] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col group transition-all hover:shadow-lg">
      
      {/* Stretched Link for Full Card Clickability */}
      <Link href={url} className="absolute inset-0 z-0" aria-label={post.title} />

      {/* Large Image Section with Overlay Title */}
      <div className="relative aspect-[2.4/1] overflow-hidden pointer-events-none">
        {imageUrl && (
          <img 
            src={imageUrl} 
            alt={post.heroImage?.alt || post.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 !pb-3 z-10">
           <div className="mb-2 pointer-events-auto">
             <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest leading-none">
               {post.categories?.[0]?.title || "செய்திகள்"}
             </span>
           </div>
           <div className="block">
              <h2 className="text-xl md:text-2xl font-black text-white leading-tight transition-colors para-txt">
                {post.title}
              </h2>
           </div>
        </div>
      </div>

      {/* Description and Interaction Section */}
      <div className="px-4 md:px-6 pt-3 pb-3 flex flex-col gap-2 relative z-10 pointer-events-none">
         
         {/* Snippet / Description */}
         {post.meta?.description && (
           <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3 font-medium">
             {post.meta.description}
           </p>
         )}

         {/* Bottom Footer Bar */}
         <div className="flex items-center justify-between pt-1.5 border-t border-gray-50 dark:border-gray-800/50 pointer-events-auto">
            <FeedEngagementBar 
               url={url} 
               postSlug={post.slug} 
               title={post.title} 
            />
            
            <div className="flex items-center gap-1.5 text-[11px] font-black text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full uppercase tracking-widest">
              <Clock size={12} strokeWidth={3} />
              <span>{post.readingTime || 3} நிமிடம்</span>
            </div>
         </div>
      </div>
    </article>
  );
};
