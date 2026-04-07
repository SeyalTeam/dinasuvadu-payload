"use client";

import { useEffect, useState } from "react";

interface PostImageActionsProps {
  url: string;
  title: string;
  description?: string;
}

const FONT_SCALE_KEY = "dinasuvadu_article_font_scale";
const BOOKMARK_KEY = "dinasuvadu_saved_posts";
const MIN_FONT_SCALE = 0.9;
const MAX_FONT_SCALE = 1.25;
const FONT_SCALE_STEP = 0.05;

function clampScale(value: number): number {
  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, value));
}

export default function PostImageActions({
  url,
  title,
  description,
}: PostImageActionsProps) {
  const [fontScale, setFontScale] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const storedScale = Number(
      window.localStorage.getItem(FONT_SCALE_KEY) || "1"
    );
    const nextScale = Number.isFinite(storedScale) ? clampScale(storedScale) : 1;
    setFontScale(nextScale);

    const storedBookmarks = JSON.parse(
      window.localStorage.getItem(BOOKMARK_KEY) || "[]"
    ) as string[];
    setIsSaved(storedBookmarks.includes(url));
  }, [url]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--article-font-scale",
      String(fontScale)
    );
    window.localStorage.setItem(FONT_SCALE_KEY, String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || "Check out this article",
          url,
        });
        return;
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          (error as { name?: string }).name === "AbortError"
        ) {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copied");
    } catch {
      setToast("Unable to copy link");
    }
  };

  const handleBookmark = () => {
    const savedList = JSON.parse(
      window.localStorage.getItem(BOOKMARK_KEY) || "[]"
    ) as string[];

    if (savedList.includes(url)) {
      const updated = savedList.filter((item) => item !== url);
      window.localStorage.setItem(BOOKMARK_KEY, JSON.stringify(updated));
      setIsSaved(false);
      setToast("Removed from saved");
      return;
    }

    const updated = Array.from(new Set([...savedList, url]));
    window.localStorage.setItem(BOOKMARK_KEY, JSON.stringify(updated));
    setIsSaved(true);
    setToast("Saved");
  };

  return (
    <>
      <div className="post-image-actions" role="group" aria-label="Post actions">
        <div className="post-image-actions-inner">
          <button
            type="button"
            className="post-image-action-button"
            aria-label="Share this article"
            onClick={handleShare}
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M14 4L21 10.5L14 17"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 10.5H10C7 10.5 4.5 12.7 4 15.6"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <button
            type="button"
            className="post-image-action-button"
            aria-label={isSaved ? "Remove bookmark" : "Save article"}
            aria-pressed={isSaved}
            onClick={handleBookmark}
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M7.5 4H16.5C17.3 4 18 4.7 18 5.5V20L12 16.3L6 20V5.5C6 4.7 6.7 4 7.5 4Z"
                stroke="currentColor"
                strokeWidth="1.9"
                fill={isSaved ? "currentColor" : "none"}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            className="post-image-action-button post-image-action-text"
            aria-label="Increase text size"
            onClick={() =>
              setFontScale((current) =>
                clampScale(Number((current + FONT_SCALE_STEP).toFixed(2)))
              )
            }
          >
            A+
          </button>

          <button
            type="button"
            className="post-image-action-button post-image-action-text"
            aria-label="Decrease text size"
            onClick={() =>
              setFontScale((current) =>
                clampScale(Number((current - FONT_SCALE_STEP).toFixed(2)))
              )
            }
          >
            A-
          </button>
        </div>
      </div>

      {toast ? (
        <div className="post-image-action-toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </>
  );
}
