import Link from "next/link";
import { BsGrid1X2Fill } from "react-icons/bs";
import { site } from "@/data/site";
import styles from "./Brand.module.scss";

export function Brand() {
  return (
    <Link className={styles.brand} href="/" aria-label={`${site.name} home`}>
      <span className={styles.mark} aria-hidden="true"><BsGrid1X2Fill /></span>
      <span>{site.name}</span>
    </Link>
  );
}
