import { HomeView } from "@/mainViews/HomeView/HomeView";

import { PageTransition } from "@/shared/components/PageTransition/PageTransition";

export default function HomePage() {
  return <PageTransition><HomeView /></PageTransition>;
}
