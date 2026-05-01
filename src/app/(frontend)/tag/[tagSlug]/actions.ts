"use server";

import { getPayload } from "payload";
import config from "@/payload.config";
import { resolvePostPathForContext } from "@/lib/post-url";

async function fetchParentCategory(parentId: string) {
  const payload = await getPayload({ config });
  const res = await payload.findByID({
    collection: "categories",
    id: parentId,
    depth: 1,
  });
  return res || null;
}

export async function fetchTagPostsAction(
  tagId: string,
  limit: number = 5,
  offset: number = 0
) {
  try {
    const payload = await getPayload({ config });
    const page = Math.floor(offset / limit) + 1;

    const response = await payload.find({
      collection: "posts",
      limit,
      page,
      depth: 2,
      sort: "-publishedAt",
      where: {
        tags: {
          contains: tagId,
        },
      },
    });

    const posts = await Promise.all(
      response.docs.map(async (doc: any) => {
        const postLink = await resolvePostPathForContext(
          doc,
          {},
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
    console.error("Error in fetchTagPostsAction:", error);
    return { posts: [], hasNextPage: false, totalDocs: 0 };
  }
}
