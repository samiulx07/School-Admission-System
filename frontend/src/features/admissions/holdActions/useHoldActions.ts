"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelHold, confirmHold, holdActionError, type HoldAction } from "@/services/holdActions";
import { useApiClient } from "@/shared/hooks/useApiClient";
import { useStudentIdentity } from "@/shared/hooks/useStudentIdentity";
import { studentQueryKey } from "@/features/admissions/identity/studentQueries";
import styles from "./HoldActions.module.scss";

type ActionVariables = { action: HoldAction; holdId: string; studentId: string; identitySignal: AbortSignal };
type ActionFeedback = ActionVariables & { kind: "success" | "error"; message: string };

export function useHoldActions(holdId: string, canAct: boolean) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { studentId, requestSignal } = useStudentIdentity();
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [dialogScope, setDialogScope] = useState<{ token: symbol; holdId: string; signal: AbortSignal } | null>(null);
  const eligibility = useRef(canAct);
  const operation = useRef<{ token: symbol; holdId: string; signal: AbortSignal } | null>(null);
  const closeDialog = useRef<{ token: symbol; close: () => void } | null>(null);

  useEffect(() => {
    eligibility.current = canAct;
    if (!canAct) closeDialog.current?.close();
    return () => {
      eligibility.current = false;
      operation.current = null;
      closeDialog.current?.close();
    };
  }, [canAct, holdId, requestSignal]);

  const mutation = useMutation<void, unknown, ActionVariables>({
    mutationKey: studentQueryKey(studentId ?? "", "hold-action", holdId),
    mutationFn: async (variables) => {
      if (variables.action === "confirm") await confirmHold(client, variables.holdId, variables.studentId, variables.identitySignal);
      else await cancelHold(client, variables.holdId, variables.studentId, variables.identitySignal);
    },
    onSuccess: (_result, variables) => {
      if (variables.identitySignal.aborted) return;
      setFeedback({ ...variables, kind: "success", message: variables.action === "confirm" ? "Admission confirmed. Your place is secured." : "Hold cancelled. The place is available again." });
    },
    onError: (error, variables) => {
      if (!variables.identitySignal.aborted) setFeedback({ ...variables, kind: "error", message: holdActionError(error, variables.action) });
    },
    onSettled: async (_result, _error, variables) => {
      // The server may have committed even if a connection was interrupted.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["holds", variables.holdId] }),
        queryClient.invalidateQueries({ queryKey: ["classes"] }),
        ...(variables.identitySignal.aborted ? [] : [queryClient.invalidateQueries({ queryKey: studentQueryKey(variables.studentId, "holds") })]),
      ]);
    },
  });

  const visibleFeedback = feedback && feedback.identitySignal === requestSignal && feedback.holdId === holdId ? feedback : null;
  const isPending = (mutation.isPending && mutation.variables?.identitySignal === requestSignal && mutation.variables.holdId === holdId)
    || (dialogScope?.signal === requestSignal && dialogScope?.holdId === holdId);

  const runAction = async (action: HoldAction) => {
    if (!canAct || !studentId || !requestSignal || requestSignal.aborted || visibleFeedback?.kind === "success") return;
    if (operation.current?.signal === requestSignal && operation.current.holdId === holdId) return;
    const token = Symbol("hold-action");
    const scope = { token, holdId, signal: requestSignal };
    operation.current = scope;
    setDialogScope(scope);
    setFeedback(null);
    let startedMutation = false;
    try {
      const { default: Swal } = await import("sweetalert2");
      if (requestSignal.aborted || !eligibility.current || operation.current?.token !== token) return;
      const close = () => Swal.close();
      closeDialog.current = { token, close };
      requestSignal.addEventListener("abort", close, { once: true });
      let accepted = false;
      try {
        const result = await Swal.fire({
          title: action === "confirm" ? "Confirm admission?" : "Cancel this hold?",
          text: action === "confirm"
            ? "Secure your place with a final confirmation. This demo does not collect a payment."
            : "Release this reserved place. You can apply again if a place is available.",
          confirmButtonText: action === "confirm" ? "Confirm admission" : "Cancel hold",
          cancelButtonText: action === "confirm" ? "Keep reviewing" : "Keep hold",
          showCancelButton: true,
          focusCancel: true,
          returnFocus: true,
          reverseButtons: true,
          buttonsStyling: false,
          animation: false,
          customClass: {
            popup: styles.dialog,
            title: styles.dialogTitle,
            htmlContainer: styles.dialogText,
            actions: styles.dialogActions,
            confirmButton: "btn btn-primary",
            cancelButton: `btn ${styles.dialogCancel}`,
          },
        });
        accepted = result.isConfirmed;
      } finally {
        requestSignal.removeEventListener("abort", close);
        if (closeDialog.current?.token === token) closeDialog.current = null;
      }
      if (!accepted || requestSignal.aborted || !eligibility.current || operation.current?.token !== token) return;
      startedMutation = true;
      await mutation.mutateAsync({ action, holdId, studentId, identitySignal: requestSignal });
    } catch {
      // Mutation failures have a specific message in onError. Chunk failures need a retry path too.
      if (!startedMutation && !requestSignal.aborted) setFeedback({ action, holdId, studentId, identitySignal: requestSignal, kind: "error", message: "We could not open the decision dialog. Please try again." });
    } finally {
      if (operation.current?.token === token) {
        operation.current = null;
      }
      setDialogScope((previous) => previous?.token === token ? null : previous);
    }
  };

  return { runAction, isPending, feedback: visibleFeedback };
}
