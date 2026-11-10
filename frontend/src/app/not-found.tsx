import type { Metadata } from "next";
import { NotFoundView } from "@/mainViews/NotFoundView";
import { PageTransition } from "@/shared/components/PageTransition";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page is not on the register. Return to the Seatwise admission portal.",
  robots: { index: false, follow: false },
};

export default function NotFoundPage() { return <PageTransition><NotFoundView /></PageTransition>; }
