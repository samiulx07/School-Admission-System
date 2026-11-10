"use client";

import { useQuery } from "@tanstack/react-query";
import { studentQueryKey } from "@/features/admissions/identity/studentQueries";
import { getStudentHolds } from "@/services/holds";
import { useApiClient } from "@/shared/hooks/useApiClient";
import { useStudentIdentity } from "@/shared/hooks/useStudentIdentity";

export function useStudentHolds() {
  const client = useApiClient();
  const { studentId, isReady, isChanging, requestSignal } = useStudentIdentity();
  return useQuery({
    queryKey: studentQueryKey(studentId ?? "", "holds"),
    queryFn: ({ signal }) => getStudentHolds(client, studentId!, requestSignal ? AbortSignal.any([signal, requestSignal]) : signal),
    enabled: isReady && !isChanging && studentId !== null && requestSignal !== undefined,
    refetchInterval: 3_000,
    retry: false,
  });
}
