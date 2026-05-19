import { unstable_cache } from "next/cache";
import { getPayload } from "payload";
import config from "@/payload.config";

export type LayoutCategory = {
  id: string;
  title: string;
  slug: string;
  parent?: { id: string; slug: string; title: string } | string;
};

const fetchCategoriesCached = unstable_cache(
  async (): Promise<{ all: LayoutCategory[]; homepage: LayoutCategory[] }> => {
    const payload = await getPayload({ config });

    const allRes = await payload.find({
      collection: "categories",
      depth: 0,
      limit: 200,
      select: {
        id: true,
        title: true,
        slug: true,
        parent: true,
      },
    });
    const allCategories = (allRes.docs as unknown as LayoutCategory[]) || [];
    const categoriesById = new Map(
      allCategories.map((category) => [String(category.id), category])
    );

    const homepageSettings = (await payload.findGlobal({
      slug: "homepage-settings",
      depth: 0,
      select: {
        categories: true,
      },
    })) as { categories?: (string | LayoutCategory)[] };

    let homepageCategories: LayoutCategory[] = [];
    if (homepageSettings.categories && homepageSettings.categories.length > 0) {
      homepageCategories = homepageSettings.categories
        .map((categoryRef) =>
          typeof categoryRef === "string"
            ? categoriesById.get(categoryRef)
            : categoriesById.get(String(categoryRef.id)) || categoryRef
        )
        .filter(Boolean) as LayoutCategory[];
    }

    return {
      all: allCategories,
      homepage: homepageCategories,
    };
  },
  ["layout-categories-homepage"],
  { revalidate: 600 }
);

export async function getLayoutCategories(): Promise<{
  all: LayoutCategory[];
  homepage: LayoutCategory[];
}> {
  try {
    return await fetchCategoriesCached();
  } catch (err) {
    console.error("Error fetching categories for layout:", err);
    return { all: [], homepage: [] };
  }
}
