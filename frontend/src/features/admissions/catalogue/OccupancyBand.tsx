"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import gsap from "gsap";
import type { ClassSummary } from "@/shared/types/classes";
import styles from "./OccupancyBand.module.scss";

type Occupancy = Pick<ClassSummary, "totalSeats" | "heldSeats" | "confirmedSeats">;

export function OccupancyBand({ totalSeats, heldSeats, confirmedSeats }: Occupancy) {
  const band = useRef<HTMLDivElement>(null);
  const confirmedEnd = totalSeats > 0 ? confirmedSeats / totalSeats * 100 : 0;
  const occupiedEnd = totalSeats > 0 ? (confirmedSeats + heldSeats) / totalSeats * 100 : 0;
  const previous = useRef({ confirmedEnd, occupiedEnd });

  useEffect(() => {
    const element = band.current;
    if (!element) return;
    const from = previous.current;
    previous.current = { confirmedEnd, occupiedEnd };
    const media = gsap.matchMedia(element);
    media.add({ all: "all", reduce: "(prefers-reduced-motion: reduce)" }, context => {
      if (context.conditions?.reduce) {
        gsap.set(element, {
          "--confirmed-end": `${confirmedEnd}%`,
          "--occupied-end": `${occupiedEnd}%`,
        });
        return;
      }
      // One data-derived timeline keeps both capacity boundaries in agreement.
      gsap.fromTo(element, {
        "--confirmed-end": `${from.confirmedEnd}%`,
        "--occupied-end": `${from.occupiedEnd}%`,
      }, {
        "--confirmed-end": `${confirmedEnd}%`,
        "--occupied-end": `${occupiedEnd}%`,
        duration: 0.5,
        ease: "power3.out",
      });
    });
    return () => media.revert();
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
