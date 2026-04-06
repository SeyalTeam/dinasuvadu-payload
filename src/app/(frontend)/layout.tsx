import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getPayload } from "payload";
import config from "@/payload.config";
import Script from "next/script";
import { unstable_cache } from "next/cache";
import { Mukta_Malar } from "next/font/google";

const muktaMalar = Mukta_Malar({
  subsets: ["tamil", "latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-mukta-malar",
});

type Category = {
  id: string;
  title: string;
  slug: string;
  parent?: { id: string; slug: string; title: string } | string;
};

const fetchCategoriesCached = unstable_cache(
  async (): Promise<{ all: Category[]; homepage: Category[] }> => {
    const payload = await getPayload({ config });

    // Fetch only the fields needed by frontend nav to keep payload small.
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
    const allCategories = (allRes.docs as unknown as Category[]) || [];
    const categoriesById = new Map(
      allCategories.map((category) => [String(category.id), category])
    );

    // Read only homepage category IDs, then hydrate from allCategories map.
    const homepageSettings = (await payload.findGlobal({
      slug: "homepage-settings",
      depth: 0,
      select: {
        categories: true,
      },
    })) as { categories?: (string | Category)[] };

    let homepageCategories: Category[] = [];
    if (homepageSettings.categories && homepageSettings.categories.length > 0) {
      homepageCategories = homepageSettings.categories
        .map((categoryRef) =>
          typeof categoryRef === "string"
            ? categoriesById.get(categoryRef)
            : categoriesById.get(String(categoryRef.id)) || categoryRef
        )
        .filter(Boolean) as Category[];
    }

    return {
      all: allCategories,
      homepage: homepageCategories,
    };
  },
  ["layout-categories-homepage"],
  { revalidate: 300 }
);

async function fetchCategories(): Promise<{ all: Category[]; homepage: Category[] }> {
  try {
    return await fetchCategoriesCached();
  } catch (err) {
    console.error("Error fetching categories for layout:", err);
    return { all: [], homepage: [] };
  }
}

export const metadata: Metadata = {
  title: "Dinasuvadu - Latest Tamil News",
  description: "Tamil news portal with latest updates on politics, cinema, and sports.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { all, homepage } = await fetchCategories();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={muktaMalar.variable} suppressHydrationWarning>
        <Header categories={all} homepageCategories={homepage} />
        {children}
        <Footer />
        {/* Google Analytics GA4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=G-YJ4CSJH2VC`}
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-YJ4CSJH2VC');
          `}
        </Script>

      </body>
    </html>
  );
}
