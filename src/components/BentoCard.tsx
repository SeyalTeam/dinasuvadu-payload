"use client";

import React from "react";
import Link from "next/link";
import { Clock, Share2, MoreHorizontal } from "lucide-react";
import { timeAgo } from "@/utilities/timeAgo";

type BentoCardProps = {
  post?: {
    id: string;
    title: string;
    slug: string;
    publishedAt: string;
    heroImage?: {
      url: string;
      alt?: string;
    };
    categories?: { title: string; slug: string }[];
    meta?: { description?: string };
    readingTime?: string;
  };
  url?: string;
  variant: "hero" | "standard" | "ad";
  adConfig?: {
    title: string;
    brand: string;
    bgColor: string;
    logo?: string;
  };
};

export const BentoCard: React.FC<BentoCardProps> = ({ post, url, variant, adConfig }) => {
  const isHero = variant === "hero";
  const isAd = variant === "ad";

  if (isAd && adConfig) {
    return (
      <div 
        className="relative rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 text-center h-full group transition-all hover:shadow-md"
        style={{ backgroundColor: adConfig.bgColor }}
      >
        <div className="absolute top-4 left-4 bg-black/20 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
          Ad
        </div>
        <div className="flex flex-col items-center gap-4">
          <h3 className="text-xl md:text-2xl font-black text-white leading-tight">
            {adConfig.title}
          </h3>
          <div className="flex items-center gap-2 text-white/90 text-sm font-bold bg-black/10 px-3 py-1.5 rounded-full">
            <span>{adConfig.brand}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!post) return null;

  const imageUrl = post.heroImage?.url 
    ? (post.heroImage.url.startsWith("http") ? post.heroImage.url : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}${post.heroImage.url}`)
    : "";

  if (isHero) {
    return (
      <article className="bento-grid-item relative rounded-xl overflow-hidden group h-[260px] md:h-[280px] shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-800">
        <Link href={post.postLink || "#"} className="absolute inset-0 z-10" />
        
        <div className="absolute inset-0">
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt={post.heroImage?.alt || post.title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-20">
          <div className="flex items-center gap-2 mb-2 text-[12px] font-medium text-gray-200 uppercase tracking-wide">
             <span className="text-blue-400 drop-shadow-md">{post.categories?.[0]?.title || "செய்திகள்"}</span>
             <span className="text-gray-400 font-bold">•</span>
             <span className="shadow-sm">{timeAgo(post.publishedAt)}</span>
          </div>
          <h2 className="bento-card-title text-[18px] md:text-[22px] lg:text-[24px] font-bold text-white leading-tight mb-2 para-txt line-clamp-3" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
            {post.title}
          </h2>
        </div>
      </article>
    );
  }

  // Standard Post Card (matching homepage small cards)
  return (
    <article className="bento-grid-item bg-white dark:bg-gray-800 rounded-xl overflow-hidden flex flex-col group h-[260px] md:h-[280px] shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700">
      <Link href={post.postLink || "#"} className="flex flex-col h-full">
        {/* Image Section (roughly 48% height) */}
        <div className="relative h-[45%] md:h-[48%] overflow-hidden bg-gray-100 dark:bg-gray-900 shrink-0">
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt={post.heroImage?.alt || post.title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
        </div>

        {/* Content Section */}
        <div className="p-3 md:p-4 flex flex-col flex-1 bg-white dark:bg-gray-800 transition-colors">
          <div className="flex items-center gap-1.5 mb-2 text-[11px] md:text-xs font-medium uppercase tracking-wide">
             <span className="text-gray-700 dark:text-gray-300">{post.categories?.[0]?.title || "செய்திகள்"}</span>
             <span className="text-gray-400 dark:text-gray-600 font-bold">•</span>
             <span className="text-gray-500 dark:text-gray-400">{timeAgo(post.publishedAt)}</span>
          </div>
          
          <h3 className="text-[14px] md:text-[15px] font-bold text-gray-900 dark:text-gray-100 leading-snug mb-auto line-clamp-3 para-txt group-hover:text-blue-600 transition-colors">
            {post.title}
          </h3>
        </div>
      </Link>
    </article>
  );
};
