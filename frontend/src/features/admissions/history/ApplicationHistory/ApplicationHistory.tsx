"use client";

import Link from "next/link";
import Button from "react-bootstrap/Button";
import { BsArrowClockwise, BsArrowRight, BsExclamationCircle, BsJournal } from "react-icons/bs";
import { useStudentIdentity } from "@/shared/hooks/useStudentIdentity";
import { useStudentHolds } from "@/features/admissions/holds/useStudentHolds";
import { HistoryRegister } from "../HistoryRegister/HistoryRegister";
import styles from "./ApplicationHistory.module.scss";

export function ApplicationHistory() {
  const identity = useStudentIdentity();
  const applications = useStudentHolds();
  const holds = applications.data;

  if (!identity.isReady || identity.isChanging) {
    return <div className={styles.state} role="status"><p>Checking your registration number...</p></div>;
  }

  if (!identity.studentId) {
    return (
      <div className={styles.state}>
        <BsJournal aria-hidden="true" />
        <h2>Connect your applications</h2>
        <p>Set your 17-digit student registration number to see your holds and admissions.</p>
        <Link href="/student" className="btn btn-primary">Set student number <BsArrowRight aria-hidden="true" /></Link>
      </div>
    );
  }

  return (
    <section aria-labelledby="application-register-heading">
      <div className={styles.identity}>
        <div><span>Student registration number</span><strong>{identity.studentId}</strong></div>
        <Link href="/student">Change number</Link>
      </div>
      <div className={styles.heading}>
        <h2 id="application-register-heading">Your applications{holds ? <span>{holds.length}</span> : null}</h2>
        <p>Refreshes every 3 seconds</p>
      </div>
      {applications.isPending ? (
        <div className={styles.state} role="status"><BsJournal aria-hidden="true" /><h3>{applications.fetchStatus === "paused" ? "Waiting for a connection" : "Opening your applications"}</h3><p>Your latest application records will appear here.</p></div>
      ) : null}
      {applications.isError ? (
        <div className={styles.error} role="alert">
          <BsExclamationCircle aria-hidden="true" />
          <div><h3>{holds ? "Your applications could not refresh" : "Your applications could not load"}</h3><p>{holds ? "Showing the last records received. Refresh before making a decision." : "Please try again to check your holds and admissions."}</p></div>
          <Button onClick={() => void applications.refetch()} disabled={applications.isFetching}><BsArrowClockwise aria-hidden="true" />{applications.isFetching ? "Retrying" : "Try again"}</Button>
        </div>
      ) : null}
      {holds?.length === 0 ? (
        <div className={styles.state}><BsJournal aria-hidden="true" /><h3>No applications yet</h3><p>Find a class with an open place to start your first application.</p><Link href="/classes" className="btn btn-primary">Browse classes <BsArrowRight aria-hidden="true" /></Link></div>
      ) : holds ? <HistoryRegister key={identity.studentId} holds={holds} /> : null}
      <p className={styles.note}>Expired or cancelled holds stay in your history. You can apply again when a class has space.</p>
    </section>
  );
}
