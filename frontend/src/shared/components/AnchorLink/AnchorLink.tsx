"use client";

import type { MouseEvent, ReactNode } from "react";
import { scroller } from "react-scroll";
import styles from "./AnchorLink.module.scss";

type AnchorLinkProps = { target: string; children: ReactNode; className?: string };

export function AnchorLink({ target, children, className = "" }: AnchorLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const destination = document.getElementById(target);
    if (!destination) return;
    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.history.replaceState(null, "", `#${target}`);
    scroller.scrollTo(target, { smooth: !reduceMotion, duration: reduceMotion ? 0 : 450, offset: -32 });
    destination.focus({ preventScroll: true });
  }
  return <a className={`${styles.link} ${className}`} href={`#${target}`} onClick={handleClick}>{children}</a>;
}
