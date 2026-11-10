"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { studentQueryKey } from "@/features/admissions/identity/studentQueries";
import { classQueryKeys } from "@/services/classes";
import { holdQueryKeys, reserveSeat } from "@/services/holds";
import { useApiClient } from "@/shared/hooks/useApiClient";
import { useStudentIdentity } from "@/shared/hooks/useStudentIdentity";

export type ReserveSeatRequest = { studentId: string; identitySignal: AbortSignal };

export function useReserveSeat(classId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { studentId } = useStudentIdentity();
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  return useMutation({
    mutationKey: studentQueryKey(studentId ?? "", "reserve", classId),
    mutationFn: (request: ReserveSeatRequest) => {
      pending.current?.abort();
      pending.current = new AbortController();
      return reserveSeat(client, classId, request.studentId, AbortSignal.any([request.identitySignal, pending.current.signal]));
    },
    onSuccess: (snapshot, request) => {
      if (request.identitySignal.aborted) return;
      queryClient.setQueryData(holdQueryKeys.detail(snapshot.hold.holdId), snapshot);
      void queryClient.invalidateQueries({ queryKey: classQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: studentQueryKey(request.studentId, "holds") });
    },
    onError: (_error, request) => {
      if (!request.identitySignal.aborted) void queryClient.invalidateQueries({ queryKey: classQueryKeys.all });
    },
    retry: false,
  });
}
