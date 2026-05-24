# AMP Post Page — Technical Audit Report (Re-audit)

**Project:** Dinasuvadu (Payload CMS + Next.js 15)  
**Scope:** AMP routes, renderer, converter, CMS `isAMP`, frontend integration, collateral changes  
**Audit type:** Read-only code review (no code modified)  
**Report date:** May 23, 2026  
**Previous audit:** Same day (initial pass)

---

## Executive summary

The AMP feature set remains **structurally correct** for the primary flow: published post + `isAMP` enabled → canonical page links to `/amp{canonicalPath}` → AMP page links back via `<link rel="canonical">`.

Since the last review, **`ampRenderer.ts` received meaningful UI updates** (meta “time ago”, Google News follow chip, footer rebrand, social bar layout, color tweaks). **Core backend/SEO issues from the first audit are largely still open** (URL validation, nested JSON-LD, cache revalidation, embeds, `amphtml` placement, analytics).

**New items in this pass:** possible missing `/dinasuvadu-white.png` asset in repo; category link on AMP may be wrong for nested posts; `http://` footer link on HTTPS pages.

**Overall readiness:** Suitable for limited AMP rollout on simple articles (text + images). Not yet fully production-hardened for all post types, SEO edge cases, or instant post-publish freshness.

---

## What changed since the last audit

| Area | Change | Assessment |
|------|--------|------------|
| `ampRenderer.ts` | `formatTimeAgo()` for “Updated: X hours ago” | UX improvement |
| `ampRenderer.ts` | Google News “Select Dinasuvadu” chip in social bar | Feature parity with main site (verify URL) |
| `ampRenderer.ts` | Footer: black background, white logo path, “Powered by Vseyal” | Branding; verify asset + use HTTPS |
| `ampRenderer.ts` | Category accent `#194277`, tighter meta/social spacing | Cosmetic |
| `ampRenderer.ts` | Social icons 32px; Facebook first | Cosmetic |
| `Footer.tsx` / `globals.css` | Site footer black + Vseyal credit | Collateral (non-AMP) |
| AMP routes / converter / revalidate | No functional fixes observed | Prior P0/P1 items remain |

---

## Architecture

| Component | Location | Role |
|-----------|----------|------|
| AMP route (2 segments) | `src/app/amp/[categorySlug]/[postSlug]/route.ts` | GET → AMP HTML |
| AMP route (3 segments) | `src/app/amp/.../[subPostSlug]/route.ts` | Nested category posts |
| Renderer | `src/utilities/ampRenderer.ts` | Full AMP document |
| Converter | `src/utilities/ampConverter.ts` | HTML → AMP subset |
| CMS | `Posts.isAMP` checkbox | Opt-in per post |
| Discovery | Frontend post pages | `<link rel="amphtml" href="https://www.dinasuvadu.com/amp{canonicalPath}">` |

**URL pairing**

| Type | Canonical | AMP |
|------|-----------|-----|
| 2-level | `/news/article-slug` | `/amp/news/article-slug` |
| 3-level | `/news/tamilnadu/article-slug` | `/amp/news/tamilnadu/article-slug` |

Non-AMP posts at `/amp/...` → **302** to canonical. Unpublished → **404**.

---

## What works well

1. Canonical ↔ AMP URL pattern is consistent with Google’s paired-page model.
2. `isAMP` gating and published-only queries.
3. Lexical → HTML → `amp-img` / stripped scripts pipeline for basic content.
4. `revalidate = 300` + `Cache-Control` on AMP responses.
5. Redirect when `isAMP` is false.
6. Scratch AMP HTML samples still pass `amphtml-validator` (template-level).

---

## Findings

### P0 — Critical / high

#### 1. Category slug in URL is still not validated

Routes load posts by **`postSlug` / `subPostSlug` only**; `categorySlug` (and middle segment on 3-level URLs) are ignored.

**Risk:** Wrong category in URL still serves the article; slug collisions return arbitrary `limit: 1` result.

**Files:** `src/app/amp/[categorySlug]/[postSlug]/route.ts`, `.../[subPostSlug]/route.ts`

---

#### 2. JSON-LD still wrong for nested (3-segment) posts

`buildArticleLd()` is called with primary `categorySlug` + `post.slug` only:

```169:174:src/utilities/ampRenderer.ts
  const articleLd = buildArticleLd({
    post,
    categorySlug,
    postSlug: post.slug,
    apiUrl: payloadUrl,
  });
```

Produces `https://www.dinasuvadu.com/{categorySlug}/{postSlug}` instead of full `canonicalPath` (e.g. `/news/tamilnadu/my-post`).

**Also:** Breadcrumb category URL uses `${baseUrl}/${categorySlug}` — incorrect when the post lives under a subcategory.

**Fix direction:** Pass `canonicalUrl` / full path into `buildArticleLd` and breadcrumb builder.

---

#### 3. `rel="amphtml"` still not in document `<head>` via metadata

Still rendered in page JSX body:

```746:748:src/app/(frontend)/[categorySlug]/[postSlug]/page.tsx
        {post.isAMP && (
          <link rel="amphtml" href={`https://www.dinasuvadu.com/amp${canonicalPath}`} />
        )}
