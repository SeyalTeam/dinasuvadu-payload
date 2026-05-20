import { preload } from "react-dom";
import type { HeroImageSources } from "@/lib/post-images";

export function preloadLcpImage(
  sources: HeroImageSources | string | null | undefined
): void {
  if (!sources) return;

  if (typeof sources === "string") {
    preload(sources, { as: "image", fetchPriority: "high" });
    return;
  }

  if (sources.mobileSrcSet) {
    preload(sources.preloadSrc, {
      as: "image",
      fetchPriority: "high",
      imageSrcSet: sources.mobileSrcSet,
      imageSizes: "(max-width: 640px) 100vw",
    });
    return;
  }

  preload(sources.preloadSrc, { as: "image", fetchPriority: "high" });
}
