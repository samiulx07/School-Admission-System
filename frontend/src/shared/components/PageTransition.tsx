import { ViewTransition } from "react";
import styles from "./PageTransition.module.scss";

export function PageTransition({ children }: { children: React.ReactNode }) {
  return <ViewTransition name="admission-page" share="page-settle" enter="page-settle" exit="page-settle" default="none"><div className={styles.surface}>{children}</div></ViewTransition>;
}
