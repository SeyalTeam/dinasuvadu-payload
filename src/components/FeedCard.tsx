import React from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { FeedEngagementBar } from "./FeedEngagementBar";

type FeedCardProps = {
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
    }[];
    readingTime?: number;
  };
  url: string;
};

export const FeedCard: React.FC<FeedCardProps> = ({ post, url }) => {
  return (
    <article className="relative bg-white dark:bg-[#111] p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 transition-all hover:shadow-md group overflow-hidden">
      {/* Stretched Link for Full Card Clickability */}
      <Link href={url} className="absolute inset-0 z-0" aria-label={post.title} />

      <div className="flex gap-4 md:gap-6 relative z-10 pointer-events-none">
        
        {/* Left Side: Content */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Category Metadata */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{post.categories?.[0]?.title || "செய்திகள்"}</span>
          </div>

          <div className="block mb-4">
            <h3 className="text-[17px] md:text-[20px] font-extrabold text-[#1a1a1a] dark:text-[#f3f4f6] leading-[1.3] line-clamp-2 transition-colors para-txt">
              {post.title}
            </h3>
          </div>

          {/* Footer Interaction Bar */}
          <div className="mt-auto flex items-center justify-between pt-2 pointer-events-auto">
            <FeedEngagementBar 
               url={url} 
               postSlug={post.slug} 
               title={post.title} 
            />
            
            <div className="flex items-center gap-1 text-[11px] font-bold text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
              <Clock size={12} />
              <span>{post.readingTime || 2} நிமிடம்</span>
            </div>
          </div>
        </div>

        {/* Right Side: Thumbnail */}
        {post.heroImage?.url && (
          <div className="shrink-0">
            <div className="w-32 h-24 md:w-60 md:h-32 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
              <img 
                src={post.heroImage.url.startsWith("http") ? post.heroImage.url : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}${post.heroImage.url}`} 
                alt={post.heroImage.alt || post.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
