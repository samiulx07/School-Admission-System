"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Navbar from "react-bootstrap/Navbar";
import { Brand } from "@/shared/components/Brand";
import styles from "./SiteHeader.module.scss";

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className={styles.header}>
      <Navbar as="div" className={styles.inner}>
        <Brand />
        <nav className={styles.navigation} aria-label="Primary">
          <Link className={styles.link} href="/" aria-current={pathname === "/" ? "page" : undefined}>Home</Link>
          <Link className={styles.link} href="/#how-it-works">How it works</Link>
        </nav>
      </Navbar>
    </header>
  );
}
