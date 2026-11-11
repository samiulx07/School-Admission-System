import type { ClassSummary } from "@/shared/types/classes";
import { ReserveSeatButton } from "@/features/admissions/holds/ReserveSeatButton/ReserveSeatButton";
import { OccupancyBand } from "../OccupancyBand/OccupancyBand";
import styles from "./ClassRow.module.scss";

export function ClassRow({ admissionClass }: { admissionClass: ClassSummary }) {
  const { id, name, totalSeats, heldSeats, confirmedSeats, availableSeats } = admissionClass;
  const headingId = `class-${id}`;

  return (
    <li className={styles.row}>
      <article aria-labelledby={headingId} className={styles.content}>
        <div className={styles.name}>
          <h3 id={headingId}>{name}</h3>
          <span className={`${styles.availability} ${availableSeats === 0 ? styles.full : ""}`}>
            <span aria-hidden="true" />{availableSeats > 0 ? "Open for applications" : "No places available"}
          </span>
        </div>
        <div className={styles.capacity}>
          <OccupancyBand totalSeats={totalSeats} heldSeats={heldSeats} confirmedSeats={confirmedSeats} />
          <dl className={`${styles.counts} ${totalSeats >= 1_000 ? styles.largeCounts : ""}`}>
            <div><dt>Total seats</dt><dd>{totalSeats.toLocaleString("en")}</dd></div>
            <div><dt>Confirmed</dt><dd>{confirmedSeats.toLocaleString("en")}</dd></div>
            <div><dt>Held</dt><dd>{heldSeats.toLocaleString("en")}</dd></div>
            <div className={styles.available}><dt>Available</dt><dd>{availableSeats.toLocaleString("en")}</dd></div>
          </dl>
        </div>
        <div className={styles.action}><ReserveSeatButton classId={id} availableSeats={availableSeats} /></div>
      </article>
    </li>
  );
}
