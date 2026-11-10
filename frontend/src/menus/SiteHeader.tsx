"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Navbar from "react-bootstrap/Navbar";
import { Brand } from "@/shared/components/Brand";
import { useStudentIdentity } from "@/shared/hooks/useStudentIdentity";
import styles from "./SiteHeader.module.scss";

export function SiteHeader() {
  const pathname = usePathname();
  const { studentId } = useStudentIdentity();
  return (
    <header className={styles.header}>
      <Navbar as="div" className={styles.inner}>
        <Brand />
        <nav className={styles.navigation} aria-label="Primary">
          <Link className={styles.link} href="/" aria-current={pathname === "/" ? "page" : undefined}>Home</Link>
          <Link className={styles.link} href="/#how-it-works">How it works</Link>
          <Link className={styles.link} href="/student" aria-current={pathname === "/student" ? "page" : undefined}>{studentId ? "Student number set" : "Set student number"}</Link>
        </nav>
      </Navbar>
    </header>
  );
}
