type ParentCategoryLike = {
  slug?: string | null;
};

export type CategoryPathLike = {
  id?: string | null;
  slug?: string | null;
  parent?: { id?: string | null; slug?: string | null } | string | null;
};

export type PostPathLike = {
  slug?: string | null;
  categories?: CategoryPathLike[] | null;
};

type ParentCategoryResolver = (
  parentId: string
) => Promise<ParentCategoryLike | null>;

type ResolveContext = {
  topLevelSlug?: string;
  subCategorySlug?: string;
};

function normalizeSlug(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeForCompare(value?: string | null): string | null {
  const normalized = normalizeSlug(value);
  return normalized ? normalized.toLowerCase() : null;
}

function uniquePaths(paths: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const path of paths) {
    if (!seen.has(path)) {
      seen.add(path);
      unique.push(path);
    }
  }

  return unique;
}

function splitPath(path: string): string[] {
  return path.split("/").filter(Boolean);
}

export async function resolvePostPathCandidates(
  post: PostPathLike,
  resolveParentCategory: ParentCategoryResolver
): Promise<string[]> {
  const postSlug = normalizeSlug(post.slug) || "fallback-slug";
  const categories = Array.isArray(post.categories) ? post.categories : [];
  const candidates: string[] = [];

  for (const category of categories) {
    const categorySlug = normalizeSlug(category?.slug);
    if (!categorySlug) continue;

    const parent = category?.parent;
    if (parent) {
      let parentSlug: string | null = null;

      if (typeof parent === "string") {
        const parentCategory = await resolveParentCategory(parent);
        parentSlug = normalizeSlug(parentCategory?.slug || null);
      } else {
        parentSlug = normalizeSlug(parent.slug || null);
      }

      if (parentSlug) {
        candidates.push(`/${parentSlug}/${categorySlug}/${postSlug}`);
        continue;
      }
    }

    candidates.push(`/${categorySlug}/${postSlug}`);
  }

  if (candidates.length === 0) {
    candidates.push(`/uncategorized/${postSlug}`);
  }

  return uniquePaths(candidates);
}

export async function resolveCanonicalPostPath(
  post: PostPathLike,
  resolveParentCategory: ParentCategoryResolver
): Promise<string> {
  const candidates = await resolvePostPathCandidates(post, resolveParentCategory);
  return candidates[0] || `/uncategorized/${normalizeSlug(post.slug) || "fallback-slug"}`;
}

export async function resolvePostPathForContext(
  post: PostPathLike,
  context: ResolveContext,
  resolveParentCategory: ParentCategoryResolver
): Promise<string> {
  const candidates = await resolvePostPathCandidates(post, resolveParentCategory);
  const topLevelSlug = normalizeSlug(context.topLevelSlug);
  const subCategorySlug = normalizeSlug(context.subCategorySlug);
  const topLevelSlugCmp = normalizeForCompare(context.topLevelSlug);
  const subCategorySlugCmp = normalizeForCompare(context.subCategorySlug);

  if (topLevelSlug && subCategorySlug && topLevelSlugCmp && subCategorySlugCmp) {
    const exactSubcategoryMatch = candidates.find((candidate) => {
      const segments = splitPath(candidate);
      return (
        segments.length === 3 &&
        normalizeForCompare(segments[0]) === topLevelSlugCmp &&
        normalizeForCompare(segments[1]) === subCategorySlugCmp
      );
    });

    if (exactSubcategoryMatch) return exactSubcategoryMatch;
  }

  if (topLevelSlug && topLevelSlugCmp) {
    const topLevelMatch = candidates.find((candidate) => {
      const segments = splitPath(candidate);
      return (
        segments.length >= 2 &&
        normalizeForCompare(segments[0]) === topLevelSlugCmp
      );
    });

    if (topLevelMatch) return topLevelMatch;
  }

  return candidates[0] || `/uncategorized/${normalizeSlug(post.slug) || "fallback-slug"}`;
}

export function hasTopLevelAliasMatch(
  candidates: string[],
  topLevelSlug: string,
  postSlug: string
): boolean {
  const top = normalizeForCompare(topLevelSlug);
  const post = normalizeForCompare(postSlug);
  if (!top || !post) return false;

  return candidates.some((candidate) => {
    const segments = splitPath(candidate);
    return (
      segments.length === 3 &&
      normalizeForCompare(segments[0]) === top &&
      normalizeForCompare(segments[2]) === post
    );
  });
}

export function hasTopLevelAndPostSlugMatch(
  candidates: string[],
  topLevelSlug: string,
  postSlug: string
): boolean {
  const top = normalizeForCompare(topLevelSlug);
  const post = normalizeForCompare(postSlug);
  if (!top || !post) return false;

  return candidates.some((candidate) => {
    const segments = splitPath(candidate);
    return (
      segments.length >= 2 &&
      normalizeForCompare(segments[0]) === top &&
      normalizeForCompare(segments[segments.length - 1]) === post
    );
  });
}
