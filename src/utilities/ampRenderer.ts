import { getPayload } from 'payload';
import config from '@/payload.config';
import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html';
import { convertHtmlToAmp } from '@/utilities/ampConverter';
import { getImageUrl, resolvePostOgImageUrl } from '@/lib/post-images';
import { resolveCanonicalPostPath } from '@/lib/post-url';
import { buildBreadcrumbLd, buildArticleLd } from '@/lib/seo';

// HTML escaping helper
function escapeHtml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Lexical rich text caption to plain HTML/text converter
async function renderLexicalCaption(captionObj: any): Promise<string> {
  if (!captionObj) return '';
  if (typeof captionObj === 'string') return captionObj;
  if (typeof captionObj === 'object' && captionObj.root) {
    try {
      const html = await convertLexicalToHTML({
        data: captionObj,
        disableContainer: true,
      });
      return convertHtmlToAmp(html).html;
    } catch (err) {
      console.error('Error rendering Lexical caption:', err);
      try {
        const texts: string[] = [];
        const extractText = (node: any) => {
          if (node.text) texts.push(node.text);
          if (node.children) node.children.forEach(extractText);
        };
        extractText(captionObj.root);
        return texts.join(' ');
      } catch {
        return '';
      }
    }
  }
  return '';
}

// Cache in-memory category mapping for sidebar navigation
let cachedCategories: any[] | null = null;
let cachedCategoriesTimestamp = 0;
const CATEGORIES_CACHE_TTL = 60 * 1000; // 1 minute TTL

// Helper to format timestamps to IST news format
function formatNewsTimestamp(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const datePart = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const timePart = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  });

  return `${datePart} at ${timePart} IST`;
}

function formatTimeAgo(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHrs < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return diffMins <= 1 ? 'Just now' : `${diffMins} mins ago`;
  } else if (diffHrs < 24) {
    return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
  } else {
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
}

// Fetch parent category details by ID
async function fetchParentCategory(parentId: string) {
  try {
    const payload = await getPayload({ config });
    const res = await payload.findByID({
      collection: 'categories',
      id: parentId,
      depth: 1,
    });
    return res || null;
  } catch (err) {
    console.error(`Error fetching parent category with ID ${parentId}:`, err);
    return null;
  }
}

/**
 * Renders a full, valid AMP HTML document for a Post.
 */
