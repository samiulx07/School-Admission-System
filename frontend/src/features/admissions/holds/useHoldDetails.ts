"use client";

import { useQuery } from "@tanstack/react-query";
import { getClassForHold, getHold, holdQueryKeys } from "@/services/holds";
import { useApiClient } from "@/shared/hooks/useApiClient";

export function useHoldDetails(holdId: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: holdQueryKeys.detail(holdId),
    queryFn: ({ signal }) => getHold(client, holdId, signal),
    refetchInterval: 3_000,
    retry: false,
  });
}

export function useHoldClass(classId?: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: ["classes", classId],
    queryFn: ({ signal }) => getClassForHold(client, classId!, signal),
    enabled: classId !== undefined,
    retry: false,
  });
}
