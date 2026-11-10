import Link from "next/link";
import { BsArrowLeft } from "react-icons/bs";
import { StudentIdentityForm } from "@/features/admissions/identity/StudentIdentityForm";
import styles from "./StudentView.module.scss";

export function StudentView() {
  return (
    <section className={styles.view} aria-labelledby="student-heading">
      <div className={styles.introduction}>
        <Link className={styles.back} href="/"><BsArrowLeft aria-hidden="true" /> Back to home</Link>
        <h1 id="student-heading">Your number.<br />Your next step.</h1>
        <p className={styles.lead}>Keep your applications connected with one student registration number.</p>
        <p className={styles.note}>The number is remembered in this browser when storage is available. You can change or clear it at any time.</p>
      </div>
      <StudentIdentityForm />
    </section>
  );
}
