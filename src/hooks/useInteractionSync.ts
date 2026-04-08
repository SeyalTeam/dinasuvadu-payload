'use client';

import { useState, useEffect, useCallback } from 'react';

export function useInteractionSync(url: string) {
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);

  // Load initial state
  const loadState = useCallback(() => {
    if (typeof window === 'undefined') return;

    const storedLikes = JSON.parse(
      window.localStorage.getItem('dinasuvadu_liked_posts') || '[]'
    ) as string[];
    const counts = JSON.parse(
      window.localStorage.getItem('dinasuvadu_like_counts') || '{}'
    );
    const commentCounts = JSON.parse(
      window.localStorage.getItem('dinasuvadu_comment_counts') || '{}'
    );

    setIsLiked(storedLikes.includes(url));
    setLikes(counts[url] || 0);
    setComments(commentCounts[url] || 0);
  }, [url]);

  useEffect(() => {
    loadState();

    // Listen for sync events from other components on the same page
    const handleSync = (e: any) => {
      if (e.detail?.url === url) {
        loadState();
      }
    };

    window.addEventListener('dinasuvadu_sync_interactions', handleSync);
    return () => window.removeEventListener('dinasuvadu_sync_interactions', handleSync);
  }, [url, loadState]);

  const updateLike = (newIsLiked: boolean, newCount: number) => {
    if (typeof window === 'undefined') return;

    // Update localStorage
    const storedLikes = JSON.parse(
      window.localStorage.getItem('dinasuvadu_liked_posts') || '[]'
    ) as string[];
    let updatedLikes = [...storedLikes];
    
    if (newIsLiked) {
      if (!updatedLikes.includes(url)) updatedLikes.push(url);
    } else {
      updatedLikes = updatedLikes.filter(u => u !== url);
    }
    
    window.localStorage.setItem('dinasuvadu_liked_posts', JSON.stringify(updatedLikes));

    const counts = JSON.parse(
      window.localStorage.getItem('dinasuvadu_like_counts') || '{}'
    );
    counts[url] = Math.max(0, newCount);
    window.localStorage.setItem('dinasuvadu_like_counts', JSON.stringify(counts));

    // Update local state
    setIsLiked(newIsLiked);
    setLikes(newCount);

    // Notify other components
    window.dispatchEvent(new CustomEvent('dinasuvadu_sync_interactions', { detail: { url } }));
  };

  return { isLiked, likes, comments, updateLike, refresh: loadState };
}
