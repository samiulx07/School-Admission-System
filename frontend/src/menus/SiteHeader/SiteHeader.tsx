"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "react-bootstrap/Navbar";
import { BsGrid, BsHouseDoor, BsJournalText, BsList, BsPerson, BsPlusCircle, BsX } from "react-icons/bs";
import { Brand } from "@/shared/components/Brand/Brand";
import { useStudentIdentity } from "@/shared/hooks/useStudentIdentity";
import { StudentIdentityBar } from "@/features/admissions/identity/StudentIdentityBar/StudentIdentityBar";
import styles from "./SiteHeader.module.scss";

export function SiteHeader() {
  const pathname = usePathname();
  const { studentId } = useStudentIdentity();
  const [expanded, setExpanded] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const closeMenu = () => setExpanded(false);
  return (
    <header className={styles.header}>
      <StudentIdentityBar />
      <Navbar as="div" expand="lg" expanded={expanded} onToggle={setExpanded} className={styles.inner}>
        <Brand />
        <Navbar.Toggle ref={toggle} aria-controls="primary-navigation" label={expanded ? "Close navigation" : "Open navigation"} className={styles.toggle}>
          {expanded ? <BsX aria-hidden="true" /> : <BsList aria-hidden="true" />}
        </Navbar.Toggle>
        <Navbar.Collapse id="primary-navigation" className={styles.collapse}>
          <nav className={styles.navigation} aria-label="Primary" onKeyDown={(event) => {
            if (event.key === "Escape") { closeMenu(); toggle.current?.focus(); }
          }}>
            <Link className={styles.link} onClick={closeMenu} href="/" aria-current={pathname === "/" ? "page" : undefined}><BsHouseDoor aria-hidden="true" />Home</Link>
            <Link className={styles.link} onClick={closeMenu} href="/classes" aria-current={pathname === "/classes" ? "page" : undefined}><BsGrid aria-hidden="true" />Classes</Link>
            <Link className={styles.link} onClick={closeMenu} href="/applications" aria-current={pathname.startsWith("/applications") ? "page" : undefined}><BsJournalText aria-hidden="true" />My applications</Link>
            <Link className={styles.link} onClick={closeMenu} href="/admin/classes/new" aria-current={pathname === "/admin/classes/new" ? "page" : undefined}><BsPlusCircle aria-hidden="true" />Create class</Link>
            <Link className={styles.link} onClick={closeMenu} href="/student" aria-current={pathname === "/student" ? "page" : undefined}><BsPerson aria-hidden="true" />{studentId ? "Student number set" : "Set student number"}</Link>
          </nav>
        </Navbar.Collapse>
      </Navbar>
    </header>
  );
}
