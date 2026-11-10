import { SiteHeader } from "@/menus/SiteHeader/SiteHeader";
import { SiteFooter } from "@/menus/SiteFooter/SiteFooter";
import styles from "./SiteLayout.module.scss";

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <SiteHeader />
      <main className={styles.main} id="main-content" tabIndex={-1}>{children}</main>
      <SiteFooter />
    </div>
  );
}
