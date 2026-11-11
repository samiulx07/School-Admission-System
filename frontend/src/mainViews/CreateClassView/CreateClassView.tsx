import Link from "next/link";
import { BsArrowLeft, BsPeople } from "react-icons/bs";
import { ClassCreationForm } from "@/features/admissions/classCreation/ClassCreationForm/ClassCreationForm";
import styles from "./CreateClassView.module.scss";

export function CreateClassView() {
  return (
    <section className={styles.page} aria-labelledby="create-class-heading">
      <Link href="/classes" className={styles.back}><BsArrowLeft aria-hidden="true" /> Back to classes</Link>
      <div className={styles.layout}>
        <div className={styles.introduction}>
          <h1 id="create-class-heading">Make room for<br />the next class.</h1>
          <p className={styles.lead}>Give your class a clear name and set its capacity. Students can then find it and hold a place.</p>
        </div>
        <div className={styles.form}><ClassCreationForm /></div>
        <div className={styles.capacityNote}>
          <BsPeople aria-hidden="true" />
          <div><h2>Every place is accounted for.</h2><p>The catalogue shows available, held and confirmed places within the capacity you set.</p></div>
        </div>
      </div>
    </section>
  );
}
