import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import { parse } from 'node-html-parser';
import fetch from 'node-fetch';

dotenv.config();
const { MONGODB_URI } = process.env;

function getFilenameFromUrl(url) {
  return url.split('/').pop().split('?')[0];
}

function getExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

function getMimeType(extension) {
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  return `image/${extension}`;
}

function decodeHtml(html) {
  if (!html) return '';
  return html
    .replace(/&#8230;/g, '...')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&hellip;/g, '...')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function generateObjectId() {
  return new ObjectId().toHexString();
}

async function htmlToLexical(htmlContent, media, createdAt, updatedAt) {
  const root = parse(htmlContent);
  const children = [];
  let currentParagraph = [];

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
      });
      currentParagraph = [];
    }
  };

  async function processNode(node) {
    if (node.nodeType === 3) {
      const text = node.text;
      const parts = text.split(/\n{2,}/g).map((p) => p.trim()).filter((p) => p);
      parts.forEach((part, index) => {
        if (index > 0) pushParagraph();
        currentParagraph.push({
          detail: 0, format: 0, mode: 'normal', style: '', text: part, type: 'text', version: 1,
        });
      });
      if (text.match(/\n\s*$/)) pushParagraph();
    } else if (node.nodeType === 1 && node.tagName === 'STRONG') {
      const text = node.text;
      const parts = text.split(/\n{2,}/g).map((p) => p.trim()).filter((p) => p);
      parts.forEach((part, index) => {
        if (index > 0) pushParagraph();
        currentParagraph.push({
          detail: 0, format: 1, mode: 'normal', style: '', text: part, type: 'text', version: 1,
        });
      });
      if (text.match(/\n\s*$/)) pushParagraph();
    } else if (node.nodeType === 1 && node.tagName === 'IFRAME') {
      const src = node.getAttribute('src') || '';
      if (src.startsWith('https://www.youtube.com/embed/') || 
          src.startsWith('https://www.facebook.com/plugins/') ||
          src.startsWith('https://www.linkedin.com/embed/')) {
        pushParagraph();
        children.push({
          type: 'block', version: 2, format: '',
          fields: {
            id: generateObjectId(), url: node.outerHTML, blockName: '', blockType: 'embed',
          },
        });
      }
    } else if (node.nodeType === 1 && node.tagName === 'IMG') {
      pushParagraph();
      const src = node.getAttribute('src');
      if (!src) return;
      const alt = node.getAttribute('alt') || '';
      const filename = getFilenameFromUrl(src);
      const extension = getExtension(filename);

      let prefix = '';
      const match = src.match(/uploads\/(\d{4}\/\d{2})\//);
      if (match) {
        prefix = `uploads/${match[1]}`;
      }

      let mediaId;
      const existing = await media.findOne({ filename });
      if (existing) {
        mediaId = existing._id;
      } else {
        const mediaDoc = {
          _id: new ObjectId(), createdAt, updatedAt, alt, filename,
          mimeType: getMimeType(extension), filesize: 0, width: 800, height: 600,
          focalX: 0, focalY: 0, sizes: {}, prefix, __v: 0,
        };
        const result = await media.insertOne(mediaDoc);
        mediaId = result.insertedId;
      }

      children.push({
        type: 'block', version: 2, format: '',
        fields: { id: generateObjectId(), media: mediaId, blockName: '', blockType: 'mediaBlock' },
      });
    } else if (node.nodeType === 1 && /^H[1-6]$/.test(node.tagName)) {
      pushParagraph();
      const headingChildren = [];
      const oldCurrent = currentParagraph;
      currentParagraph = headingChildren;
      for (const child of node.childNodes) {
        await processNode(child);
      }
      currentParagraph = oldCurrent;
      children.push({
        children: headingChildren, direction: 'ltr', format: 'start', indent: 0, type: 'heading',
        version: 1, tag: node.tagName.toLowerCase(),
        textFormat: headingChildren.some((n) => n.format !== 0) ? 1 : 0, textStyle: '',
      });
    } else if (node.nodeType === 1 && (node.tagName === 'P' || node.tagName === 'DIV' || node.tagName === 'BLOCKQUOTE')) {
      if (node.tagName === 'BLOCKQUOTE' && (node.classNames.includes('twitter-tweet') || node.classNames.includes('instagram-media'))) {
         let embedHtml = node.outerHTML;
         pushParagraph();
         children.push({
           type: 'block', version: 2, format: '',
           fields: { id: generateObjectId(), url: embedHtml, blockName: '', blockType: 'embed' },
         });
      } else {
         pushParagraph();
         for (const child of node.childNodes) {
           await processNode(child);
         }
      }
    } else {
      if (node.childNodes && node.childNodes.length > 0) {
        for (const child of node.childNodes) {
          await processNode(child);
        }
      }
    }
  }

  for (const node of root.childNodes) {
    await processNode(node);
  }
  pushParagraph();

  if (!children.length) {
    children.push({ children: [], direction: null, format: 'start', indent: 0, type: 'paragraph', version: 1, textFormat: 0, textStyle: '' });
  }

  return { root: { children, direction: 'ltr', format: '', indent: 0, type: 'root', version: 1, textFormat: children.some((p) => p.textFormat !== 0) ? 1 : 0 } };
}