```

`generateMetadata()` does not set `alternates` for AMP. Prefer `metadata.alternates` or equivalent so the link is in `<head>`.

---

#### 4. No revalidation of `/amp/...` (or real post paths) on publish

`revalidatePost` still only calls `revalidatePath('/posts/${slug}')` — legacy path.

**Risk:** CMS edits visible on AMP only after ~5 minute cache window.

**File:** `src/collections/Posts/hooks/revalidatePost.ts`

---

#### 5. Social / video embeds not AMP-ready

`ampConverter` only handles `img`, `iframe`, removes `script`/`style`. Twitter/X, Instagram, YouTube, etc. need dedicated AMP components or removal.

**Risk:** Validator failures or broken AMP cache for embed-heavy posts.

---

#### 6. Analytics still placeholder

```843:848:src/utilities/ampRenderer.ts
    <amp-analytics type="googleanalytics">
      ...
            "account": "UA-XXXXX-Y"
```

No real measurement until configured (confirm GA4 vs legacy UA for `amp-analytics`).

---

### P1 — Medium

| # | Issue | Details |
|---|--------|---------|
| 7 | **Unescaped CMS HTML** | `title`, descriptions, nav labels, tags, captions, `bodyHtml` interpolated without encoding — markup break / XSS risk |
| 8 | **Captions may be Lexical objects** | `heroCaption`, `block.media.caption` used as strings — possible `[object Object]` |
| 9 | **300 categories fetched per AMP request** | Sidebar nav; no caching — latency + DB load |
| 10 | **Hardcoded production domain** | `amphtml` uses `https://www.dinasuvadu.com` — staging won’t advertise correct AMP URL |
| 11 | **Unused `ampUrl`** | `const ampUrl = \`${canonicalUrl}/amp\`` — dead code; real pattern is `/amp` + path prefix |
| 12 | **Category link on AMP header** | `href="${baseUrl}/${categorySlug}"` — wrong for nested posts (should match category segment in `canonicalPath`) |

---

### P2 — Low / new in this pass

| # | Issue | Details |
|---|--------|---------|
| 13 | **`/dinasuvadu-white.png` in footer** | Referenced in `ampRenderer`; **not present in repo `public/`** — confirm deployed asset or broken footer image |
| 14 | **Footer “Powered by Vseyal” uses `http://`** | On HTTPS AMP pages; prefer `https://` |
| 15 | **Google News chip** | Uses `amp-img` inside `<a>` — validate on real devices; URL: `google.com/preferences/source?q=dinasuvadu.com` |
| 16 | **Site-wide CSP** | `cdn.ampproject.org` in `script-src` for all routes (`next.config.js`) |
| 17 | **No AMP URLs in sitemaps** | Discovery via `amphtml` only |
| 18 | **`post.layout` in renderer** | Posts schema has no `layout` field — only affects legacy DB docs |

---

## Collateral impact (non-AMP)

| Change | Impact |
|--------|--------|
| `Footer.tsx` + `globals.css` | Black footer + Vseyal credit on all pages |
| `Posts.isAMP` | CMS checkbox (default off) |
| Post pages | Conditional `amphtml` link in body when `isAMP` |
| `next.config.js` | CSP allows AMP CDN scripts globally |

---

## Issues from first audit — status

| Issue | Status |
|-------|--------|
| URL validation for category segments | ❌ Open |
| Nested JSON-LD / breadcrumb URLs | ❌ Open |
| `amphtml` in `<head>` | ❌ Open |
| Publish revalidation for `/amp/...` | ❌ Open |
| Embed / AMP component support | ❌ Open |
| Real analytics ID | ❌ Open |
| HTML escaping | ❌ Open |
| Category menu caching | ❌ Open |
| UI/branding improvements | ✅ Partially addressed |
| White footer logo asset | ⚠️ New — verify deployment |

---

## Recommended manual test plan

1. Enable `isAMP` on one **2-segment** and one **3-segment** post.
2. Confirm canonical ↔ `/amp{path}` links in page source (note head vs body for `amphtml`).
3. Hit `/amp/wrong-category/{valid-slug}` — document behavior.
4. [AMP Validator](https://validator.ampproject.org/) on posts with images, Tamil text, embeds.
5. Toggle `isAMP` off → confirm 302 from `/amp/...`.
6. Edit post in CMS → check AMP freshness within cache TTL (~5 min).
7. Verify `/dinasuvadu-white.png` loads on production AMP footer.
8. View structured data (Rich Results Test) for nested-category AMP URL.

---

## Priority matrix

| Priority | Action items |
|----------|----------------|
| **P0** | Validate URL segments vs post; fix JSON-LD/breadcrumbs for 3-level paths |
| **P1** | `amphtml` in metadata; revalidate canonical + `/amp` paths; embed conversion; real analytics |
| **P2** | Escape HTML; cache categories; env-based base URL; footer asset + HTTPS links |

---

## Files reviewed

- `src/app/amp/[categorySlug]/[postSlug]/route.ts`
- `src/app/amp/[categorySlug]/[postSlug]/[subPostSlug]/route.ts`
- `src/utilities/ampRenderer.ts`
- `src/utilities/ampConverter.ts`
- `src/collections/Posts/index.ts`
- `src/collections/Posts/hooks/revalidatePost.ts`
- `src/app/(frontend)/[categorySlug]/[postSlug]/page.tsx`
- `src/app/(frontend)/[categorySlug]/[postSlug]/[subPostSlug]/page.tsx`
- `src/lib/post-url.ts`, `src/lib/seo.ts`
- `src/components/Footer.tsx`, `src/app/(frontend)/globals.css`
- `next.config.js`

---

## Conclusion

Recent work improved **AMP page UX and branding** but did not address the main **SEO, routing validation, cache, or embed** gaps. Treat AMP as **beta** until P0/P1 items are resolved, especially for nested-category articles and posts with third-party embeds.

---

*Read-only re-audit. No application code was modified.*
