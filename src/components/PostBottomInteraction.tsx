"use client";

import React, { useState, useEffect } from "react";
import { useInteractionSync } from "@/hooks/useInteractionSync";
import { useLoginModal } from "@/providers/LoginModal";
import { useCommentDrawer } from "@/providers/CommentDrawer";

type PostBottomInteractionProps = {
  url: string;
  title: string;
  postSlug: string;
  description?: string;
};

export default function PostBottomInteraction({
  url,
  title,
  postSlug,
  description,
}: PostBottomInteractionProps) {
  const { isLiked, likes, updateLike, comments } = useInteractionSync(url);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleLike = () => {
    const newLiked = !isLiked;
    const newCount = newLiked ? likes + 1 : Math.max(0, likes - 1);
    updateLike(newLiked, newCount);
  };

  const { user, openLoginModal } = useLoginModal();
  const { openDrawer } = useCommentDrawer();

  const handleComment = () => {
    if (user) {
      openDrawer(postSlug);
    } else {
      openLoginModal();
    }
  };

  return (
    <div className="post-bottom-interaction">
      <div className="post-bottom-interaction-inner">
        <button 
          className="post-bottom-action-btn"
          onClick={handleLike}
          aria-label="Like"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="interaction-icon"
          >
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4V11h3" />
          </svg>
          <span className="action-label">{likes} Likes</span>
        </button>

        <div className="post-bottom-divider" />

        <button 
          className="post-bottom-action-btn"
          onClick={handleComment}
          aria-label="Comment"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="interaction-icon"
          >
            <path d="M21 15v-10c0-1.1-.9-2-2-2h-14c-1.1 0-2 .9-2 2v14l4-4h10c1.1 0 2-.9 2-2z" />
          </svg>
          <span className="action-label">{comments} Comments</span>
        </button>
      </div>

      {toast && (
        <div className="post-action-toast">
          {toast}
        </div>
      )}
    </div>
  );
}
