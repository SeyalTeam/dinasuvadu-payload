import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { parseStringPromise } from 'xml2js'
import { MongoClient, ObjectId } from 'mongodb'
import fetch from 'node-fetch'
import sharp from 'sharp'
import pkg from 'aws-sdk'
import { parse } from 'node-html-parser'

const { S3 } = pkg

dotenv.config()

const { MONGODB_URI, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_REGION, S3_ENDPOINT } =
  process.env

const s3 = new S3({
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_ACCESS_KEY,
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  signatureVersion: 'v4',
})

const SIZE_CONFIGS = {
  thumbnail: { width: 300, height: 169 },
  square: { width: 500, height: 500 },
  small: { width: 600, height: 338 },
  medium: { width: 900, height: 506 },
  og: { width: 1200, height: 630 },
}

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

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function downloadImage(url) {
  const maxRetries = 3

  const tryFetch = async (fetchUrl) => {
    const res = await fetch(fetchUrl)
    if (!res.ok) throw new Error(`Status ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }

  for (let i = 1; i <= maxRetries; i++) {
    try {
      return await tryFetch(url)
    } catch (err) {
      console.warn(`⚠️ Attempt ${i}/${maxRetries} failed for ${url}: ${err.message}`)
      if (i === maxRetries) break
      await delay(1000 * i)
    }
  }

  // Fallback for www.dinasuvadu.com -> dinasuvadu.com
  if (url.includes('www.dinasuvadu.com')) {
    const fallbackUrl = url.replace('www.dinasuvadu.com', 'dinasuvadu.com')
    console.warn(`🔄 Trying fallback URL: ${fallbackUrl}`)
    try {
      return await tryFetch(fallbackUrl)
    } catch (err) {
      throw new Error(`Fallback failed for ${fallbackUrl}: ${err.message}`)
    }
  }

  throw new Error(`Failed to download image after retries: ${url}`)
}

async function uploadToS3(buffer, key, mimeType) {
  const params = {
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ACL: 'public-read',
  }
  await s3.upload(params).promise()
  return `${S3_ENDPOINT.replace(/^https?:\/\//, 'https://')}/${key}`
}

async function generateSizes(originalBuffer, baseName, extension, prefix) {
  const sizes = {}
  for (const [key, { width, height }] of Object.entries(SIZE_CONFIGS)) {
    const resizedKey = `${prefix}${baseName}-${width}x${height}.${extension}`
    const resizedBuffer = await sharp(originalBuffer)
      .resize(width, height)
      .toFormat(extension)
      .toBuffer()
    await uploadToS3(resizedBuffer, resizedKey, getMimeType(extension))
    sizes[key] = {
      width,
      height,
      mimeType: getMimeType(extension),
      filesize: resizedBuffer.length,
      filename: `${baseName}-${width}x${height}.${extension}`,
    }
  }
  return sizes
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
      const parts = text
        .split(/\n{2,}/g)
        .map((p) => p.trim())
        .filter((p) => p)
      parts.forEach((part, index) => {
        if (index > 0) {
          pushParagraph()
        }
        currentParagraph.push({
          detail: 0,
          format: 0,
          mode: 'normal',
          style: '',
          text: part,
          type: 'text',
          version: 1,
        })
      })
      if (text.match(/\n\s*$/)) {
        pushParagraph()
      }
    } else if (node.nodeType === 1 && node.tagName === 'STRONG') {
      const text = node.text
      const parts = text
        .split(/\n{2,}/g)
        .map((p) => p.trim())
        .filter((p) => p)
      parts.forEach((part, index) => {
        if (index > 0) {
          pushParagraph()
        }
        currentParagraph.push({
          detail: 0,
          format: 1,
          mode: 'normal',
          style: '',
          text: part,
          type: 'text',
          version: 1,
        })
      })
      if (text.match(/\n\s*$/)) {
        pushParagraph()
      }
    } else if (
      node.nodeType === 1 &&
      node.tagName === 'IFRAME' &&
      node.getAttribute('src')?.startsWith('https://www.youtube.com/embed/')
    ) {
      pushParagraph()
      children.push({
        type: 'block',
        version: 2,
        format: '',
        fields: {
          id: generateObjectId(),
          url: node.outerHTML,
          blockName: '',
          blockType: 'embed',
        },
      })
    } else if (
      node.nodeType === 1 &&
      node.tagName === 'IFRAME' &&
      node.getAttribute('src')?.startsWith('https://www.facebook.com/plugins/')
    ) {
      pushParagraph()
      children.push({
        type: 'block',
        version: 2,
        format: '',
        fields: {
          id: generateObjectId(),
          url: node.outerHTML,
          blockName: '',
          blockType: 'embed',
        },
      })
    } else if (
      node.nodeType === 1 &&
      node.tagName === 'IFRAME' &&
      node.getAttribute('src')?.startsWith('https://www.linkedin.com/embed/')
    ) {
      pushParagraph()
      children.push({
        type: 'block',
        version: 2,
        format: '',
        fields: {
          id: generateObjectId(),
          url: node.outerHTML,
          blockName: '',
          blockType: 'embed',
        },
      })
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
      const baseName = filename.replace(`.${extension}`, '')
      const uploadsIndex = parts.indexOf('uploads')
      let dirPath = ''
      if (uploadsIndex !== -1) {
        dirPath =
          parts.slice(uploadsIndex + 1).join('/') + (parts.length > uploadsIndex + 1 ? '/' : '')
      }
      const prefix = `uploads/${dirPath}`

      let mediaId
      const existing = await media.findOne({ filename })
      if (existing) {
        mediaId = existing._id
      } else {
        try {
          const buffer = await downloadImage(src)
          const metadata = await sharp(buffer).metadata()
          await uploadToS3(buffer, prefix + filename, getMimeType(extension))
          const sizes = await generateSizes(buffer, baseName, extension, prefix)

          const mediaDoc = {
            _id: new ObjectId(),
            createdAt,
            updatedAt,
            alt,
            filename,
            mimeType: getMimeType(extension),
            filesize: buffer.length,
            width: metadata.width,
            height: metadata.height,
            focalX: 0,
            focalY: 0,
            sizes,
            __v: 0,
          }
          const result = await media.insertOne(mediaDoc)
          mediaId = result.insertedId
          await delay(300)
        } catch (err) {
          console.error(`⚠️ Failed inline image upload: ${src}`, err.message)
          return
        }
      }

      children.push({
        type: 'block',
        version: 2,
        format: '',
        fields: {
          id: generateObjectId(),
          media: mediaId,
          blockName: '',
          blockType: 'mediaBlock',
        },
      })
    }
  }

  const nodes = root.childNodes
  let i = 0
  while (i < nodes.length) {
    const node = nodes[i]

    if (
      node.nodeType === 1 &&
      node.tagName === 'BLOCKQUOTE' &&
      node.classNames.includes('twitter-tweet')
    ) {
      let embedHtml = node.outerHTML
      let j = i + 1
      while (j < nodes.length && nodes[j].nodeType === 3 && nodes[j].text.trim() === '') j++
      if (
        j < nodes.length &&
        nodes[j].nodeType === 1 &&
        nodes[j].tagName === 'SCRIPT' &&
        nodes[j].getAttribute('src') === 'https://platform.twitter.com/widgets.js'
      ) {
        embedHtml += nodes[j].outerHTML
        i = j
      }

      pushParagraph()

      children.push({
        type: 'block',
        version: 2,
        format: '',
        fields: {
          id: generateObjectId(),
          url: embedHtml,
          blockName: '',
          blockType: 'embed',
        },
      })

      i++
      continue
    }

    if (
      node.nodeType === 1 &&
      node.tagName === 'BLOCKQUOTE' &&
      node.classNames.includes('instagram-media')
    ) {
      let embedHtml = node.outerHTML
      let j = i + 1
      while (j < nodes.length && nodes[j].nodeType === 3 && nodes[j].text.trim() === '') j++
      if (
        j < nodes.length &&
        nodes[j].nodeType === 1 &&
        nodes[j].tagName === 'SCRIPT' &&
        nodes[j].getAttribute('src') === '//www.instagram.com/embed.js'
      ) {
        embedHtml += nodes[j].outerHTML
        i = j
      }

      pushParagraph()

      children.push({
        type: 'block',
        version: 2,
        format: '',
        fields: {
          id: generateObjectId(),
          url: embedHtml,
          blockName: '',
          blockType: 'embed',
        },
      })

      i++
      continue
    }

    if (
      node.nodeType === 1 &&
      node.tagName === 'IFRAME' &&
      node.getAttribute('src')?.startsWith('https://truthsocial.com/') &&
      node.classNames.includes('truthsocial-embed')
    ) {
      let embedHtml = node.outerHTML
      let j = i + 1
      while (j < nodes.length && nodes[j].nodeType === 3 && nodes[j].text.trim() === '') j++
      if (
        j < nodes.length &&
        nodes[j].nodeType === 1 &&
        nodes[j].tagName === 'SCRIPT' &&
        nodes[j].getAttribute('src') === 'https://truthsocial.com/embed.js'
      ) {
        embedHtml += nodes[j].outerHTML
        i = j
      }

      pushParagraph()

      children.push({
        type: 'block',
        version: 2,
        format: '',
        fields: {
          id: generateObjectId(),
          url: embedHtml,
          blockName: '',
          blockType: 'embed',
        },
      })

      i++
      continue
    }

    if (node.nodeType === 1 && /^H[1-6]$/.test(node.tagName)) {
      pushParagraph()
      const headingChildren = []
      const oldCurrent = currentParagraph
      currentParagraph = headingChildren
      for (const child of node.childNodes) {
        await processNode(child)
      }
      currentParagraph = oldCurrent
      children.push({
        children: headingChildren,
        direction: 'ltr',
        format: 'start',
        indent: 0,
        type: 'heading',
        version: 1,
        tag: node.tagName.toLowerCase(),
        textFormat: headingChildren.some((n) => n.format !== 0) ? 1 : 0,
        textStyle: '',
      })
      i++
      continue
    }

    if (node.nodeType === 1 && (node.tagName === 'P' || node.tagName === 'DIV')) {
      pushParagraph()
      for (const child of node.childNodes) {
        await processNode(child)
      }
    } else {
      await processNode(node)
    }
    i++
  }

  pushParagraph()

  if (!children.length) {
    children.push({
      children: [],
      direction: null,
      format: 'start',
      indent: 0,
      type: 'paragraph',
      version: 1,
      textFormat: 0,
      textStyle: '',
    })
  }

  return {
    root: {
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
      textFormat: children.some((p) => p.textFormat !== 0) ? 1 : 0,
    },
  }
}

async function main() {
  const xmlFile = process.argv[2] || './post.xml'
  const xml = fs.readFileSync(xmlFile, 'utf8')
  const result = await parseStringPromise(xml)
  const items = result.rss.channel[0].item || []

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

  for (const item of items) {
    if (item['wp:post_type']?.[0] !== 'post') continue

    const postId = parseInt(item['wp:post_id']?.[0], 10)
    const existingPost = await posts.findOne({ customId: postId })
    if (existingPost) {
      console.log(`Skipping existing post: ${item.title?.[0] || 'Untitled'}`)
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
      const slug = name.toLowerCase().replace(/\s+/g, '-')
      let tagDoc = await tags.findOne({ slug })
      if (!tagDoc) {
        tagDoc = {
          _id: new ObjectId(),
          name,
          slug,
          slugLock: true,
          createdAt: createdAt,
          updatedAt: updatedAt,
          __v: 0,
        }
        await tags.insertOne(tagDoc)
      }
      tagIds.push(tagDoc._id)
    }

    const catObj = extractCategory(item.category, linkUrl)
    const catSlug = catObj?.$?.nicename || 'uncategorized'
    const catName = catObj?._ || 'Uncategorized'

    let categoryDoc = await categories.findOne({ slug: catSlug })
    if (!categoryDoc) {
      categoryDoc = {
        _id: new ObjectId(),
        name: catName,
        slug: catSlug,
        slugLock: true,
        createdAt: createdAt,
        updatedAt: updatedAt,
        __v: 0,
      }
      await categories.insertOne(categoryDoc)
    }

    let authorDoc = await authors.findOne({ name: creatorName })
    if (!authorDoc) {
      authorDoc = {
        _id: new ObjectId(),
        name: creatorName,
        email: `${creatorName}@example.com`,
        role: 'admin',
        createdAt: createdAt,
        updatedAt: updatedAt,
        __v: 0,
      }
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
      const dirPath = attachedFile.replace(baseFilename, '')
      const prefix = `uploads/${dirPath}`
      const extension = getExtension(baseFilename)
      const baseName = baseFilename.replace(/\.\w+$/, '')

      const existing = await media.findOne({ filename: baseFilename })
      if (existing) {
        heroImageId = existing._id
      } else {
        try {
          const buffer = await downloadImage(url)
          const metadata = await sharp(buffer).metadata()
          await uploadToS3(buffer, prefix + baseFilename, getMimeType(extension))
          const sizes = await generateSizes(buffer, baseName, extension, prefix)

          const mediaCreatedAt = parseDate(mediaItem['wp:post_date_gmt']?.[0])
          const mediaUpdatedAt = parseDate(mediaItem['wp:post_modified_gmt']?.[0])

          const mediaDoc = {
            _id: new ObjectId(),
            createdAt: mediaCreatedAt,
            updatedAt: mediaUpdatedAt,
            alt,
            filename: baseFilename,
            mimeType: getMimeType(extension),
            filesize: buffer.length,
            width: metadata.width,
            height: metadata.height,
            focalX: 0,
            focalY: 0,
            sizes,
            __v: 0,
          }
          await media.insertOne(mediaDoc)
          heroImageId = mediaDoc._id
          await delay(300)
        } catch (err) {
          console.error(`⚠️ Failed image upload: ${title}`, err.message)
        }
      }
    }

    const lexicalContent = await htmlToLexical(contentText, media, createdAt, updatedAt)

    const postDoc = {
      _id: new ObjectId(),
      createdAt,
      updatedAt,
      meta: {
        title,
        image: heroImageId,
        description: metaRaw.summary || '',
      },
      customId: postId,
      slugLock: false,
      _status: 'published',
      __v: 0,
      authors: [authorDoc._id],
      categories: [categoryDoc._id],
      content: lexicalContent,
      heroImage: heroImageId,
      populatedAuthors: [],
      publishedAt: createdAt,
      slug,
      tags: tagIds,
      title,
    }

    await posts.insertOne(postDoc)

    const versionDoc = {
      _id: new ObjectId(),
      parent: postDoc._id,
      version: {
        title,
        heroImage: heroImageId,
        content: lexicalContent,
        categories: [categoryDoc._id],
        meta: {
          title,
          image: heroImageId,
          description: metaRaw.summary || '',
        },
        publishedAt: createdAt,
        tags: tagIds,
        authors: [authorDoc._id],
        populatedAuthors: [],
        slug,
        slugLock: false,
        updatedAt,
        createdAt,
        _status: 'published',
      },
      createdAt,
      updatedAt,
      latest: true,
      autosave: false,
      __v: 0,
    }

    await postsVersions.insertOne(versionDoc)
    console.log('✅ Migrated:', title, 'with version')
  }

  await client.close()
  console.log('🎉 All done!')
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
