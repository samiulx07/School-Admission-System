import { ClassCatalogue } from "@/features/admissions/catalogue/ClassCatalogue";
import styles from "./ClassesView.module.scss";

export function ClassesView() {
  return (
    <div className={styles.page}>
      <header className={styles.introduction}>
        <h1>Find your<br />open place.</h1>
        <div className={styles.description}>
          <p>Choose a class with room for your next step.</p>
          <p>Every place is accounted for: confirmed, held for a decision, or available for a new application.</p>
        </div>
      </header>
      <ClassCatalogue />
    </div>
  );
}
