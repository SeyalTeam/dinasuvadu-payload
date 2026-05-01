"use server";

import { getPayload } from "payload";
import config from "@/payload.config";
import { resolvePostPathForContext } from "@/lib/post-url";

type Post = {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  heroImage?: {
    url: string;
    alt?: string;
  };
  meta?: {
    description?: string;
  };
};

async function fetchParentCategory(parentId: string) {
  const payload = await getPayload({ config });
  const res = await payload.findByID({
    collection: "categories",
    id: parentId,
    depth: 1,
  });
  return res || null;
}

export async function fetchCategoryPostsAction(
  categoryId: string,
  categorySlug: string,
  page: number = 1,
  limit: number = 5,
  offset: number = 0
) {
  try {
    const payload = await getPayload({ config });
    
    // Fetch child categories to include their posts (same logic as page.tsx)
    const childrenRes = await payload.find({
      collection: "categories",
      where: {
        parent: {
          equals: categoryId,
        },
      },
      depth: 0,
      limit: 100,
    });

    const childIds = childrenRes.docs.map((c: any) => c.id);
    const allCategoryIds = [categoryId, ...childIds];

    const response = await payload.find({
      collection: "posts",
      limit,
      page: offset > 0 ? (Math.floor(offset / limit) + 1) : page,
      depth: 2,
      sort: "-publishedAt",
      where: {
        categories: {
          in: allCategoryIds,
        },
      },
    });

    const posts = await Promise.all(
      response.docs.map(async (doc: any) => {
        const postLink = await resolvePostPathForContext(
          doc,
          { topLevelSlug: categorySlug },
          fetchParentCategory as any
        );
        return {
          id: doc.id,
          title: doc.title,
          slug: doc.slug,
          publishedAt: doc.publishedAt,
          heroImage: doc.heroImage,
          meta: doc.meta,
          postLink,
        };
      })
    );

    return {
      posts,
      hasNextPage: response.hasNextPage,
      totalDocs: response.totalDocs,
    };
  } catch (error) {
    console.error("Error in fetchCategoryPostsAction:", error);
    return {
      posts: [],
      hasNextPage: false,
      totalDocs: 0,
    };
  }
}
