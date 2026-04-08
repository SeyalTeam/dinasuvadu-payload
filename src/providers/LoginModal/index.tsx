'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getMeAction } from '@/app/(frontend)/actions/auth';

interface LoginModalContextType {
  isLoginOpen: boolean;
  user: any | null;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  toggleLoginModal: () => void;
  setUser: (user: any | null) => void;
}

const LoginModalContext = createContext<LoginModalContextType | undefined>(undefined);

export function LoginModalProvider({ children }: { children: React.ReactNode }) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  // Sync user state with cookie on mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { user: refreshedUser } = await getMeAction();
        if (refreshedUser) {
          setUser(refreshedUser);
        }
      } catch (e) {
        console.error("Failed to refresh user session", e);
      }
    };
    checkUser();
  }, []);

  const openLoginModal = useCallback(() => setIsLoginOpen(true), []);
  const closeLoginModal = useCallback(() => setIsLoginOpen(false), []);
  const toggleLoginModal = useCallback(() => setIsLoginOpen((prev) => !prev), []);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isLoginOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      // Small delay to prevent layout shift if CommentDrawer logic also toggles it
      const timer = setTimeout(() => {
        if (!isLoginOpen) document.body.style.overflow = '';
      }, 0);
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isLoginOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLoginModal();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [closeLoginModal]);

  return (
    <LoginModalContext.Provider value={{ isLoginOpen, user, openLoginModal, closeLoginModal, toggleLoginModal, setUser }}>
      {children}
    </LoginModalContext.Provider>
  );
}

export function useLoginModal() {
  const context = useContext(LoginModalContext);
  if (context === undefined) {
    throw new Error('useLoginModal must be used within a LoginModalProvider');
  }
  return context;
}
