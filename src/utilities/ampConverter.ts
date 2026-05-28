import { parse } from 'node-html-parser';

/**
 * Result of convertHtmlToAmp — carries both the converted HTML string and
 * flags for which AMP extended components were used, so the renderer can
 * inject the correct <script> tags in <head>.
 */
export interface AmpConversionResult {
  html: string;
  usesTwitter: boolean;
  usesInstagram: boolean;
}

/**
 * Extracts a Twitter/X tweet ID from a URL.
 * Handles twitter.com and x.com status URLs.
 */
function extractTweetId(url: string): string | null {
  const m = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status(?:es)\/(\d+)/i);
  return m?.[1] ?? null;
}

/**
 * Extracts an Instagram shortcode from a post URL.
 * Handles /p/, /reel/, and /tv/ formats.
 */
function extractInstagramShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  return m?.[1] ?? null;
}

/**
 * Converts standard HTML content into AMP-compliant HTML by replacing
 * disallowed tags (e.g. img → amp-img, iframe → amp-iframe/amp-youtube,
 * twitter blockquotes → amp-twitter, instagram blockquotes → amp-instagram)
 * and removing script/style tags.
 */
export function convertHtmlToAmp(html: string): AmpConversionResult {
  if (!html) return { html: '', usesTwitter: false, usesInstagram: false };

  let usesTwitter = false;
  let usesInstagram = false;

  try {
    const root = parse(html);

    // ── 1. Twitter / X blockquote embeds ────────────────────────────────────
    // Pattern: <blockquote class="twitter-tweet">…</blockquote>
    const twitterQuotes = root.querySelectorAll('blockquote.twitter-tweet');
    twitterQuotes.forEach((bq) => {
      // Find the last anchor href — that usually carries the tweet URL
      const anchors = bq.querySelectorAll('a');
      let tweetId: string | null = null;
      for (const a of anchors) {
        const href = a.getAttribute('href') || '';
        tweetId = extractTweetId(href);
        if (tweetId) break;
      }
      if (tweetId) {
        usesTwitter = true;
        bq.replaceWith(
          `<amp-twitter data-tweetid="${tweetId}" width="375" height="472" layout="responsive"></amp-twitter>`,
        );
      } else {
        // No tweet ID found — render a safe link fallback
        const fallbackHref =
          bq.querySelector('a')?.getAttribute('href') || 'https://twitter.com';
        bq.replaceWith(
          `<a href="${fallbackHref}" class="embed-fallback">View tweet on X (Twitter)</a>`,
        );
      }
    });

    // ── 2. Instagram blockquote embeds ──────────────────────────────────────
    // Pattern: <blockquote class="instagram-media" data-instgrm-permalink="…">
    const igQuotes = root.querySelectorAll('blockquote.instagram-media');
    igQuotes.forEach((bq) => {
      const permalink =
        bq.getAttribute('data-instgrm-permalink') ||
        bq.querySelector('a')?.getAttribute('href') ||
        '';
      const shortcode = extractInstagramShortcode(permalink);
      if (shortcode) {
        usesInstagram = true;
        bq.replaceWith(
          `<amp-instagram data-shortcode="${shortcode}" width="1" height="1" layout="responsive"></amp-instagram>`,
        );
      } else {
        const fallbackHref = permalink || 'https://www.instagram.com';
        bq.replaceWith(
          `<a href="${fallbackHref}" class="embed-fallback">View post on Instagram</a>`,
        );
      }
    });

    // ── 2.5 Unwrap <picture> tags (disallowed in AMP outside noscript) ──────
    const pictures = root.querySelectorAll('picture');
    pictures.forEach((pic) => {
      const img = pic.querySelector('img');
      if (img) {
        // Replace the picture wrapper with just the inner img tag
        pic.replaceWith(img.toString());
      } else {
        pic.remove();
      }
    });

    // ── 3. Convert standard img → amp-img ───────────────────────────────────
    const images = root.querySelectorAll('img');
    images.forEach((img) => {
      const src = img.getAttribute('src');
      if (!src) {
        img.remove();
        return;
      }
      const alt = img.getAttribute('alt') || '';

      let width = img.getAttribute('width') || '';
      let height = img.getAttribute('height') || '';

      if (!width || width.includes('%') || isNaN(Number(width))) width = '600';
      if (!height || height.includes('%') || isNaN(Number(height))) height = '400';

      img.replaceWith(
        `<amp-img src="${src}" alt="${alt}" width="${width}" height="${height}" layout="responsive" lightbox="true"></amp-img>`,
      );
    });

    // ── 4. Convert iframes → amp-youtube / amp-twitter / amp-iframe ─────────
    const iframes = root.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      const src = iframe.getAttribute('src');
      if (!src) {
        iframe.remove();
        return;
      }

      // YouTube
      const ytMatch = src.match(
        /(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/i,
      );
      if (ytMatch?.[1]) {
        iframe.replaceWith(
          `<amp-youtube data-videoid="${ytMatch[1]}" width="480" height="270" layout="responsive"></amp-youtube>`,
        );
        return;
      }

      // Twitter player iframe
      if (/(?:twitter\.com|x\.com)\/i\/(?:videos|tweet)/i.test(src)) {
        const tweetId = extractTweetId(src);
        if (tweetId) {
          usesTwitter = true;
          iframe.replaceWith(
            `<amp-twitter data-tweetid="${tweetId}" width="375" height="472" layout="responsive"></amp-twitter>`,
          );
          return;
        }
      }

      // Instagram iframe
      if (/instagram\.com\/(?:p|reel|tv)/i.test(src)) {
        const shortcode = extractInstagramShortcode(src);
        if (shortcode) {
          usesInstagram = true;
          iframe.replaceWith(
            `<amp-instagram data-shortcode="${shortcode}" width="1" height="1" layout="responsive"></amp-instagram>`,
          );
          return;
        }
      }

      // Generic iframe → amp-iframe (https required)
      let secureSrc = src;
      if (src.startsWith('http://')) {
        secureSrc = src.replace('http://', 'https://');
      } else if (src.startsWith('//')) {
        secureSrc = `https:${src}`;
      }

      let width = iframe.getAttribute('width') || '600';
      let height = iframe.getAttribute('height') || '400';
      if (!width || width.includes('%') || isNaN(Number(width))) width = '600';
      if (!height || height.includes('%') || isNaN(Number(height))) height = '400';

      iframe.replaceWith(
        `<amp-iframe src="${secureSrc}" width="${width}" height="${height}" layout="responsive" sandbox="allow-scripts allow-same-origin allow-popups" frameborder="0"></amp-iframe>`,
      );
    });

    // ── 5. Remove inline script tags (disallowed in AMP) ────────────────────
    root.querySelectorAll('script').forEach((s) => s.remove());

    // ── 6. Remove inline style tags (disallowed in AMP) ─────────────────────
    root.querySelectorAll('style').forEach((s) => s.remove());

    return { html: root.toString(), usesTwitter, usesInstagram };
  } catch (error) {
    console.error('Error converting HTML to AMP:', error);
    // Safe regex fallback — only handles img tags
    const fallbackHtml = html
      .replace(/<img([^>]+)>/gi, (_, attrs) => {
        const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
        const altMatch = attrs.match(/alt=["']([^"']+)["']/i);
        const src = srcMatch?.[1] || '';
        const alt = altMatch?.[1] || '';
        return src
          ? `<amp-img src="${src}" alt="${alt}" width="600" height="400" layout="responsive" lightbox="true"></amp-img>`
          : '';
      })
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return { html: fallbackHtml, usesTwitter, usesInstagram };
  }
}
