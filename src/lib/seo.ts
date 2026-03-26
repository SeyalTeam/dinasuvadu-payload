// Centralised SEO helper for Next.js App Router
import type { Metadata } from "next";

/**
 * Build a Metadata object for a page.
 */
export function buildMetadata({
  title,
  description,
  imageUrl,
  type = "website",
  canonical,
}: {
  title: string;
  description: string;
  imageUrl?: string;
  type?: "article" | "website";
  canonical?: string;
}): Metadata {
  const ogImage = imageUrl ?? "/website-template-OG.webp"; // fallback image in public folder
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    // Next.js supports canonical via alternates.canonical
    alternates: canonical ? { canonical } : undefined,
  };
}

/**
 * Build JSON‑LD for BreadcrumbList schema.
 * Accepts an ordered array of { name, url } objects.
 */
export function buildBreadcrumbLd(items: { name: string; url: string }[]): string {
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
  return JSON.stringify(ld);
}
