import type { FieldHook } from 'payload'

export const formatSlug = (val: string): string => {
  if (!val) return ''
  return val
    .replace(/ /g, '-')
    // Use Unicode aware word boundaries to support non-English characters
    .replace(/[^\p{L}\p{N}-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .toLowerCase()
}
export const formatSlugHook =
  (fallback: string): FieldHook =>
  ({ data, operation, value }) => {
    if (typeof value === 'string') {
      return formatSlug(value)
    }

    if (operation === 'create' || !data?.slug) {
      const fallbackData = data?.[fallback] || data?.[fallback]

      if (fallbackData && typeof fallbackData === 'string') {
        // Append the post ID if it exists
        const postId = data?.id ? `-${data.id}` : ''
        return `${formatSlug(fallbackData)}${postId}`
      }
    }

    return value
  }
