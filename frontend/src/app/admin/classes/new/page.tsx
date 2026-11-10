import type { Metadata } from "next";
import { CreateClassView } from "@/mainViews/CreateClassView";
import { socialImages } from "@/shared/utils/siteMetadata";
import { PageTransition } from "@/shared/components/PageTransition";

export const metadata: Metadata = {
  title: "Create a class",
  description: "Create a school class and set its total seat capacity.",
  alternates: { canonical: "/admin/classes/new" },
  openGraph: { title: "Create a class", description: "Create a school class and set its total seat capacity.", url: "/admin/classes/new", images: socialImages },
  robots: { index: false, follow: false },
};

export default function CreateClassPage() {
  return <PageTransition><CreateClassView /></PageTransition>;
}
