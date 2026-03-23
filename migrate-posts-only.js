import dotenv from 'dotenv'
import fs from 'fs'
import { parseStringPromise } from 'xml2js'
import { MongoClient, ObjectId } from 'mongodb'
import { parse } from 'node-html-parser'

dotenv.config()

const { MONGODB_URI } = process.env

function getFilenameFromUrl(url) {
  return url.split('/').pop()
}

function getExtension(filename) {
  return filename.split('.').pop().toLowerCase()
}

function getMimeType(extension) {
  if (extension === 'jpg') return 'image/jpeg'
  return `image/${extension}`
}

function parseDate(dateString) {
  return dateString ? new Date(dateString + ' GMT') : new Date()
}

function extractMeta(postmeta) {
  const meta = {}
  for (const m of postmeta || []) {
    const key = m['wp:meta_key']?.[0]
    const value = m['wp:meta_value']?.[0]
    if (key === '_thumbnail_id') meta.thumbnailId = value
    if (key === '_custom_summary') meta.summary = value
  }
  return meta
}

function extractTags(categories) {
  return (categories || [])
    .filter((cat) => cat.$.domain === 'post_tag')
    .map((cat) => cat._?.replace(/^#/, '').trim())
    .filter(Boolean)
}

function extractCategory(categories, linkUrl) {
  const cats = (categories || []).filter((c) => c.$.domain === 'category')
  let pathParts = []
  try {
    pathParts = new URL(linkUrl).pathname.split('/').filter(Boolean)
  } catch (err) {
    console.warn(`Invalid URL for category extraction: ${linkUrl}`)
  }
  for (let i = pathParts.length - 1; i >= 0; i--) {
    const match = cats.find((c) => c.$.nicename === pathParts[i])
    if (match) return match
  }
  return cats[0] || null
}

function generateObjectId() {
  return new ObjectId().toHexString()
}

async function htmlToLexical(htmlContent, media, createdAt, updatedAt) {
  const root = parse(htmlContent)
  const children = []
  let currentParagraph = []

  const pushParagraph = () => {
    if (currentParagraph.length) {
      children.push({
        children: currentParagraph,
        direction: 'ltr',
        format: 'start',
        indent: 0,
        type: 'paragraph',
        version: 1,
        textFormat: currentParagraph.some((n) => n.format !== 0) ? 1 : 0,
        textStyle: '',
      })
      currentParagraph = []
    }
  }

  async function processNode(node) {
    if (node.nodeType === 3) {
      // Text node
      const text = node.text
      const parts = text.split(/\n{2,}/g).map((p) => p.trim()).filter((p) => p)
      parts.forEach((part, index) => {
        if (index > 0) pushParagraph()
        currentParagraph.push({
          detail: 0, format: 0, mode: 'normal', style: '', text: part, type: 'text', version: 1,
        })
      })
      if (text.match(/\n\s*$/)) pushParagraph()
    } else if (node.nodeType === 1 && node.tagName === 'STRONG') {
      const text = node.text
      const parts = text.split(/\n{2,}/g).map((p) => p.trim()).filter((p) => p)
      parts.forEach((part, index) => {
        if (index > 0) pushParagraph()
        currentParagraph.push({
          detail: 0, format: 1, mode: 'normal', style: '', text: part, type: 'text', version: 1,
        })
      })
      if (text.match(/\n\s*$/)) pushParagraph()
    } else if (node.nodeType === 1 && node.tagName === 'IFRAME') {
      const src = node.getAttribute('src') || ''
      if (src.startsWith('https://www.youtube.com/embed/') || 
          src.startsWith('https://www.facebook.com/plugins/') ||
          src.startsWith('https://www.linkedin.com/embed/')) {
        pushParagraph()
        children.push({
          type: 'block', version: 2, format: '',
          fields: {
            id: generateObjectId(), url: node.outerHTML, blockName: '', blockType: 'embed',
          },
        })
      }
    } else if (node.nodeType === 1 && node.tagName === 'IMG') {
      pushParagraph()
      const src = node.getAttribute('src')
      if (!src) return
      const alt = node.getAttribute('alt') || ''
      const urlObj = new URL(src)
      const pathname = urlObj.pathname
      const parts = pathname.split('/').filter(Boolean)
      const filename = parts.pop()
      const extension = getExtension(filename)

      let mediaId
      const existing = await media.findOne({ filename })
      if (existing) {
        mediaId = existing._id
      } else {
        const mediaDoc = {
          _id: new ObjectId(),
          createdAt,
          updatedAt,
          alt,
          filename,
          mimeType: getMimeType(extension),
          filesize: 0, // Placeholder
          width: 800, // Placeholder
          height: 600, // Placeholder
          focalX: 0, focalY: 0,
          sizes: {}, // Skip generating sizes for now since they are skipping image download
          __v: 0,
        }
        const result = await media.insertOne(mediaDoc)
        mediaId = result.insertedId
      }

      children.push({
        type: 'block', version: 2, format: '',
        fields: { id: generateObjectId(), media: mediaId, blockName: '', blockType: 'mediaBlock' },
      })
    } else if (node.nodeType === 1 && /^H[1-6]$/.test(node.tagName)) {
      pushParagraph()
      const headingChildren = []
      const oldCurrent = currentParagraph
      currentParagraph = headingChildren
      for (const child of node.childNodes) {
        await processNode(child)
      }
      currentParagraph = oldCurrent
      children.push({
        children: headingChildren, direction: 'ltr', format: 'start', indent: 0, type: 'heading',
        version: 1, tag: node.tagName.toLowerCase(),
        textFormat: headingChildren.some((n) => n.format !== 0) ? 1 : 0, textStyle: '',
      })
    } else if (node.nodeType === 1 && (node.tagName === 'P' || node.tagName === 'DIV' || node.tagName === 'BLOCKQUOTE')) {
      if (node.tagName === 'BLOCKQUOTE' && (node.classNames.includes('twitter-tweet') || node.classNames.includes('instagram-media'))) {
         let embedHtml = node.outerHTML
         pushParagraph()
         children.push({
           type: 'block', version: 2, format: '',
           fields: { id: generateObjectId(), url: embedHtml, blockName: '', blockType: 'embed' },
         })
      } else {
         pushParagraph()
         for (const child of node.childNodes) {
           await processNode(child)
         }
      }
    } else {
      await processNode(node)
    }
  }

  const nodes = root.childNodes
  for (const node of nodes) {
    await processNode(node)
  }
  pushParagraph()

  if (!children.length) {
    children.push({
      children: [], direction: null, format: 'start', indent: 0, type: 'paragraph', version: 1, textFormat: 0, textStyle: '',
    })
  }

  return { root: { children, direction: 'ltr', format: '', indent: 0, type: 'root', version: 1, textFormat: children.some((p) => p.textFormat !== 0) ? 1 : 0 } }
}

async function main() {
  const xmlFile = process.argv[2] || './post.xml'
  console.log(`📡 Reading XML data from ${xmlFile}...`)
  const xml = fs.readFileSync(xmlFile, 'utf8')
  const result = await parseStringPromise(xml)
  const items = result.rss.channel[0].item || []

  console.log(`🔌 Connecting to MongoDB cluster...`)
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db()

  const posts = db.collection('posts')
  const tags = db.collection('tags')
  const media = db.collection('media')
  const categories = db.collection('categories')
  const authors = db.collection('users')
  const postsVersions = db.collection('_posts_versions')

  const mediaMap = new Map()
  for (const item of items) {
    if (item['wp:post_type']?.[0] === 'attachment') {
      const id = item['wp:post_id']?.[0]
      mediaMap.set(id, item)
    }
  }

  console.log(`🚀 Starting migration of ${items.length} items (ignoring S3 upload/download)...`)
  for (const item of items) {
    if (item['wp:post_type']?.[0] !== 'post') continue

    const postId = parseInt(item['wp:post_id']?.[0], 10)
    const existingPost = await posts.findOne({ customId: postId })
    if (existingPost) {
      console.log(`⏩ Skipping existing post: ${item.title?.[0] || 'Untitled'}`)
      continue
    }

    const title = item.title?.[0] || 'Untitled'
    const slugBase = item['wp:post_name']?.[0] || title.toLowerCase().replace(/\s+/g, '-')
    const slug = `${slugBase}-${postId}`
    const contentText = item['content:encoded']?.[0] || ''
    const metaRaw = extractMeta(item['wp:postmeta'])
    const createdAt = parseDate(item['wp:post_date_gmt']?.[0])
    const updatedAt = parseDate(item['wp:post_modified_gmt']?.[0])
    const tagNames = extractTags(item.category)
    const linkUrl = item.link?.[0] || ''
    const creatorName = item['dc:creator']?.[0]?.trim().toLowerCase() || 'admin'

    let tagIds = []
    for (const name of tagNames) {
      const tagSlug = name.toLowerCase().replace(/\s+/g, '-')
      let tagDoc = await tags.findOne({ slug: tagSlug })
      if (!tagDoc) {
        tagDoc = { _id: new ObjectId(), name, slug: tagSlug, slugLock: true, createdAt, updatedAt, __v: 0 }
        await tags.insertOne(tagDoc)
      }
      tagIds.push(tagDoc._id)
    }

    const catObj = extractCategory(item.category, linkUrl)
    const catSlug = catObj?.$?.nicename || 'uncategorized'
    const catName = catObj?._ || 'Uncategorized'

    let categoryDoc = await categories.findOne({ slug: catSlug })
    if (!categoryDoc) {
      categoryDoc = { _id: new ObjectId(), name: catName, slug: catSlug, slugLock: true, createdAt, updatedAt, __v: 0 }
      await categories.insertOne(categoryDoc)
    }

    let authorDoc = await authors.findOne({ name: creatorName })
    if (!authorDoc) {
      authorDoc = { _id: new ObjectId(), name: creatorName, email: `${creatorName}@example.com`, role: 'admin', createdAt, updatedAt, __v: 0 }
      await authors.insertOne(authorDoc)
    }

    let heroImageId = null
    if (metaRaw.thumbnailId && mediaMap.has(metaRaw.thumbnailId)) {
      const mediaItem = mediaMap.get(metaRaw.thumbnailId)
      const url = mediaItem['wp:attachment_url']?.[0] || mediaItem.guid?.[0]
      let attachedFile = getFilenameFromUrl(url)
      let alt = mediaItem.title?.[0] || 'image'
      for (const m of mediaItem['wp:postmeta'] || []) {
        const key = m['wp:meta_key']?.[0]
        const value = m['wp:meta_value']?.[0]
        if (key === '_wp_attached_file') attachedFile = value
        if (key === '_wp_attachment_image_alt') alt = value || alt
      }
      const baseFilename = attachedFile.split('/').pop()
      const extension = getExtension(baseFilename)

      const existing = await media.findOne({ filename: baseFilename })
      if (existing) {
        heroImageId = existing._id
      } else {
        const mediaCreatedAt = parseDate(mediaItem['wp:post_date_gmt']?.[0])
        const mediaUpdatedAt = parseDate(mediaItem['wp:post_modified_gmt']?.[0])

        const mediaDoc = {
          _id: new ObjectId(), createdAt: mediaCreatedAt, updatedAt: mediaUpdatedAt, alt,
          filename: baseFilename, mimeType: getMimeType(extension),
          filesize: 0, width: 800, height: 600, focalX: 0, focalY: 0, sizes: {}, __v: 0,
        }
        await media.insertOne(mediaDoc)
        heroImageId = mediaDoc._id
      }
    }

    const lexicalContent = await htmlToLexical(contentText, media, createdAt, updatedAt)

    const postDoc = {
      _id: new ObjectId(), createdAt, updatedAt,
      meta: { title, image: heroImageId, description: metaRaw.summary || '' },
      customId: postId, slugLock: false, _status: 'published', __v: 0,
      authors: [authorDoc._id], categories: [categoryDoc._id], content: lexicalContent,
      heroImage: heroImageId, populatedAuthors: [], publishedAt: createdAt, slug, tags: tagIds, title,
    }

    await posts.insertOne(postDoc)

    const versionDoc = {
      _id: new ObjectId(), parent: postDoc._id,
      version: postDoc,
      createdAt, updatedAt, latest: true, autosave: false, __v: 0,
    }
    // Delete customId from version payload since payload keeps it clean
    delete versionDoc.version._id
    delete versionDoc.version.createdAt
    delete versionDoc.version.updatedAt
    
    await postsVersions.insertOne(versionDoc)
    console.log('✅ Migrated post:', title)
  }

  await client.close()
  console.log('🎉 All posts successfully migrated!')
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
