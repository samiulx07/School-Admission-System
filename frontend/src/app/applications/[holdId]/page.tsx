import type { Metadata } from "next";
import { ApplicationDetailView } from "@/mainViews/ApplicationDetailView";

export const metadata: Metadata = {
  title: "Application details",
  description: "Check your application status and the time remaining on a held place.",
  robots: { index: false, follow: false },
};

export default async function ApplicationPage({ params }: { params: Promise<{ holdId: string }> }) {
  const { holdId } = await params;
  return <ApplicationDetailView holdId={holdId} />;
}
