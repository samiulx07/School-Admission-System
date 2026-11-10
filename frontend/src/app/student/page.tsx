import type { Metadata } from "next";
import { StudentView } from "@/mainViews/StudentView/StudentView";
import { PageTransition } from "@/shared/components/PageTransition/PageTransition";

export const metadata: Metadata = {
  title: "Student registration number",
  description: "Set, update or clear the student registration number used for your school admission applications.",
  alternates: { canonical: "/student" },
  robots: { index: false, follow: true },
};

export default function StudentPage() {
  return <PageTransition><StudentView /></PageTransition>;
}
