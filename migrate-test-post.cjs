const dotenv = require('dotenv');
const { MongoClient, ObjectId } = require('mongodb');
const { parse } = require('node-html-parser');

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
      if (match) prefix = `uploads/${match[1]}`;
      let mediaId;
      const existing = await media.findOne({ filename });
      if (existing) {
        mediaId = existing._id;
      } else {
        const mediaId_new = new ObjectId();
        const mediaDoc = {
          _id: mediaId_new, createdAt, updatedAt, alt, filename,
          mimeType: getMimeType(extension), filesize: 0, width: 800, height: 600,
          focalX: 0, focalY: 0, sizes: {}, prefix, __v: 0,
        };
        await media.insertOne(mediaDoc);
        mediaId = mediaId_new;
      }
      children.push({
        type: 'block', version: 2, format: '',
        fields: { id: generateObjectId(), media: mediaId, blockName: '', blockType: 'mediaBlock' },
      });
    } else if (node.childNodes && node.childNodes.length > 0) {
      for (const child of node.childNodes) {
        await processNode(child);
      }
    }
  }

  const nodes = root.childNodes;
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    if (node.nodeType === 1 && node.tagName === 'BLOCKQUOTE' && node.classNames.includes('twitter-tweet')) {
      let embedHtml = node.outerHTML;
      let j = i + 1;
      while (j < nodes.length && nodes[j].nodeType === 3 && nodes[j].text.trim() === '') j++;
      if (j < nodes.length && nodes[j].nodeType === 1) {
        const nextNode = nodes[j];
        const script = nextNode.tagName === 'SCRIPT' ? nextNode : nextNode.querySelector('script[src="https://platform.twitter.com/widgets.js"]');
        if (script) {
          embedHtml += script.outerHTML;
          i = j;
        }
      }
      pushParagraph();
      children.push({ type: 'block', version: 2, format: '', fields: { id: generateObjectId(), url: embedHtml, blockName: '', blockType: 'embed' } });
      i++; continue;
    }

    if (node.nodeType === 1 && node.tagName === 'BLOCKQUOTE' && node.classNames.includes('instagram-media')) {
      let embedHtml = node.outerHTML;
      let j = i + 1;
      while (j < nodes.length && nodes[j].nodeType === 3 && nodes[j].text.trim() === '') j++;
      if (j < nodes.length && nodes[j].nodeType === 1) {
        const nextNode = nodes[j];
        const script = nextNode.tagName === 'SCRIPT' ? nextNode : nextNode.querySelector('script[src="//www.instagram.com/embed.js"]');
        if (script) {
          embedHtml += script.outerHTML;
          i = j;
        }
      }
      pushParagraph();
      children.push({ type: 'block', version: 2, format: '', fields: { id: generateObjectId(), url: embedHtml, blockName: '', blockType: 'embed' } });
      i++; continue;
    }
    if (node.nodeType === 1 && /^H[1-6]$/.test(node.tagName)) {
      pushParagraph();
      const headingChildren = [];
      const oldCurrent = currentParagraph;
      currentParagraph = headingChildren;
      for (const child of node.childNodes) await processNode(child);
      currentParagraph = oldCurrent;
      children.push({
        children: headingChildren, direction: 'ltr', format: 'start', indent: 0, type: 'heading',
        version: 1, tag: node.tagName.toLowerCase(),
        textFormat: headingChildren.some((n) => n.format !== 0) ? 1 : 0, textStyle: '',
      });
      i++; continue;
    }
    if (node.nodeType === 1 && (node.tagName === 'P' || node.tagName === 'DIV' || node.tagName === 'BLOCKQUOTE')) {
       pushParagraph();
       for (const child of node.childNodes) await processNode(child);
    } else {
       await processNode(node);
    }
    i++;
  }
  pushParagraph();
  if (!children.length) children.push({ children: [], direction: null, format: 'start', indent: 0, type: 'paragraph', version: 1, textFormat: 0, textStyle: '' });
  return { root: { children, direction: 'ltr', format: '', indent: 0, type: 'root', version: 1, textFormat: children.some((p) => p.textFormat !== 0) ? 1 : 0 } };
}

async function main() {
  const id = '965049';
  console.log(`🔌 Connecting to MongoDB and fetching post ID: ${id}...`);
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  const posts = db.collection('posts');
  const media = db.collection('media');
  const categories = db.collection('categories');
  const authors = db.collection('users');

  const auth = Buffer.from('blogvault:5120d378').toString('base64');
  const wpHeaders = { Authorization: `Basic ${auth}` };

  const url = `https://dinasuvadu17107.e.wpstage.net/wp-json/wp/v2/posts/${id}?_embed=true`;
  const res = await fetch(url, { headers: wpHeaders });
  const item = await res.json();

  if (!item.id) {
    console.error('❌ Post not found!');
    process.exit(1);
  }

  const postId = item.id;
  await posts.deleteOne({ customId: postId });

  const title = decodeHtml(item.title.rendered) || 'Untitled';
  const postSlug = `${item.slug}-${postId}`;
  const contentText = item.content.rendered || '';
  const createdAt = new Date(item.date_gmt + 'Z');
  const updatedAt = new Date(item.modified_gmt + 'Z');

  const wpAuthor = item._embedded?.author?.[0];
  const creatorName = wpAuthor?.name || 'Admin';
  const creatorSlug = wpAuthor?.slug || 'admin';
  const excerpt = decodeHtml(item.excerpt?.rendered?.replace(/<[^>]*>?/gm, '') || '');

  let authorDoc = await authors.findOne({ slug: creatorSlug });
  if (!authorDoc) {
    authorDoc = { _id: new ObjectId(), name: creatorName, slug: creatorSlug, email: `${creatorSlug}@example.com`, role: 'admin', createdAt, updatedAt, __v: 0 };
    await authors.insertOne(authorDoc);
  }

  const wpTermsMatch = item._embedded?.['wp:term'] || [];
  let categoryIds = [];
  for (const termGroup of wpTermsMatch) {
    for (const term of termGroup) {
      if (term.taxonomy === 'category') {
        let catDoc = await categories.findOne({ slug: term.slug });
        if (!catDoc) {
           catDoc = { _id: new ObjectId(), title: term.name, slug: term.slug, slugLock: true, createdAt, updatedAt, __v: 0 };
           await categories.insertOne(catDoc);
        }
        categoryIds.push(catDoc._id);
      }
    }
  }

  const lexicalContent = await htmlToLexical(contentText, media, createdAt, updatedAt);

  const postDoc = {
    _id: new ObjectId(), createdAt, updatedAt,
    meta: { title, image: null, description: excerpt },
    customId: postId, slugLock: false, _status: 'published', __v: 0,
    authors: [authorDoc._id], categories: categoryIds, content: lexicalContent,
    heroImage: null, populatedAuthors: [], publishedAt: createdAt, slug: postSlug, tags: [], title,
  };

  await posts.insertOne(postDoc);
  console.log(`✅ Test Migration Finished: ${title}`);
  await client.close();
}

main().catch(console.error);
