import { getPayload } from 'payload'
import config from './src/payload.config'

async function findPost() {
  const payload = await getPayload({ config })
  const posts = await payload.find({
    collection: 'posts',
    limit: 1,
    depth: 1,
    where: {
      _status: { equals: 'published' }
    }
  })

  if (posts.docs.length > 0) {
    const post = posts.docs[0] as any
    const category = post.categories?.[0]?.slug || 'news'
    console.log(`URL: http://localhost:3001/${category}/${post.slug}`)
  } else {
    console.log('No published posts found.')
  }
  process.exit(0)
}

findPost()
