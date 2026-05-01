/**
 * Utilities for calculating post reading time.
 */

/**
 * Estimates reading time in minutes based on word count.
 * @param text The plain text content of the post.
 * @param speed Words per minute (default 160 for Tamil/complex scripts).
 */
export function estimateReadTimeMinutes(text: string, speed: number = 160): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words < 1) return 1;
  return Math.max(1, Math.ceil(words / speed));
}

/**
 * Strips HTML tags from a string.
 */
export function stripHtml(value: string): string {
  return value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";
}

/**
 * Extracts plain text from Lexical rich text content.
 */
export function extractPlainTextFromRichText(content: any): string {
  if (!content?.root?.children) return "";
  return content.root.children
    .map((block: any) => {
      if (block && block.children && Array.isArray(block.children)) {
        return block.children.map((child: any) => child?.text || "").join("");
      }
      return "";
    })
    .join("\n");
}

/**
 * Calculates the total reading time for a post by combining all text fields.
 */
export function calculateReadingTime(post: any): number {
  const postContent = post.content ? extractPlainTextFromRichText(post.content) : "";
  const layoutContentText = (post.layout ?? [])
    .map((block: any) => {
      if (block.blockType === "content" && block.content) {
        return stripHtml(block.content);
      }
      return "";
    })
    .join(" ");
  
  const fullContentText = `${post.title || ""} ${postContent} ${layoutContentText} ${post.meta?.description || ""}`;
  return estimateReadTimeMinutes(fullContentText);
}
