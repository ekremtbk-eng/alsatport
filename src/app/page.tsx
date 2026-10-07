import type { Metadata } from "next";
import { HomeLanding } from "@/components/home/HomeLanding";
import { SEO_DESCRIPTION, SEO_TITLE, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  path: "/",
});

export default function HomePage() {
  return <HomeLanding />;
}
