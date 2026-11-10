"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import type { ClassSummary } from "@/shared/types/classes";
import styles from "./OccupancyBand.module.scss";

type Occupancy = Pick<ClassSummary, "totalSeats" | "heldSeats" | "confirmedSeats">;

export function OccupancyBand({ totalSeats, heldSeats, confirmedSeats }: Occupancy) {
  const band = useRef<HTMLDivElement>(null);
  const confirmedEnd = totalSeats > 0 ? confirmedSeats / totalSeats * 100 : 0;
  const occupiedEnd = totalSeats > 0 ? (confirmedSeats + heldSeats) / totalSeats * 100 : 0;
  const previous = useRef({ confirmedEnd, occupiedEnd });

  useLayoutEffect(() => {
    const element = band.current;
    if (!element) return;
    const from = previous.current;
    previous.current = { confirmedEnd, occupiedEnd };
    const setTarget = () => {
      element.style.setProperty("--confirmed-end", `${confirmedEnd}%`);
      element.style.setProperty("--occupied-end", `${occupiedEnd}%`);
    };
    // Initial and unchanged proportions are already accurate in the rendered HTML.
    if (from.confirmedEnd === confirmedEnd && from.occupiedEnd === occupiedEnd) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) {
      setTarget();
      return;
    }

    let active = true;
    let settled = false;
    let media: ReturnType<typeof import("gsap").default.matchMedia> | undefined;
    const settleForReducedMotion = () => {
      if (!motion.matches) return;
      settled = true;
      media?.revert();
      setTarget();
    };
    motion.addEventListener("change", settleForReducedMotion);
    // Hold the previous proportions before paint while the optional engine loads.
    element.style.setProperty("--confirmed-end", `${from.confirmedEnd}%`);
    element.style.setProperty("--occupied-end", `${from.occupiedEnd}%`);

    void import("gsap").then(({ default: gsap }) => {
      if (!active) return;
      if (settled || motion.matches) {
        setTarget();
        return;
      }
      media = gsap.matchMedia(element);
      media.add({ all: "all", reduce: "(prefers-reduced-motion: reduce)" }, context => {
        if (settled || context.conditions?.reduce) {
          setTarget();
          return;
        }
        // Both clipped capacity boundaries settle from the same data change.
        gsap.to(element, {
          "--confirmed-end": `${confirmedEnd}%`,
          "--occupied-end": `${occupiedEnd}%`,
          duration: 0.5,
          ease: "power3.out",
        });
        // Context reverts restore captured styles; always finish at the current data.
        return setTarget;
      });
    }).catch(() => {
      if (active) setTarget();
    });

    return () => {
      active = false;
      motion.removeEventListener("change", settleForReducedMotion);
      media?.revert();
      setTarget();
    };
  }, [confirmedEnd, occupiedEnd]);

  const boundaries = {
    "--confirmed-end": `${confirmedEnd}%`,
    "--occupied-end": `${occupiedEnd}%`,
  } as CSSProperties;

  return (
    <div ref={band} className={styles.band} style={boundaries} aria-hidden="true">
      <span className={styles.confirmed} />
      <span className={styles.held} />
      <span className={styles.available} />
    </div>
  );
}
