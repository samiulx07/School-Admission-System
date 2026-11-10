"use client";

import Link from "next/link";
import Button from "react-bootstrap/Button";
import { BsArrowLeft, BsArrowClockwise, BsClock } from "react-icons/bs";
import { HoldStatusLabel } from "@/features/admissions/holds/HoldStatusLabel/HoldStatusLabel";
import { HoldActions } from "@/features/admissions/holdActions/HoldActions/HoldActions";
import { holdErrorMessage } from "@/features/admissions/holds/holdErrors";
import { useHoldCountdown } from "@/features/admissions/holds/useHoldCountdown";
import { useHoldClass, useHoldDetails } from "@/features/admissions/holds/useHoldDetails";
import { useStudentHolds } from "@/features/admissions/holds/useStudentHolds";
import { useStudentIdentity } from "@/shared/hooks/useStudentIdentity";
import { LocalDateTime } from "@/shared/components/LocalDateTime/LocalDateTime";
import type { HoldDetails } from "@/shared/types/holds";
import type { ClassSummary } from "@/shared/types/classes";
import styles from "./ApplicationDetailView.module.scss";

export function ApplicationDetailView({ holdId, initialHold, initialClass }: { holdId: string; initialHold?: HoldDetails; initialClass?: ClassSummary }) {
  const application = useHoldDetails(holdId, initialHold);
  const admissionClass = useHoldClass(application.data?.hold.classId, initialClass);
  const studentHolds = useStudentHolds();
  const identity = useStudentIdentity();
  const { status, countdown } = useHoldCountdown(application.data);
  const hold = application.data?.hold;
  const owned = studentHolds.data?.some(record => record.holdId === holdId) ?? false;

  return (
    <div className={styles.page}>
      <Link href="/classes" className={styles.back}><BsArrowLeft aria-hidden="true" />Back to classes</Link>
      {application.isPending && (
        <div className={styles.state} role="status"><h1>Opening your application</h1><p>Checking its current status and deadline.</p></div>
      )}
      {application.isError && (
        <div className={styles.error} role="alert">
          {hold ? <h2>Application details could not refresh</h2> : <h1>Application details could not load</h1>}
          <p>{holdErrorMessage(application.error)}</p>
          <Button onClick={() => void application.refetch()} disabled={application.isFetching}><BsArrowClockwise aria-hidden="true" />Try again</Button>
        </div>
      )}
      {hold && status && (
        <>
          <header className={styles.heading}>
            <div>
              <HoldStatusLabel status={status} />
              <h1>{admissionClass.data?.name ?? "Your class application"}</h1>
              <p>{status === "HELD" ? "Your place is held until the deadline below." : status === "CONFIRMED" ? "Your admission is confirmed. This place is yours." : status === "EXPIRED" ? "The decision deadline has passed. You can check the register for another available place." : "This application has been cancelled. Its place is available for another student."}</p>
            </div>
          </header>
          <div className={styles.workspace}>
            <section className={styles.record} aria-labelledby="application-record-heading">
              <h2 id="application-record-heading">Application record</h2>
              <dl>
                <div><dt>Application number</dt><dd className={styles.identifier}>{hold.holdId}</dd></div>
                <div><dt>Created</dt><dd><LocalDateTime value={hold.createdAt} /></dd></div>
                <div><dt>Hold deadline</dt><dd><LocalDateTime value={hold.expiresAt} /></dd></div>
              </dl>
              {admissionClass.isError && <p className={styles.note}>The class name could not load. Your application status is shown above.</p>}
              <div className={styles.identity}>
                {!identity.isReady || identity.isChanging ? <p role="status">Checking your student number.</p> : !identity.studentId ? (
                  <p><Link href="/student">Set your student number</Link> to check whether this is your application.</p>
                ) : studentHolds.isPending ? <p role="status">Checking this application against your student number.</p> : studentHolds.isError ? (
                  <div><p>Your application ownership could not be checked.</p><Button variant="primary" onClick={() => void studentHolds.refetch()} disabled={studentHolds.isFetching}>Check again</Button></div>
                ) : owned ? <p>This application belongs to your current student number.</p> : <p>This application belongs to a different student number. <Link href="/student">Change student number</Link> if needed.</p>}
              </div>
            </section>
            <aside className={styles.decision} aria-labelledby="decision-heading">
              <span className={styles.clockLabel}><BsClock aria-hidden="true" />{status === "HELD" ? "Time to decide" : "Application status"}</span>
              <h2 id="decision-heading">{status === "HELD" ? "Your place is waiting." : status === "CONFIRMED" ? "A place secured." : status === "EXPIRED" ? "This hold has ended." : "This application is closed."}</h2>
              {(status === "HELD" || status === "EXPIRED") && <p className={styles.countdown} aria-label={`Time remaining ${countdown}`}>{countdown}</p>}
              <p className={styles.decisionNote}>{status === "HELD" ? "Confirm before the timer ends." : status === "CONFIRMED" ? "Confirmed admissions are final." : "Return to the class register to see the latest availability."}</p>
              <HoldActions holdId={holdId} status={status} owned={owned} expired={status === "EXPIRED"} isOwnershipLoading={!identity.isReady || identity.isChanging || Boolean(identity.studentId && studentHolds.isPending) || Boolean(application.data?.serverBootstrap)} />
              <p className={styles.paymentNote}>Demo fee payment. No money is collected.</p>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
