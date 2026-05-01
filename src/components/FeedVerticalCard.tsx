import Link from "next/link";
import { Clock } from "lucide-react";

type FeedVerticalCardProps = {
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
  timeAgo: string;
};

export const FeedVerticalCard: React.FC<FeedVerticalCardProps> = ({ post, url, timeAgo }) => {
  return (
    <div className="relative bg-white dark:bg-[#111] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col group h-full transition-all hover:shadow-md">
      {/* Stretched Link for Full Card Clickability */}
      <Link href={url} className="absolute inset-0 z-0" aria-label={post.title} />

      {/* Image Section */}
      {post.heroImage?.url && (
        <div className="block aspect-video overflow-hidden relative z-10 pointer-events-none">
          <img 
            src={post.heroImage.url.startsWith("http") ? post.heroImage.url : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}${post.heroImage.url}`} 
            alt={post.heroImage.alt || post.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-1 relative z-10 pointer-events-none">
        {/* Metadata */}
        <div className="flex items-center gap-2 mb-3">
           <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{post.categories?.[0]?.title || "செய்திகள்"}</span>
           <span className="text-[11px] text-gray-400">•</span>
           <span className="text-[11px] text-gray-500 dark:text-gray-400">{timeAgo}</span>
        </div>

        <div className="block mt-auto">
          <h3 className="text-[15px] md:text-[17px] font-bold text-[#1a1a1a] dark:text-[#f3f4f6] leading-tight line-clamp-3 transition-colors para-txt">
            {post.title}
          </h3>
        </div>
      </div>
    </div>
  );
};
