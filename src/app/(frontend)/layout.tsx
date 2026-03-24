import type { Metadata } from "next";
import "./globals.css";
import "antd/dist/reset.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getPayload } from "payload";
import config from "@/payload.config";

type Category = {
  id: string;
  title: string;
  slug: string;
  parent?: { id: string; slug: string; title: string } | string;
};

async function fetchCategories(): Promise<Category[]> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "categories",
      depth: 2,
      limit: 100,
    });
    return (res.docs as unknown as Category[]) || [];
  } catch (err) {
    console.error("Error fetching categories for layout:", err);
    return [];
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
  const categories = await fetchCategories();

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Header categories={categories} />
        {children}
        <Footer />
      </body>
    </html>
  );
}