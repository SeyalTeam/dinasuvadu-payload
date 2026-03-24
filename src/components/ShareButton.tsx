"use client";

import { message } from "antd";
import { MouseEvent } from "react";

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
}

export default function ShareButton({
  url,
  title,
  description,
}: ShareButtonProps) {
  const handleShare = async (e: MouseEvent) => {
    e.stopPropagation();

    const shareUrl = url;

    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description || "Check out this post!",
          url: shareUrl,
        });
        console.log("Shared successfully");
      } catch (err) {
        console.error("Error sharing:", err);
        message.error("Failed to share the post.");
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        message.success("Link copied to clipboard!");
      } catch (err) {
        console.error("Error copying to clipboard:", err);
        message.error("Failed to copy link.");
      }
    }
  };

  return (
    <span
      className="shareButton"
      onClick={handleShare}
      style={{ cursor: "pointer", marginLeft: "8px" }}
    >
      <svg
        width="22"
        height="18"
        viewBox="0 0 22 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_4600_28)">
          <path
            d="M0.656855 18.3763C0.57123 18.3767 0.486122 18.363 0.40498 18.3356C0.235292 18.2805 0.088454 18.1711 -0.0128684 18.0243C-0.114191 17.8774 -0.164364 17.7013 -0.155645 17.5231C-0.155645 17.4013 0.68123 5.60375 12.5112 4.6775V0.436251C12.5111 0.274716 12.5591 0.116806 12.6491 -0.0173126C12.7392 -0.151431 12.8671 -0.255668 13.0167 -0.316712C13.1662 -0.377755 13.3306 -0.392834 13.4888 -0.360022C13.6469 -0.32721 13.7917 -0.247996 13.9047 -0.132499L21.924 8.0575C22.0729 8.20938 22.1563 8.41358 22.1563 8.62625C22.1563 8.83893 22.0729 9.04312 21.924 9.195L13.9047 17.385C13.7917 17.5005 13.6469 17.5797 13.4888 17.6125C13.3306 17.6453 13.1662 17.6303 13.0167 17.5692C12.8671 17.5082 12.7392 17.4039 12.6491 17.2698C12.5591 17.1357 12.5111 16.9778 12.5112 16.8163V12.6563C4.61373 12.9569 1.37592 17.9375 1.34342 17.9984C1.27012 18.1142 1.16873 18.2095 1.0487 18.2756C0.928659 18.3416 0.793867 18.3763 0.656855 18.3763ZM14.1362 2.42688V5.43719C14.1364 5.64784 14.0547 5.85031 13.9084 6.00189C13.7621 6.15347 13.5627 6.24232 13.3522 6.24969C5.69842 6.53 2.96029 11.6284 1.97717 14.9069C4.00842 13.1519 7.6281 11.0069 13.275 11.0069H13.3115C13.527 11.0069 13.7337 11.0925 13.8861 11.2449C14.0384 11.3972 14.124 11.6039 14.124 11.8194V14.8297L20.2178 8.63031L14.1362 2.42688Z"
            fill="#A0A0A0"
          ></path>
        </g>
        <defs>
          <clipPath id="clip0_4600_28">
            <rect width="22" height="18" fill="white"></rect>
          </clipPath>
        </defs>
      </svg>
    </span>
  );
}
