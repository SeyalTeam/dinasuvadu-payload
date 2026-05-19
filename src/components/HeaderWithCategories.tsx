import Header from "@/components/Header";
import { getLayoutCategories } from "@/lib/layout-categories";

export async function HeaderWithCategories() {
  const { all, homepage } = await getLayoutCategories();
  return <Header categories={all} homepageCategories={homepage} />;
}
