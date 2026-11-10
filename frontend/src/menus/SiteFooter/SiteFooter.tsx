import Link from "next/link";
import { Brand } from "@/shared/components/Brand/Brand";
import styles from "./SiteFooter.module.scss";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div><Brand /><p>A clearer school admission process.</p></div>
        <div className={styles.details}>
          <Link className={styles.link} href="/#how-it-works">How admission works</Link>
          <p>Seatwise is a fictional admission portal.</p>
        </div>
      </div>
    </footer>
  );
}
