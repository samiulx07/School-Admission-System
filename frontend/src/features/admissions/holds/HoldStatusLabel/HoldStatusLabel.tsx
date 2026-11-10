import type { HoldStatus } from "@/shared/types/holds";
import styles from "./HoldStatusLabel.module.scss";

const labels: Record<HoldStatus, string> = { HELD: "Place held", CONFIRMED: "Admission confirmed", EXPIRED: "Hold expired", CANCELLED: "Application cancelled" };

export function HoldStatusLabel({ status }: { status: HoldStatus }) {
  return <span className={`${styles.status} ${styles[status.toLowerCase()]}`}>{labels[status]}</span>;
}