export async function renderAmpPost(post: any): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.dinasuvadu.com';
  const payloadUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  // Resolve paths and URLs
  const canonicalPath = await resolveCanonicalPostPath(post, async (id) => {
    const cat = await fetchParentCategory(id);
    return { slug: cat?.slug };
  });
  const canonicalUrl = `${baseUrl}${canonicalPath}`;
  const pathSegments = canonicalPath.split('/').filter(Boolean);
  const categoryUrlPath = '/' + pathSegments.slice(0, -1).join('/');
  
  // Primary category info
  const primaryCategory = post.categories?.[0];
  const categoryTitle = primaryCategory?.title || primaryCategory?.name || 'செய்திகள்';
  const categorySlug = primaryCategory?.slug || 'news';
  
  // Author
  const authorLine =
    (post.populatedAuthors ?? [])
      .map((author: any) => author?.name)
      .filter(Boolean)
      .join(', ') || 'Dinasuvadu Team';
  
  // Timestamps
  const publishedDisplay = formatNewsTimestamp(post.publishedAt);
  const updatedDisplay = formatNewsTimestamp(post.updatedAt || post.publishedAt);
  const showUpdated = post.updatedAt && publishedDisplay !== updatedDisplay;
  
  // Content HTML translation (Lexical -> HTML -> AMP HTML)
  let bodyHtml = '';
  let usesTwitter = false;
  let usesInstagram = false;

  if (post.content) {
    try {
      const lexicalHtml = await convertLexicalToHTML({
        data: post.content,
        disableContainer: true,
      });
      const result = convertHtmlToAmp(lexicalHtml);
      bodyHtml = result.html;
      usesTwitter = result.usesTwitter;
      usesInstagram = result.usesInstagram;
    } catch (err) {
      console.error('Error converting rich text to HTML in AMP:', err);
    }
  }
  
  // Layout content translation if layout exists (optional)
  if (post.layout && Array.isArray(post.layout)) {
    const layoutHtmls = [];
    for (const block of post.layout) {
      if (block.blockType === 'content' && block.content) {
        const result = convertHtmlToAmp(block.content);
        layoutHtmls.push(result.html);
        if (result.usesTwitter) usesTwitter = true;
        if (result.usesInstagram) usesInstagram = true;
      } else if (block.blockType === 'mediaBlock' && block.media) {
        const url = getImageUrl(block.media, 'content');
        if (!url) continue;
        const alt = escapeHtml(block.media.alt || '');
        const caption = await renderLexicalCaption(block.media.caption);
        layoutHtmls.push(`
          <figure class="amp-article-media">
            <amp-img src="${url}" alt="${alt}" width="600" height="400" layout="responsive" lightbox="true"></amp-img>
            ${caption ? `<figcaption class="amp-article-caption">${caption}</figcaption>` : ''}
          </figure>
        `);
      }
    }
    bodyHtml += layoutHtmls.join('');
  }
  
  // Fetch all categories for the sidebar navigation
  if (!cachedCategories || Date.now() - cachedCategoriesTimestamp > CATEGORIES_CACHE_TTL) {
    try {
      const payload = await getPayload({ config });
      const categoriesRes = await payload.find({
        collection: 'categories',
        limit: 300,
        depth: 1,
      });
      cachedCategories = categoriesRes.docs;
      cachedCategoriesTimestamp = Date.now();
    } catch (err) {
      console.error('Error fetching categories for AMP sidebar:', err);
      cachedCategories = cachedCategories || [];
    }
  }
  const menuCategories = cachedCategories;

  const parentCategories = menuCategories.filter((c) => !c.parent);
  const subCategories = menuCategories.filter((c) => c.parent);
  
  const getSubcategories = (parentId: string) => {
    return subCategories.filter((sub) => {
      const pId = typeof sub.parent === 'string' ? sub.parent : sub.parent?.id;
      return pId === parentId;
    });
  };
  
  // SEO Image
  const ogImageUrl = resolvePostOgImageUrl(post) || `${baseUrl}/website-template-OG.webp`;
  
  // Parse segments of canonicalPath dynamically to build multi-level Breadcrumbs
  const breadcrumbItems = [{ name: 'Home', url: `${baseUrl}/` }];
  let runningPath = '';
  
  for (let i = 0; i < pathSegments.length - 1; i++) {
    const segment = pathSegments[i];
    runningPath += `/${segment}`;
    
    // Find matching category from post categories
    const matchedCategory = post.categories?.find((cat: any) => cat?.slug === segment);
    const catTitle = matchedCategory?.title || matchedCategory?.name || segment;
    
    breadcrumbItems.push({
      name: catTitle,
      url: `${baseUrl}${runningPath}`,
    });
  }
  
  breadcrumbItems.push({
    name: post.title,
    url: canonicalUrl,
  });

  const breadcrumbLd = buildBreadcrumbLd(breadcrumbItems);

  // Parse segments to pass proper args to buildArticleLd (fixes wrong URL for 3-segment paths)
  const articleLdParams: any = {
    post,
    apiUrl: payloadUrl,
  };
  
  if (pathSegments.length === 3) {
    articleLdParams.categorySlug = pathSegments[0];
    articleLdParams.postSlug = pathSegments[1];
    articleLdParams.subPostSlug = pathSegments[2];
  } else {
    articleLdParams.categorySlug = pathSegments[0] || categorySlug;
    articleLdParams.postSlug = pathSegments[1] || post.slug;
  }
  
  const articleLd = buildArticleLd(articleLdParams);
  
  // Hero Image Url
  const heroImageUrl = getImageUrl(post.heroImage, 'hero') || getImageUrl(post.meta?.image, 'hero');
  const heroImageAlt = post.heroImage?.alt || post.meta?.image?.alt || post.title;
  const heroCaption = await renderLexicalCaption(post.heroImage?.caption || post.meta?.image?.caption);
  
  // Build dynamic AMP page output
  return `<!doctype html>
<html ⚡ lang="ta" dir="ltr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
    <link rel="preload" as="script" href="https://cdn.ampproject.org/v0.js">
    <script async src="https://cdn.ampproject.org/v0.js"></script>
    
    <link rel="preconnect" href="https://media.dinasuvadu.com" crossorigin>
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Mukta+Malar:wght@400;700&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    ${heroImageUrl ? `<link rel="preload" href="${heroImageUrl}" as="image" fetchpriority="high">` : ''}
    
    <title>${escapeHtml(post.title)} – Dinasuvadu</title>
    <link rel="canonical" href="${canonicalUrl}">
    
    <!-- Meta tags -->
    <meta name="robots" content="max-image-preview:large">
    <meta name="description" content="${escapeHtml((post.meta?.description || post.title).substring(0, 160))}">
    <meta name="author" content="${escapeHtml(authorLine)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:title" content="${escapeHtml(post.title)}">
    <meta property="og:description" content="${escapeHtml((post.meta?.description || post.title).substring(0, 160))}">
    <meta property="og:image" content="${ogImageUrl}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(post.title)}">
    <meta name="twitter:description" content="${escapeHtml((post.meta?.description || post.title).substring(0, 160))}">
    <meta name="twitter:image" content="${ogImageUrl}">
    
     <!-- Required AMP scripts -->
    <script async custom-element="amp-sidebar" src="https://cdn.ampproject.org/v0/amp-sidebar-0.1.js"></script>
    <script async custom-element="amp-accordion" src="https://cdn.ampproject.org/v0/amp-accordion-0.1.js"></script>
    <script async custom-element="amp-form" src="https://cdn.ampproject.org/v0/amp-form-0.1.js"></script>
    <script async custom-element="amp-lightbox-gallery" src="https://cdn.ampproject.org/v0/amp-lightbox-gallery-0.1.js"></script>
    <script async custom-element="amp-social-share" src="https://cdn.ampproject.org/v0/amp-social-share-0.1.js"></script>
    <script async custom-element="amp-analytics" src="https://cdn.ampproject.org/v0/amp-analytics-0.1.js"></script>
    <script async custom-element="amp-youtube" src="https://cdn.ampproject.org/v0/amp-youtube-0.1.js"></script>
    ${usesTwitter ? '<script async custom-element="amp-twitter" src="https://cdn.ampproject.org/v0/amp-twitter-0.1.js"></script>' : ''}
    ${usesInstagram ? '<script async custom-element="amp-instagram" src="https://cdn.ampproject.org/v0/amp-instagram-0.1.js"></script>' : ''}
    
    <!-- Structured Data -->
    <script type="application/ld+json">${breadcrumbLd}</script>
    <script type="application/ld+json">${articleLd}</script>
    
    <style amp-custom>
      body {
        font-family: 'Open Sans', 'Mukta Malar', sans-serif;
        background-color: #f4f6f8;
        color: #222222;
        margin: 0;
        line-height: 1.6;
        padding-bottom: 0;
      }
      
      a {
        color: #cb0000;
        text-decoration: none;
      }
      
      /* Header & Navbar */
      .navbar {
        height: 60px;
        position: relative;
        background-color: #ffffff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        display: flex;
        align-items: center;
        padding: 0 16px;
        justify-content: space-between;
        border-bottom: 1px solid #eef2f5;
      }
      
      .navbar-logo {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        justify-content: center;
        align-items: center;
      }
      
      .navbar-logo amp-img img {
        object-fit: contain;
      }
      
      .hamburger-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        display: flex;
        align-items: center;
      }
      
      .hamburger-btn svg {
        fill: #111111;
      }
      
      /* Sidebar Navigation */
      #sidebar {
        width: 320px;
        background-color: #ffffff;
        padding: 20px;
        box-sizing: border-box;
      }
      
      .drawer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      
      .close-btn-fixed {
        background: #000000;
        color: #ffffff;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 14px;
      }
      
      .drawer-search {
        margin-bottom: 20px;
      }
      
      .drawer-search input {
        width: 100%;
        padding: 10px 40px 10px 12px;
        border: 1px solid #dddddd;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
        outline: none;
        background-color: #ffffff;
        color: #333333;
      }
      
      .drawer-accordion {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      
      .accordion-item {
      }
      
      .sidebar-accordion {
        background: none;
        border: none;
      }
      
      .sidebar-accordion section {
        background: none;
        border: none;
      }
      
      /* High specificity targeting to override native amp-accordion styles without !important */
      #sidebar amp-accordion.sidebar-accordion > section > header.accordion-trigger {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        margin: 0;
        background: none;
        border: none;
        border-bottom: 1px dashed #eeeeee;
        cursor: pointer;
        width: 100%;
        box-sizing: border-box;
        text-align: left;
      }

      #sidebar amp-accordion.sidebar-accordion > section > header.accordion-trigger > span {
        display: inline-flex;
        align-items: center;
      }

      #sidebar amp-accordion.sidebar-accordion > section > header.accordion-trigger > span.drawer-parent-link {
        flex: 1;
      }
      
      #sidebar amp-accordion.sidebar-accordion > section > header.accordion-trigger > span.submenu-arrow-wrapper {
        flex-shrink: 0;
        margin-left: 8px;
      }
      
      .accordion-trigger-single {
        display: flex;
        align-items: center;
        padding: 12px 0;
        margin: 0;
        background: none;
        border: none;
        border-bottom: 1px dashed #eeeeee;
        width: 100%;
        box-sizing: border-box;
      }
      
      .drawer-parent-link {
        font-family: 'Mukta Malar', sans-serif;
        font-weight: 700;
        font-size: 16px;
        color: #333333;
        text-decoration: none;
        letter-spacing: -0.01em;
        transition: color 0.2s;
        display: inline;
      }
      
      .drawer-parent-link:hover,
      .drawer-parent-link.active {
        color: #cb0000;
      }
      
      .submenu-arrow-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .submenu-arrow-svg {
        transition: transform 0.3s;
        color: #666666;
      }
      
      .sidebar-accordion section[expanded] .submenu-arrow-svg {
        transform: rotate(180deg);
      }
      
      .accordion-content {
        padding: 5px 0 15px 20px;
      }
      
      .drawer-child-link {
        color: #666666;
        font-size: 14px;
        text-decoration: none;
        transition: color 0.2s;
        display: block;
        font-weight: 600;
        font-family: 'Mukta Malar', sans-serif;
      }
      
      .drawer-child-link:hover,
      .drawer-child-link.active {
        color: #cb0000;
      }
      
      /* Main Container */
      .story-container {
        max-width: 680px;
        margin: 16px auto;
        background-color: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        border: 1px solid #eef2f5;
      }
      
      /* Hero Image styling */
      .hero-image-wrap {
        position: relative;
        background-color: #e9e9e9;
      }
      
      .hero-caption {
        font-size: 13px;
        color: #666666;
        padding: 8px 16px;
        background-color: #fafafa;
        border-bottom: 1px solid #eee;
        margin: 0;
      }
      
      /* Article Header */
      .article-header {
        padding: 20px 20px 10px 20px;
      }
      
      .category-label {
        color: #194277;
        font-size: 14px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        display: inline-block;
        margin-bottom: 8px;
      }
      
      .article-title {
        font-family: 'Mukta Malar', 'PT Serif', serif;
        font-size: 24px;
        font-weight: 700;
        line-height: 1.4;
        color: #111111;
        margin: 0 0 12px 0;
      }
      
      .article-subtitle {
        font-size: 15px;
        color: #555555;
        margin: 0 0 16px 0;
        line-height: 1.5;
        border-left: 3px solid #194277;
        padding-left: 10px;
      }
      
      .article-meta {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-bottom: 10px;
        border-bottom: 1px solid #eef2f5;
        margin-bottom: 10px;
      }
      
      .meta-time-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .meta-author {
        font-size: 13px;
        font-weight: 700;
        color: #333333;
      }
      
      .meta-time {
        font-size: 12px;
        color: #757575;
      }
      
      /* Social Sharing wrapper */
      .social-share-wrap {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 20px 8px 20px;
        border-bottom: 1px solid #eef2f5;
      }
      
      .social-icons-left {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      
      .google-news-follow {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border: 1px solid #cccccc;
        border-radius: 20px;
        text-decoration: none;
        color: #333333;
        font-family: 'Open Sans', 'Mukta Malar', sans-serif;
        font-size: 13px;
        font-weight: 700;
      }
      
      .social-share-icon {
        border-radius: 50%;
        overflow: hidden;
      }
      

      
      /* Body content formatting */
      .article-body {
        padding: 6px 20px 20px 20px;
        font-size: 17px;
        line-height: 1.8;
        color: #333333;
      }
      
      .article-body p {
        margin: 0 0 16px 0;
      }
      
      .article-body strong {
        color: #111111;
      }
      
      .article-body blockquote {
        margin: 20px 0;
        padding: 10px 20px;
        border-left: 4px solid #cb0000;
        background-color: #fff9f9;
        font-style: italic;
      }
      
      .amp-article-media {
        margin: 20px 0;
      }
      
      .amp-article-caption {
        font-size: 13px;
        color: #666666;
        text-align: center;
        margin-top: 6px;
      }
      
      /* Footer */
      .footer {
        background-color: #000000;
        color: #ffffff;
        text-align: center;
        padding: 8px 16px;
        font-size: 13px;
        margin-top: 20px;
      }
      
      .footer-logo {
        margin-bottom: 4px;
        display: block;
      }
      
      .footer-logo a {
        display: inline-block;
        line-height: 0;
      }
      
      .footer-logo amp-img img {
        object-fit: contain;
      }
      
      .footer-copyright {
        opacity: 0.8;
        margin-bottom: 2px;
      }

      .footer-powered {
        font-size: 11px;
        opacity: 0.7;
      }

      .footer-powered a {
        color: #ffffff;
        text-decoration: none;
      }
      
      /* (Sidebar accordion styling defined above) */
      
      /* Tags styling */
      .post-tags {
        padding: 0 20px 20px 20px;
        margin-top: 10px;
      }
      
      .tags-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      
      .tag-chip {
        background-color: #f0f2f5;
        color: #555555;
        font-size: 13px;
        font-weight: 600;
        padding: 6px 12px;
        border-radius: 20px;
        transition: background-color 0.2s;
        display: inline-block;
      }
      
      .tag-chip:hover {
        background-color: #cb0000;
        color: #ffffff;
      }

      /* Responsive styling updates */
      @media (max-width: 768px) {
        .story-container {
          margin: 0;
          border-radius: 0;
          border: none;
        }
        
        .article-title {
          font-size: 20px;
        }
      }

      /* ── Post-body heading sizes ─────────────────────────────── */
      /* Must always be SMALLER than .article-title (24px desktop / 20px mobile) */
      .article-body h2 {
        font-family: 'Mukta Malar', sans-serif;
        font-size: 20px;
        font-weight: 700;
        line-height: 1.4;
        color: #111111;
        margin: 24px 0 10px 0;
      }

      .article-body h3 {
        font-family: 'Mukta Malar', sans-serif;
        font-size: 17px;
        font-weight: 700;
        line-height: 1.4;
        color: #222222;
        margin: 20px 0 8px 0;
      }

      .article-body h4 {
        font-family: 'Mukta Malar', sans-serif;
        font-size: 15px;
        font-weight: 700;
        line-height: 1.4;
        color: #333333;
        margin: 16px 0 6px 0;
      }

      .article-body h5,
      .article-body h6 {
        font-family: 'Mukta Malar', sans-serif;
        font-size: 14px;
        font-weight: 700;
        color: #444444;
        margin: 12px 0 4px 0;
      }

      @media (max-width: 768px) {
        .article-body h2 { font-size: 18px; }
        .article-body h3 { font-size: 16px; }
        .article-body h4 { font-size: 14px; }
      }
    </style>
    
    <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
    <noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
  </head>
  <body>
    <!-- Header / Navbar -->
    <header class="navbar">
      <button class="hamburger-btn" on="tap:sidebar.toggle" aria-label="menu">
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
      </button>
      <div class="navbar-logo">
        <a href="${baseUrl}">
          <amp-img src="/dinasuvadu.svg" alt="Dinasuvadu" width="150" height="40" layout="fixed"></amp-img>
        </a>
      </div>
      <div style="width: 40px;"></div> <!-- visual spacer matching hamburger width -->
    </header>
    
    <!-- Sidebar navigation drawer -->
    <amp-sidebar id="sidebar" layout="nodisplay" side="left">
      <div class="drawer-header">
        <amp-img src="/dinasuvadu.svg" alt="Dinasuvadu Logo" width="140" height="38" layout="fixed"></amp-img>
        <button class="close-btn-fixed" on="tap:sidebar.close">✕</button>
      </div>

      <form method="GET" action="/search" target="_top" class="drawer-search">
        <div style="position: relative;">
          <input type="text" name="s" placeholder="Search Dinasuvadu">
          <button type="submit" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; padding: 0; cursor: pointer;">
            <svg style="width: 18px; height: 18px; fill: none; stroke: #666666;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </button>
        </div>
      </form>

      <ul class="drawer-accordion">
        <li class="accordion-item">
          <div class="accordion-trigger-single">
            <a class="drawer-parent-link" href="${baseUrl}">முகப்பு</a>
          </div>
        </li>
        ${parentCategories
          .map((cat) => {
            const children = getSubcategories(cat.id);
            if (children.length > 0) {
              return `
              <li class="accordion-item">
                <amp-accordion class="sidebar-accordion" layout="container">
                  <section>
                    <header class="accordion-trigger" style="position:relative;display:block;width:100%;box-sizing:border-box;padding:12px 32px 12px 0;border-bottom:1px dashed #eeeeee;cursor:pointer;background:none;border-left:none;border-top:none;border-right:none;">
                      <span style="font-family:'Mukta Malar',sans-serif;font-weight:700;font-size:16px;color:#333333;letter-spacing:-0.01em;">${escapeHtml(cat.title || cat.name)}</span>
                      <span class="submenu-arrow-wrapper" style="position:absolute;right:0;top:50%;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;">
                        <svg class="submenu-arrow-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666666" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </span>
                    </header>
                    <div class="accordion-content">
                      <ul style="list-style: none; padding: 0; margin: 0;">
                        ${children.map(child => `
                          <li style="padding: 8px 0;">
                            <a class="drawer-child-link" href="${baseUrl}/${cat.slug}/${child.slug}">
                              ${escapeHtml(child.title || child.name)}
                            </a>
                          </li>
                        `).join('')}
                      </ul>
                    </div>
                  </section>
                </amp-accordion>
              </li>`;
            } else {
              return `
              <li class="accordion-item">
                <div class="accordion-trigger-single">
                  <a class="drawer-parent-link" href="${baseUrl}/${cat.slug}">${escapeHtml(cat.title || cat.name)}</a>
                </div>
              </li>`;
            }
          })
          .join('')}
      </ul>
    </amp-sidebar>
    

    
    <!-- Main Story Container -->
    <main class="story-container">
      
      <!-- Hero Image -->
      ${
        heroImageUrl
          ? `
      <div class="hero-image-wrap">
        <amp-img src="${heroImageUrl}" alt="${escapeHtml(heroImageAlt)}" width="16" height="9" layout="responsive" lightbox="true" data-hero></amp-img>
      </div>
      ${heroCaption ? `<p class="hero-caption">${heroCaption}</p>` : ''}
      `
          : ''
      }
      
      <!-- Article Info Header -->
      <header class="article-header">
        <a href="${baseUrl}${categoryUrlPath}" class="category-label">${escapeHtml(categoryTitle)}</a>
        <h1 class="article-title">${escapeHtml(post.title)}</h1>
        ${post.meta?.description ? `<h2 class="article-subtitle">${escapeHtml(post.meta.description)}</h2>` : ''}
        
        <div class="article-meta">
          <div class="meta-author">By ${escapeHtml(authorLine)}</div>
          <div class="meta-time-row">
            <div class="meta-time">Published: ${publishedDisplay}</div>
            ${showUpdated ? `<div class="meta-time">Updated: ${formatTimeAgo(post.updatedAt)}</div>` : ''}
          </div>
        </div>
      </header>
      
      <!-- Social Sharing Buttons -->
      <div class="social-share-wrap">
        <div class="social-icons-left">
          <div class="social-share-icon">
            <amp-social-share style="border-radius:50%; background-size:75%;" type="facebook" width="32" height="32" data-param-app_id="2068443113476032" data-param-url="${canonicalUrl}" aria-label="Share on Facebook"></amp-social-share>
          </div>
          <div class="social-share-icon">
            <amp-social-share style="border-radius:50%; background-size:75%;" type="twitter" width="32" height="32" data-param-url="${canonicalUrl}" aria-label="Share on X"></amp-social-share>
          </div>
          <div class="social-share-icon">
            <amp-social-share style="border-radius:50%; background-size:75%;" type="whatsapp" width="32" height="32" data-param-url="${canonicalUrl}" aria-label="Share on WhatsApp"></amp-social-share>
          </div>
        </div>
        <a href="https://www.google.com/preferences/source?q=dinasuvadu.com" target="_blank" rel="noopener noreferrer" class="google-news-follow">
          Select <amp-img src="/dinasuvadu.svg" width="70" height="20" layout="fixed" alt="Dinasuvadu"></amp-img>
        </a>
      </div>
      
      <!-- Body Text -->
      <div class="article-body">
        ${bodyHtml}
      </div>
      
      <!-- Tags -->
      ${post.tags && post.tags.length > 0 ? `
      <div class="post-tags">
        <div class="tags-bar">
          ${post.tags.map((tag: any) => `
            <a href="${baseUrl}/tag/${tag.slug}" class="tag-chip">${escapeHtml(tag.name)}</a>
          `).join('')}
        </div>
      </div>
      ` : ''}
      

    </main>
    
    <!-- Footer -->
    <footer class="footer">
      <div class="footer-logo">
        <a href="${baseUrl}" aria-label="Dinasuvadu Home">
          <amp-img src="/dinasuvadu-white.png" alt="Dinasuvadu" width="120" height="30" layout="fixed"></amp-img>
        </a>
      </div>
      <div class="footer-copyright">
        &copy; ${new Date().getFullYear()} Dinasuvadu. All rights reserved.
      </div>
      <div class="footer-powered">
        Powered by <a href="https://vseyal.com" target="_blank" rel="noopener noreferrer">Vseyal</a>
      </div>
    </footer>
    
    <!-- Analytics -->
    <amp-analytics type="googleanalytics">
      <script type="application/json">
        {
          "vars": {
            "gtag_id": "G-YJ4CSJH2VC"
          },
          "triggers": {
            "trackPageview": {
              "on": "visible",
              "request": "pageview"
            }
          }
        }
      </script>
    </amp-analytics>
  </body>
</html>
`;
}
