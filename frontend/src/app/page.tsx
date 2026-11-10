import { HomeView } from "@/mainViews/HomeView";

import { PageTransition } from "@/shared/components/PageTransition";

export default function HomePage() {
  return <PageTransition><HomeView /></PageTransition>;
}
