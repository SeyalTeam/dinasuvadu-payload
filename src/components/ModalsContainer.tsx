'use client';

import React, { useState, useEffect } from 'react';
import { useCommentDrawer } from '@/providers/CommentDrawer';
import { useLoginModal } from '@/providers/LoginModal';
import dynamic from 'next/dynamic';

const CommentDrawer = dynamic(
  () => import('./CommentDrawer').then((mod) => mod.CommentDrawer),
  { ssr: false }
);

const LoginModal = dynamic(
  () => import('./LoginModal').then((mod) => mod.LoginModal),
  { ssr: false }
);

export const ModalsContainer: React.FC = () => {
  const { isOpen } = useCommentDrawer();
  const { isLoginOpen } = useLoginModal();

  const [commentDrawerOpened, setCommentDrawerOpened] = useState(false);
  const [loginModalOpened, setLoginModalOpened] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCommentDrawerOpened(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isLoginOpen) {
      setLoginModalOpened(true);
    }
  }, [isLoginOpen]);

  return (
    <>
      {commentDrawerOpened && <CommentDrawer />}
      {loginModalOpened && <LoginModal />}
    </>
  );
};
