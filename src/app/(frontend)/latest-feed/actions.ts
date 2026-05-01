"use server";

import { getPayload } from "payload";
import config from "@/payload.config";
import { resolveCanonicalPostPath } from "@/lib/post-url";
import { calculateReadingTime } from "@/utilities/readingTime";

type Post = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  heroImage?: {
    url: string;
    alt?: string;
  };
  categories?: {
    title: string;
    slug: string;
    parent?: any;
  }[];
  meta?: {
    description?: string;
  };
  content?: any;
  layout?: any;
  readingTime?: number;
};

async function fetchParentCategory(parentId: string) {
  const payload = await getPayload({ config });
  return await payload.findByID({
    collection: "categories",
    id: parentId,
  });
}

export async function fetchMorePostsAction(page: number, limit: number = 10) {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "posts",
      limit,
      page,
      sort: "-publishedAt",
      where: {
        _status: {
          equals: "published",
        },
      },
      depth: 2,
    });

    const posts = res.docs as unknown as Post[];
    
    // Resolve URLs and calculate reading time on the server before sending to client
    const postsWithDetails = await Promise.all(
      posts.map(async (post) => ({
        ...post,
        url: await resolveCanonicalPostPath(post, fetchParentCategory as any),
        readingTime: calculateReadingTime(post)
      }))
    );

    return {
      posts: postsWithDetails,
      hasNextPage: res.hasNextPage,
      totalDocs: res.totalDocs,
    };
  } catch (err) {
    console.error("Error in fetchMorePostsAction:", err);
    return {
      posts: [],
      hasNextPage: false,
      totalDocs: 0,
    };
  }
}