async function main() {
  console.log(`🔌 Connecting to MongoDB cluster...`);
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  const posts = db.collection('posts');
  const tags = db.collection('tags');
  const media = db.collection('media');
  const categories = db.collection('categories');
  const authors = db.collection('users');
  const postsVersions = db.collection('_posts_versions');

  const args = process.argv.slice(2);
  if (args.length !== 1 || !/^\d{4}-\d{2}$/.test(args[0])) {
    console.error('❌ Please provide a specific Year and Month! Example: node migrate-api.js 2026-03');
    process.exit(1);
  }

  const [yearStr, monthStr] = args[0].split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }

  const afterDate = `${year}-${month.toString().padStart(2, '0')}-01T00:00:00Z`;
  const beforeDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01T00:00:00Z`;

  console.log(`\n\n📡 Starting Migration for Month: ${year}-${month.toString().padStart(2, '0')} (fetching until ${beforeDate})...`);
  
  const auth = Buffer.from('blogvault:5120d378').toString('base64');
  const wpHeaders = { Authorization: `Basic ${auth}` };

  // Step 1: Pre-fetch all WP categories to handle hierarchy
  console.log('🔗 Pre-fetching WP Categories for hierarchy mapping...');
  const wpCatsRes = await fetch('https://dinasuvadu17107.e.wpstage.net/wp-json/wp/v2/categories?per_page=100', { headers: wpHeaders });
  const wpCatsData = await wpCatsRes.json();
  const wpCategoryMap = new Map(); // ID -> Category Object
  wpCatsData.forEach(c => wpCategoryMap.set(c.id, c));

  async function ensureCategory(catId) {
    const wpCat = wpCategoryMap.get(catId);
    if (!wpCat) return null;

    let payloadCat = await categories.findOne({ slug: wpCat.slug });
    if (payloadCat) return payloadCat._id;

    // Handle Parent recursively if exists
    let parentId = null;
    if (wpCat.parent && wpCat.parent !== 0) {
      parentId = await ensureCategory(wpCat.parent);
    }

    const newCat = {
      _id: new ObjectId(),
      title: wpCat.name,
      slug: wpCat.slug,
      slugLock: true,
      parent: parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    };
    await categories.insertOne(newCat);
    console.log(`✅ Created category hierarchy: ${wpCat.name}`);
    return newCat._id;
  }

  let page = 1;
  let totalPages = 1;
  let totalMigrated = 0;
  let totalSkipped = 0;

  while (page <= totalPages) {
    const url = `https://dinasuvadu17107.e.wpstage.net/wp-json/wp/v2/posts?after=${afterDate}&before=${beforeDate}&per_page=100&page=${page}&_embed=true`;
    console.log(`\n⏳ Fetching Page ${page} of ${totalPages}...`);
    
    const res = await fetch(url, { headers: wpHeaders });
    
    if (!res.ok) {
      console.error(`❌ Failed to fetch page ${page}:`, res.status);
      break;
    }

    if (page === 1) {
      const headerTotal = res.headers.get('x-wp-totalpages');
      if (headerTotal) totalPages = parseInt(headerTotal, 10);
      console.log(`📊 Expected Total Pages to Process: ${totalPages}`);
    }

    const items = await res.json();
    if (items.length === 0) {
      console.log('✅ Reached the end of available posts.');
      break;
    }

    for (const item of items) {
      const postId = item.id;
      const existingPost = await posts.findOne({ customId: postId });
      if (existingPost) {
        console.log(`⏩ Skipping existing post: ${item.title.rendered}`);
        totalSkipped++;
        continue;
      }

      const title = decodeHtml(item.title.rendered) || 'Untitled';
      const slug = `${item.slug}-${postId}`;
      const contentText = item.content.rendered || '';
      
      // Get author info
      const wpAuthor = item._embedded?.author?.[0];
      const creatorName = wpAuthor?.name || 'Admin';
      const creatorSlug = wpAuthor?.slug || 'admin';
      
      const excerpt = decodeHtml(item.excerpt?.rendered?.replace(/<[^>]*>?/gm, '') || '');
      
      // Parse Dates
      const createdAt = new Date(item.date_gmt + 'Z');
      const updatedAt = new Date(item.modified_gmt + 'Z');

      // Extract Categories and Tags from _embedded['wp:term']
      const wpTermsMatch = item._embedded?.['wp:term'] || [];
      let postWpCategories = [];
      let postWpTags = [];
      
      for (const termGroup of wpTermsMatch) {
        for (const term of termGroup) {
          if (term.taxonomy === 'category') postWpCategories.push(term);
          if (term.taxonomy === 'post_tag') postWpTags.push(term);
        }
      }

      let categoryIds = [];
      for (const cat of postWpCategories) {
        const id = await ensureCategory(cat.id);
        if (id) categoryIds.push(id);
      }
      // Fallback if no categories
      if (!categoryIds.length) {
        let uncat = await categories.findOne({ slug: 'uncategorized' });
        if (!uncat) {
          uncat = { _id: new ObjectId(), title: 'Uncategorized', slug: 'uncategorized', slugLock: true, createdAt, updatedAt, __v: 0 };
          await categories.insertOne(uncat);
        }
        categoryIds.push(uncat._id);
      }

      let tagIds = [];
      for (const tag of postWpTags) {
        let tagDoc = await tags.findOne({ slug: tag.slug });
        if (!tagDoc) {
          tagDoc = { _id: new ObjectId(), name: tag.name, slug: tag.slug, slugLock: true, createdAt, updatedAt, __v: 0 };
          await tags.insertOne(tagDoc);
        }
        tagIds.push(tagDoc._id);
      }

      // Handle Author
      let authorDoc = await authors.findOne({ slug: creatorSlug });
      if (!authorDoc) {
        authorDoc = { 
          _id: new ObjectId(), 
          name: creatorName, 
          slug: creatorSlug,
          email: `${creatorSlug}@example.com`, 
          role: 'admin', 
          createdAt, 
          updatedAt, 
          __v: 0 
        };
        await authors.insertOne(authorDoc);
      }

      // Handle Featured Image
      let heroImageId = null;
      const featuredMedia = item._embedded?.['wp:featuredmedia']?.[0];
      if (featuredMedia && featuredMedia.source_url) {
        const urlReq = featuredMedia.source_url;
        const baseFilename = getFilenameFromUrl(urlReq);
        const extension = getExtension(baseFilename);
        const alt = featuredMedia.alt_text || 'Featured image';

        let prefix = '';
        const match = urlReq.match(/uploads\/(\d{4}\/\d{2})\//);
        if (match) prefix = `uploads/${match[1]}`;

        const existingMedia = await media.findOne({ filename: baseFilename });
        if (existingMedia) {
          heroImageId = existingMedia._id;
        } else {
          const mediaDoc = {
            _id: new ObjectId(), createdAt, updatedAt, alt, filename: baseFilename,
            mimeType: getMimeType(extension), filesize: 0, width: 800, height: 600,
            focalX: 0, focalY: 0, sizes: {}, prefix, __v: 0,
          };
          await media.insertOne(mediaDoc);
          heroImageId = mediaDoc._id;
        }
      }

      // Convert HTML to Lexical
      const lexicalContent = await htmlToLexical(contentText, media, createdAt, updatedAt);

      const postDoc = {
        _id: new ObjectId(), createdAt, updatedAt,
        meta: { title, image: heroImageId, description: excerpt },
        customId: postId, slugLock: false, _status: 'published', __v: 0,
        authors: [authorDoc._id], categories: categoryIds, content: lexicalContent,
        heroImage: heroImageId, populatedAuthors: [], publishedAt: createdAt, slug, tags: tagIds, title,
      };

      await posts.insertOne(postDoc);

      const versionDoc = {
        _id: new ObjectId(), parent: postDoc._id, version: postDoc,
        createdAt, updatedAt, latest: true, autosave: false, __v: 0,
      };
      delete versionDoc.version._id;
      delete versionDoc.version.createdAt;
      delete versionDoc.version.updatedAt;
      
      await postsVersions.insertOne(versionDoc);
      console.log(`✅ Migrated post: ${title}`);
      totalMigrated++;
    }
    
    page++;
  }

  await client.close();
  console.log(`\n🎉 Migration successfully finished!`);
  console.log(`📊 Successfully Migrated: ${totalMigrated} posts`);
  console.log(`⏭️ Skipped (Already migrated): ${totalSkipped} posts`);
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
