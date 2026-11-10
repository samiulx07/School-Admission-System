import type { Metadata } from "next";
import { ApplicationHistoryView } from "@/mainViews/ApplicationHistoryView";
import { socialImages } from "@/shared/utils/siteMetadata";
import { PageTransition } from "@/shared/components/PageTransition";

export const metadata: Metadata = {
  title: "Your applications",
  description: "Review your school admission holds, confirmations and application history.",
  alternates: { canonical: "/applications" },
  openGraph: { title: "Your applications", description: "Review your school admission holds, confirmations and application history.", url: "/applications", images: socialImages },
  robots: { index: false, follow: false },
};

export default function ApplicationsPage() {
  return <PageTransition><ApplicationHistoryView /></PageTransition>;
}
