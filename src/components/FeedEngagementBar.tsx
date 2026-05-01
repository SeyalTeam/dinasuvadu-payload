"use client";

import React from "react";
import { ThumbsUp, ThumbsDown, MessageSquare, MessageCircle, Share2 } from "lucide-react";
import { useInteractionSync } from "@/hooks/useInteractionSync";
import { useCommentDrawer } from "@/providers/CommentDrawer";
import { useLoginModal } from "@/providers/LoginModal";

type FeedEngagementBarProps = {
  url: string;
  postSlug: string;
  title: string;
};

export const FeedEngagementBar: React.FC<FeedEngagementBarProps> = ({
  url,
  postSlug,
  title,
}) => {
  const { isLiked, likes, updateLike, comments } = useInteractionSync(url);
  const { openDrawer } = useCommentDrawer();
  const { user, openLoginModal } = useLoginModal();

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    const newLiked = !isLiked;
    const newCount = newLiked ? likes + 1 : Math.max(0, likes - 1);
    updateLike(newLiked, newCount);
  };

  const handleComment = (e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      openDrawer(postSlug);
    } else {
      openLoginModal();
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: url,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        alert("இணைப்பு நகலெடுக்கப்பட்டது!");
      } catch (err) {
        console.error("Error copying link:", err);
      }
    }
  };

  return (
    <div className="flex items-center gap-4 text-gray-400 dark:text-gray-500">
      <button 
        onClick={handleLike}
        className={`hover:text-blue-600 transition-colors flex items-center gap-1.5 ${isLiked ? "text-blue-600" : ""}`}
      >
        <ThumbsUp size={14} fill={isLiked ? "currentColor" : "none"} />
        <span className="text-xs font-bold">{likes > 0 ? likes : ""}</span>
      </button>
      
      <button 
        onClick={handleComment}
        className="hover:text-blue-600 transition-colors flex items-center gap-1.5 text-xs font-bold"
      >
        <MessageSquare size={14} />
        <span>{comments > 0 ? comments : ""}</span>
      </button>

      <button 
        onClick={handleShare}
        className="hover:text-blue-500 transition-colors flex items-center justify-center"
        title="Share"
      >
        <Share2 size={14} />
      </button>
    </div>
  );
};
