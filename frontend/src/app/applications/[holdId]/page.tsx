import type { Metadata } from "next";
import { ApplicationDetailView } from "@/mainViews/ApplicationDetailView";
import { readPublicApplication } from "@/services/publicAdmissions.server";
import { PageTransition } from "@/shared/components/PageTransition";

export async function generateMetadata({ params }: { params: Promise<{ holdId: string }> }): Promise<Metadata> {
  const { holdId } = await params;
  return {
    title: "Application details",
    description: "Check your application status and the time remaining on a held place.",
    alternates: { canonical: `/applications/${encodeURIComponent(holdId.toLowerCase())}` },
    robots: { index: false, follow: false },
  };
}

export default async function ApplicationPage({ params }: { params: Promise<{ holdId: string }> }) {
  const { holdId } = await params;
  const normalizedId = holdId.toLowerCase();
  const initial = await readPublicApplication(normalizedId);
  return <PageTransition><ApplicationDetailView holdId={normalizedId} initialHold={initial?.hold} initialClass={initial?.admissionClass} /></PageTransition>;
}
