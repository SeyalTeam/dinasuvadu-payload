import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { Post } from '../../../payload-types'
import { resolveCanonicalPostPath, resolvePostPathCandidates } from '@/lib/post-url'

const revalidatePostDiscoverySurfaces = (payload: any) => {
  const paths = [
    '/',
    '/latest-feed',
    '/feed',
    '/sitemap.xml',
    '/sitemap-0.xml',
    '/sitemap-news.xml',
    '/sitemap-post/1',
    '/sitemap-post/1.xml',
    '/sitemap-post-1.xml',
  ]

  for (const path of paths) {
    payload.logger.info(`Revalidating discovery surface: ${path}`)
    try {
      revalidatePath(path)
    } catch (e) {
      payload.logger.error(`Error revalidating path ${path}: ${e}`)
    }
  }

  revalidateTag('published-posts')
  revalidateTag('homepage-latest-posts')
  revalidateTag('homepage-category-posts')
  revalidateTag('posts-sitemap')
}

// Hydrate categories and parentCategory if they are stored as raw IDs or unpopulated references
async function hydratePostCategories(post: any, payload: any) {
  if (!post) return post
  const hydrated = { ...post }

  if (Array.isArray(post.categories) && post.categories.length > 0) {
    hydrated.categories = await Promise.all(
      post.categories.map(async (cat: any) => {
        if (typeof cat === 'object' && cat !== null && cat.slug) {
          return cat
        }
        const id = typeof cat === 'object' && cat !== null ? cat.id || cat._id : cat
        if (!id) return null
        try {
          const fetched = await payload.findByID({
            collection: 'categories',
            id: String(id),
            depth: 1,
          })
          return fetched || null
        } catch {
          return null
        }
      }),
    ).then((cats) => cats.filter(Boolean))
  }

  if (post.parentCategory) {
    if (typeof post.parentCategory !== 'object' || !post.parentCategory.slug) {
      const id =
        typeof post.parentCategory === 'object' && post.parentCategory !== null
          ? post.parentCategory.id || post.parentCategory._id
          : post.parentCategory
      if (id) {
        try {
          hydrated.parentCategory = await payload.findByID({
            collection: 'categories',
            id: String(id),
            depth: 0,
          })
        } catch {
          // ignore
        }
      }
    }
  }

  return hydrated
}

function revalidateCategoryArchivePaths(paths: string[], payload: any) {
  const categoryPaths = new Set<string>()
  for (const path of paths) {
    const segments = path.split('/').filter(Boolean)
    if (segments.length === 2) {
      // /categorySlug/postSlug
      categoryPaths.add(`/${segments[0]}`)
    } else if (segments.length >= 3) {
      // /parentSlug/subCategorySlug/postSlug
      categoryPaths.add(`/${segments[0]}`)
      categoryPaths.add(`/${segments[0]}/${segments[1]}`)
    }
  }
  for (const catPath of categoryPaths) {
    payload.logger.info(`Revalidating category archive path: ${catPath}`)
    try {
      revalidatePath(catPath)
    } catch (e) {
      payload.logger.error(`Error revalidating category path ${catPath}: ${e}`)
    }
  }
}

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
          id: String(id),
          depth: 0,
        })
        return { slug: cat?.slug }
      } catch {
        return null
      }
    }

    if (doc._status === 'published') {
      const hydratedDoc = await hydratePostCategories(doc, payload)
      const canonicalPath = await resolveCanonicalPostPath(hydratedDoc as any, resolveParentCategory)

      payload.logger.info(`Revalidating post at path: ${canonicalPath}`)
      revalidatePath(canonicalPath)

      // Revalidate category and subcategory archive pages
      const candidatePaths = await resolvePostPathCandidates(hydratedDoc as any, resolveParentCategory)
      revalidateCategoryArchivePaths(candidatePaths, payload)

      revalidatePostDiscoverySurfaces(payload)

      // If the post was already published and the slug or category changed,
      // also revalidate the OLD canonical and category archive paths to bust stale caches.
      if (previousDoc?._status === 'published') {
        const hydratedPrev = await hydratePostCategories(previousDoc, payload)
        const oldCanonicalPath = await resolveCanonicalPostPath(hydratedPrev as any, resolveParentCategory)
        if (oldCanonicalPath !== canonicalPath) {
          payload.logger.info(`Slug/category changed — revalidating old path: ${oldCanonicalPath}`)
          revalidatePath(oldCanonicalPath)
          const oldCandidatePaths = await resolvePostPathCandidates(hydratedPrev as any, resolveParentCategory)
          revalidateCategoryArchivePaths(oldCandidatePaths, payload)
        }
      }
    }

    // If the post was previously published, we need to revalidate the old path
    if (previousDoc?._status === 'published' && doc._status !== 'published') {
      const hydratedPrev = await hydratePostCategories(previousDoc, payload)
      const oldCanonicalPath = await resolveCanonicalPostPath(hydratedPrev as any, resolveParentCategory)

      payload.logger.info(`Revalidating old post at path: ${oldCanonicalPath}`)
      revalidatePath(oldCanonicalPath)

      const oldCandidatePaths = await resolvePostPathCandidates(hydratedPrev as any, resolveParentCategory)
      revalidateCategoryArchivePaths(oldCandidatePaths, payload)

      revalidatePostDiscoverySurfaces(payload)
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Post> = async ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate && doc) {
    const resolveParentCategory = async (id: string) => {
      try {
        const cat = await payload.findByID({
          collection: 'categories',
          id: String(id),
          depth: 0,
        })
        return { slug: cat?.slug }
      } catch {
        return null
      }
    }

    const hydratedDoc = await hydratePostCategories(doc, payload)
    const canonicalPath = await resolveCanonicalPostPath(hydratedDoc as any, resolveParentCategory)

    payload.logger.info(`Revalidating deleted post at path: ${canonicalPath}`)
    revalidatePath(canonicalPath)

    const candidatePaths = await resolvePostPathCandidates(hydratedDoc as any, resolveParentCategory)
    revalidateCategoryArchivePaths(candidatePaths, payload)

    revalidatePostDiscoverySurfaces(payload)
  }

  return doc
}
