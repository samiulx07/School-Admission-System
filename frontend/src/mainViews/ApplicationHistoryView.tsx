import { ApplicationHistory } from "@/features/admissions/history/ApplicationHistory";
import styles from "./ApplicationHistoryView.module.scss";

export function ApplicationHistoryView() {
  return (
    <div className={styles.page}>
      <header className={styles.introduction}>
        <h1>Your application<br />register.</h1>
        <p>Come back to your holds, review a decision and keep track of your confirmed places.</p>
      </header>
      <ApplicationHistory />
    </div>
  );
}
