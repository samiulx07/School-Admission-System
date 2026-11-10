import type { HoldStatus } from "@/shared/types/holds";
import styles from "./ApplicationStatus.module.scss";

export const applicationStatusLabels: Record<HoldStatus, string> = {
  HELD: "Held",
  CONFIRMED: "Confirmed",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export function ApplicationStatus({ status }: { status: HoldStatus }) {
  return <span className={`${styles.status} ${styles[status.toLowerCase()]}`}>{applicationStatusLabels[status]}</span>;
}
