import { preload } from "react-dom";

export function preloadLcpImage(url: string | null | undefined): void {
  if (!url) return;
  preload(url, { as: "image", fetchPriority: "high" });
}
