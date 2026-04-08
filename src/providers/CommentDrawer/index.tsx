'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface CommentDrawerContextType {
  isOpen: boolean;
  postSlug: string | null;
  openDrawer: (slug?: string) => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const CommentDrawerContext = createContext<CommentDrawerContextType | undefined>(undefined);

export function CommentDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [postSlug, setPostSlug] = useState<string | null>(null);

  const openDrawer = useCallback((slug?: string) => {
    if (slug) setPostSlug(slug);
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const toggleDrawer = useCallback(() => setIsOpen((prev) => !prev), []);

  // Prevent scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [closeDrawer]);

  return (
    <CommentDrawerContext.Provider value={{ isOpen, postSlug, openDrawer, closeDrawer, toggleDrawer }}>
      {children}
    </CommentDrawerContext.Provider>
  );
}

export function useCommentDrawer() {
  const context = useContext(CommentDrawerContext);
  if (context === undefined) {
    throw new Error('useCommentDrawer must be used within a CommentDrawerProvider');
  }
  return context;
}
