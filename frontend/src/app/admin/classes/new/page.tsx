import type { Metadata } from "next";
import { CreateClassView } from "@/mainViews/CreateClassView";

export const metadata: Metadata = {
  title: "Create a class",
  description: "Create a school class and set its total seat capacity.",
  alternates: { canonical: "/admin/classes/new" },
  openGraph: { title: "Create a class", description: "Create a school class and set its total seat capacity.", url: "/admin/classes/new" },
};

export default function CreateClassPage() {
  return <CreateClassView />;
}
