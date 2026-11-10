import type { Metadata } from "next";
import { ClassesView } from "@/mainViews/ClassesView";
import { PageTransition } from "@/shared/components/PageTransition";

export const metadata: Metadata = {
  title: "Classes",
  description: "Browse classes and see their current total, held, confirmed and available seats.",
  alternates: { canonical: "/classes" },
};

export default function ClassesPage() {
  return <PageTransition><ClassesView /></PageTransition>;
}
