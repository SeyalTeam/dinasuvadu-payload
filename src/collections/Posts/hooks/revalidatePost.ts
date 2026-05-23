import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { Post } from '../../../payload-types'
import { resolveCanonicalPostPath } from '@/lib/post-url'

export const revalidatePost: CollectionAfterChangeHook<Post> = async ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    const resolveParentCategory = async (id: string) => {
      try {
        const cat = await payload.findByID({
          collection: 'categories',
          id,
          depth: 0,
        });
        return { slug: cat?.slug };
      } catch {
        return null;
      }
    };

    if (doc._status === 'published') {
      const canonicalPath = await resolveCanonicalPostPath(doc as any, resolveParentCategory);

      payload.logger.info(`Revalidating post at path: ${canonicalPath}`)
      revalidatePath(canonicalPath)

      const ampPath = `/amp${canonicalPath}`
      payload.logger.info(`Revalidating AMP post at path: ${ampPath}`)
      revalidatePath(ampPath)

      revalidateTag('posts-sitemap')

      // If the post was already published and the slug or category changed,
      // also revalidate the OLD canonical + /amp paths to bust stale caches.
      if (previousDoc?._status === 'published') {
        const oldCanonicalPath = await resolveCanonicalPostPath(previousDoc as any, resolveParentCategory);
        if (oldCanonicalPath !== canonicalPath) {
          payload.logger.info(`Slug/category changed — revalidating old path: ${oldCanonicalPath}`)
          revalidatePath(oldCanonicalPath)
          revalidatePath(`/amp${oldCanonicalPath}`)
        }
      }
    }

    // If the post was previously published, we need to revalidate the old path
    if (previousDoc?._status === 'published' && doc._status !== 'published') {
      const oldCanonicalPath = await resolveCanonicalPostPath(previousDoc as any, resolveParentCategory);

      payload.logger.info(`Revalidating old post at path: ${oldCanonicalPath}`)
      revalidatePath(oldCanonicalPath)

      const oldAmpPath = `/amp${oldCanonicalPath}`
      payload.logger.info(`Revalidating old AMP post at path: ${oldAmpPath}`)
      revalidatePath(oldAmpPath)

      revalidateTag('posts-sitemap')
    }
  }
  return doc

}

export const revalidateDelete: CollectionAfterDeleteHook<Post> = async ({ 
  doc, 
  req: { payload, context } 
}) => {
  if (!context.disableRevalidate && doc) {
    const resolveParentCategory = async (id: string) => {
      try {
        const cat = await payload.findByID({
          collection: 'categories',
          id,
          depth: 0,
        });
        return { slug: cat?.slug };
      } catch {
        return null;
      }
    };

    const canonicalPath = await resolveCanonicalPostPath(doc as any, resolveParentCategory);

    payload.logger.info(`Revalidating deleted post at path: ${canonicalPath}`)
    revalidatePath(canonicalPath)

    const ampPath = `/amp${canonicalPath}`
    payload.logger.info(`Revalidating deleted AMP post at path: ${ampPath}`)
    revalidatePath(ampPath)

    revalidateTag('posts-sitemap')
  }

  return doc
}
