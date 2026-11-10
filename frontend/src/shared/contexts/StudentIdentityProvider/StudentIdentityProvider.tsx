"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { persistStudent, readStoredStudent, STUDENT_STORAGE_KEY, studentIdSchema, type IdentityStorageStatus } from "@/features/admissions/identity/studentIdentity";
import { clearStudentQueries } from "@/features/admissions/identity/studentQueries";
import { StudentIdentityContext } from "../StudentIdentityContext";

type IdentityState = {
  studentId: string | null;
  isReady: boolean;
  isChanging: boolean;
  storageStatus: IdentityStorageStatus;
  requestSignal: AbortSignal | undefined;
};

export function StudentIdentityProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  // The server and first browser render agree. Storage is read only after mounting.
  const [state, setState] = useState<IdentityState>({ studentId: null, isReady: false, isChanging: false, storageStatus: "available", requestSignal: undefined });
  const requestScope = useRef<AbortController | null>(null);
  const revision = useRef(0);

  const applyIdentity = useCallback(async (studentId: string | null, storageStatus?: IdentityStorageStatus) => {
    const nextRevision = ++revision.current;
    requestScope.current?.abort();
    setState((previous) => ({ ...previous, studentId: null, isChanging: true, requestSignal: undefined }));
    await clearStudentQueries(queryClient);
    // A later storage event or user action wins over an earlier pending change.
    if (revision.current !== nextRevision) return;
    const nextStorageStatus = storageStatus ?? persistStudent(studentId);
    requestScope.current = studentId === null ? null : new AbortController();
    setState({ studentId, isReady: true, isChanging: false, storageStatus: nextStorageStatus, requestSignal: requestScope.current?.signal });
  }, [queryClient]);

  useEffect(() => {
    const restoreIdentity = () => {
      const recovered = readStoredStudent();
      void applyIdentity(recovered.studentId, recovered.storageStatus);
    };
    restoreIdentity();
    const syncIdentity = (event: StorageEvent) => {
      if (event.key === STUDENT_STORAGE_KEY || event.key === null) restoreIdentity();
    };
    window.addEventListener("storage", syncIdentity);
    return () => {
      window.removeEventListener("storage", syncIdentity);
      revision.current += 1;
      requestScope.current?.abort();
    };
  }, [applyIdentity]);

  const changeStudentId = useCallback(async (studentId: string) => {
    const parsed = studentIdSchema.safeParse(studentId);
    if (!parsed.success) throw new Error("Enter exactly 17 digits (0-9).");
    await applyIdentity(parsed.data);
  }, [applyIdentity]);
  const clearStudentId = useCallback(() => applyIdentity(null), [applyIdentity]);
  const value = useMemo(() => ({ ...state, changeStudentId, clearStudentId }), [state, changeStudentId, clearStudentId]);

  return <StudentIdentityContext.Provider value={value}>{children}</StudentIdentityContext.Provider>;
}
