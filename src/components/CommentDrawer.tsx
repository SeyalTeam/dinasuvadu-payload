'use client';

import React, { useState } from 'react';
import { X, MessageSquare, ChevronDown, Info, ArrowUp } from 'lucide-react';
import { useCommentDrawer } from '@/providers/CommentDrawer';
import { useLoginModal } from '@/providers/LoginModal';
import { submitCommentAction } from '@/app/(frontend)/actions/auth';

export const CommentDrawer: React.FC = () => {
  const { isOpen, closeDrawer, postSlug } = useCommentDrawer();
  const { user, openLoginModal } = useLoginModal();
  const [commentText, setCommentText] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = () => {
    closeDrawer();
    openLoginModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user || !postSlug) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await submitCommentAction({
        postSlug,
        userId: String(user.id),
        content: commentText
      });

      if (result.success) {
        setIsSubmitted(true);
      } else {
        alert(result.error || "Failed to submit comment");
      }
    } catch (err) {
      alert("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div 
        className={`comment-drawer-backdrop ${isOpen ? 'open' : ''}`} 
        onClick={closeDrawer}
      />

      <aside className={`comment-drawer ${isOpen ? 'open' : ''}`}>
        <div className="comment-drawer-header">
          <div className="comment-drawer-title flex items-center justify-between w-full">
            <span className="text-xl font-bold">Comments {isSubmitted ? '(1)' : ''}</span>
            <button className="comment-sort-dropdown">
              Most Relevant <ChevronDown size={16} />
            </button>
          </div>
          <button 
            className="comment-drawer-close ml-4" 
            onClick={closeDrawer}
            aria-label="Close comment drawer"
          >
            <X size={24} />
          </button>
        </div>

        <div className="comment-drawer-content">
          {!user ? (
            <div className="comment-input-section">
              <div className="comment-input-container">
                <div className="comment-input-icon">
                  <MessageSquare size={20} className="text-gray-400" />
                </div>
                <textarea 
                  className="comment-textarea" 
                  placeholder="Type your comment"
                  disabled
                />
              </div>
              
              <div className="comment-login-prompt">
                <p className="comment-login-text">
                  Please login to write a comment
                </p>
                <button 
                  className="comment-signin-button"
                  onClick={handleSignIn}
                >
                  Sign In
                </button>
              </div>
            </div>
          ) : (
            <div className="comment-input-section-authenticated">
              <form onSubmit={handleSubmit} className="comment-box-container">
                <textarea 
                  className="comment-textarea-premium" 
                  placeholder={isSubmitted ? "Share what’s on your mind" : "comment"}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="comment-submit-btn-inner"
                  disabled={!commentText.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <ArrowUp size={20} className="animate-pulse opacity-50" />
                  ) : (
                    <ArrowUp size={20} />
                  )}
                </button>
              </form>

              <p className="prohibited-policy-text">
                <Info size={14} className="text-gray-400" />
                Please ensure your comment complies with the <a href="#" className="underline text-blue-600">Prohibited Content Policy</a>
              </p>

              {isSubmitted && (
                <div className="comment-list mt-8">
                  <div className="comment-item">
                    <div className="comment-avatar">V</div>
                    <div className="comment-body">
                      <div className="flex items-center">
                        <span className="comment-user-name">Vseyal</span>
                        <span className="comment-user-badge">You</span>
                      </div>
                      <p className="comment-time">just now</p>
                      <p className="comment-content-text">{commentText}</p>
                    </div>
                  </div>

                  <div className="comment-review-notice">
                    <div className="flex items-center gap-2">
                      <Info size={14} />
                      <span>Your message is currently under review, and we will notify you soon.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isSubmitted && (
            <div className="comment-empty-state">
              {/* No comments yet */}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
