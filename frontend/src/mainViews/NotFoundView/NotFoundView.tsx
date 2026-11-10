import Link from "next/link";
import { BsArrowLeft } from "react-icons/bs";
import styles from "./NotFoundView.module.scss";

export function NotFoundView() {
  return (
    <section className={styles.content}>
      <p className={styles.code}>404 / Page not found</p>
      <h1>This place is not<br />on the register.</h1>
      <p className={styles.description}>The page may have moved, or the address may be incomplete. Start again from the admission portal.</p>
      <Link className={`btn btn-primary ${styles.link}`} href="/"><BsArrowLeft aria-hidden="true" /> Return home</Link>
    </section>
  );
}
