import { BsArrowRight, BsCheck2, BsClock } from "react-icons/bs";
import Link from "next/link";
import { site } from "@/data/site";
import { AnchorLink } from "@/shared/components/AnchorLink/AnchorLink";
import styles from "./HomeView.module.scss";

export function HomeView() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="home-heading">
        <div className={styles.introduction}>
          <p className={styles.eyebrow}>School admissions, clearly</p>
          <h1 id="home-heading">Find your class.<br />Hold your place.</h1>
          <p className={styles.lead}>See what is available, reserve a place, and confirm your next step before your hold expires.</p>
          <Link className={`btn btn-primary ${styles.primary}`} href="/classes">Explore available classes <BsArrowRight aria-hidden="true" /></Link>
          <p className={styles.helper}><AnchorLink target="how-it-works">How admission works</AnchorLink></p>
          <p className={styles.helper}>One registration number connects your applications.</p>
        </div>
        <aside className={styles.guide} aria-labelledby="guide-heading">
          <div className={styles.guideTop}>
            <span className={styles.status}><BsClock aria-hidden="true" /> A moment to decide</span>
            <h2 id="guide-heading">A hold is your first step. Confirmation makes it yours.</h2>
          </div>
          <dl className={styles.states}>
            <div><dt><span className={styles.openDot} aria-hidden="true" />Open</dt><dd>Available for a new application</dd></div>
            <div><dt><span className={styles.heldDot} aria-hidden="true" />Held</dt><dd>Reserved until its deadline</dd></div>
            <div><dt><span className={styles.confirmedDot} aria-hidden="true" />Confirmed</dt><dd>Admission secured</dd></div>
          </dl>
          <p className={styles.guideNote}><BsCheck2 aria-hidden="true" /> Clear status at every step</p>
        </aside>
      </section>
      <section className={styles.process} id="how-it-works" tabIndex={-1} aria-labelledby="process-heading">
        <div className={styles.processHeading}>
          <h2 id="process-heading">From an open place to your next classroom.</h2>
          <p>Three steps, with a clear decision at the end. Keep your registration number ready when you apply.</p>
        </div>
        <ol className={styles.steps}>
          {site.admissionSteps.map((step, index) => (
            <li key={step.title}>
              <span className={styles.stepNumber} aria-hidden="true">0{index + 1}</span>
              <h3>{step.title}</h3><p>{step.description}</p>
            </li>
          ))}
        </ol>
        <p className={styles.deadlineNote}><BsClock aria-hidden="true" /><span>A hold is temporary. If its deadline passes, the place becomes available again.</span></p>
      </section>
    </>
  );
}
