import Link from "next/link";
import dayjs from "dayjs";
import { BsArrowRight } from "react-icons/bs";
import type { StudentHold } from "@/shared/types/holds";
import { ApplicationStatus } from "../ApplicationStatus/ApplicationStatus";
import styles from "./ApplicationHistoryRow.module.scss";

export function ApplicationHistoryRow({ hold }: { hold: StudentHold }) {
  const isTerminal = hold.status === "EXPIRED" || hold.status === "CANCELLED";

  return (
    <li className={styles.row}>
      <article aria-labelledby={`application-${hold.holdId}`}>
        <div className={styles.className}>
          <h3 id={`application-${hold.holdId}`}>{hold.className}</h3>
          <p>{hold.status === "HELD" ? "A place is held for your decision." : hold.status === "CONFIRMED" ? "Your admission is confirmed." : hold.status === "EXPIRED" ? "This hold has ended." : "This place was released."}</p>
        </div>
        <div className={styles.record}>
          <ApplicationStatus status={hold.status} />
          <p>Applied <time dateTime={hold.createdAt}>{dayjs(hold.createdAt).format("MMM D, YYYY [at] h:mm A")}</time></p>
        </div>
        <div className={styles.actions}>
          <Link href={`/applications/${hold.holdId}`} className={styles.view}>{hold.status === "HELD" ? "Review hold" : "View application"}<span className="visually-hidden"> for {hold.className}</span><BsArrowRight aria-hidden="true" /></Link>
          {isTerminal ? <Link href="/classes" className={styles.reapply}>Apply again<span className="visually-hidden"> for {hold.className}</span></Link> : null}
        </div>
      </article>
    </li>
  );
}
