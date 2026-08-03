"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export default function AdSenseAd() {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // Silently ignore — ad blocker or script not yet loaded
    }
  }, []);

  return (
    <div
      className="adsense-container"
      style={{ margin: "24px 0", overflow: "hidden", textAlign: "center" }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-3178237798172468"
        data-ad-slot="1904211788"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
