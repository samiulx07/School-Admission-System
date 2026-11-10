"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "react-bootstrap/Button";
import { BsArrowRight } from "react-icons/bs";
import { useStudentIdentity } from "@/shared/hooks/useStudentIdentity";
import { holdErrorMessage } from "./holdErrors";
import { useReserveSeat } from "./useReserveSeat";
import styles from "./ReserveSeatButton.module.scss";

export function ReserveSeatButton({ classId, availableSeats }: { classId: string; availableSeats: number }) {
  const identity = useStudentIdentity();
  const router = useRouter();
  const reservation = useReserveSeat(classId);

  if (!identity.isReady || identity.isChanging) return <Button disabled className={styles.button}>Checking student number</Button>;
  if (!identity.studentId || !identity.requestSignal) {
    return <Link href="/student" className={`btn btn-primary ${styles.button}`}>Set student number <BsArrowRight aria-hidden="true" /></Link>;
  }
  const studentId = identity.studentId;
  const identitySignal = identity.requestSignal;
  const isCurrentRequest = reservation.variables?.identitySignal === identitySignal;
  const isPending = reservation.isPending && isCurrentRequest;

  return (
    <div className={styles.action}>
      <Button className={styles.button} disabled={availableSeats <= 0 || isPending} onClick={() => reservation.mutate({ studentId, identitySignal }, {
        onSuccess: snapshot => {
          // Changing identity aborts this captured scope before any late callback runs.
          if (!identitySignal.aborted) router.push(`/applications/${encodeURIComponent(snapshot.hold.holdId)}`);
        },
      })}>
        {isPending ? "Reserving your place" : availableSeats <= 0 ? "Class is full" : "Reserve a place"}<BsArrowRight aria-hidden="true" />
      </Button>
      {reservation.isError && isCurrentRequest && !identitySignal.aborted && <p className={styles.error} role="alert">{holdErrorMessage(reservation.error, "reserve")}</p>}
    </div>
  );
}
