"use client";

import Button from "react-bootstrap/Button";
import { BsCheck2, BsX } from "react-icons/bs";
import type { HoldStatus } from "@/shared/types/holds";
import { useStudentIdentity } from "@/shared/hooks/useStudentIdentity";
import { useHoldActions } from "../useHoldActions";
import styles from "./HoldActions.module.scss";

type HoldActionsProps = {
  holdId: string;
  status: HoldStatus;
  owned: boolean;
  expired: boolean;
  isOwnershipLoading?: boolean;
};

export function HoldActions({ holdId, status, owned, expired, isOwnershipLoading = false }: HoldActionsProps) {
  const identity = useStudentIdentity();
  const canAct = identity.isReady && !identity.isChanging && Boolean(identity.studentId) && owned && !isOwnershipLoading && status === "HELD" && !expired;
  const { runAction, isPending, feedback } = useHoldActions(holdId, canAct);
  const disabled = !canAct || isPending || feedback?.kind === "success";

  return (
    <div className={styles.root} aria-busy={isPending}>
      <div className={styles.actions}>
        <Button type="button" disabled={disabled} onClick={() => void runAction("confirm")}><BsCheck2 aria-hidden="true" />Pay fee &amp; confirm</Button>
        <Button type="button" variant="outline-secondary" className={styles.cancel} disabled={disabled} onClick={() => void runAction("cancel")}><BsX aria-hidden="true" />Cancel hold</Button>
      </div>
      {isOwnershipLoading && identity.studentId ? <p className={styles.note} role="status">Checking which actions are available...</p> : null}
      {isPending ? <p className={styles.note} role="status">Your decision is in progress. Please wait.</p> : null}
      {feedback ? <p className={feedback.kind === "error" ? styles.error : styles.success} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p> : null}
    </div>
  );
}
