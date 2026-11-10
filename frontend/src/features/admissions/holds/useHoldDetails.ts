"use client";

import { useQuery } from "@tanstack/react-query";
import { getClassForHold, getHold, holdQueryKeys } from "@/services/holds";
import { useApiClient } from "@/shared/hooks/useApiClient";
import type { ClassSummary } from "@/shared/types/classes";
import type { HoldDetails, TimedHold } from "@/shared/types/holds";

export function useHoldDetails(holdId: string, initialHold?: HoldDetails) {
  const client = useApiClient();
  return useQuery({
    queryKey: holdQueryKeys.detail(holdId),
    queryFn: ({ signal }) => getHold(client, holdId, signal),
    refetchInterval: 3_000,
    retry: false,
    initialData: initialHold ? (): TimedHold => ({
      hold: initialHold, serverBootstrap: true, requestStartedAt: 0, receivedAt: 0, deadlineAt: 0,
      remainingAtReceipt: Math.max(0, Date.parse(initialHold.expiresAt) - Date.parse(initialHold.serverNow)),
    }) : undefined,
    initialDataUpdatedAt: initialHold ? 0 : undefined,
  });
}

export function useHoldClass(classId?: string, initialClass?: ClassSummary) {
  const client = useApiClient();
  return useQuery({
    queryKey: ["classes", classId],
    queryFn: ({ signal }) => getClassForHold(client, classId!, signal),
    enabled: classId !== undefined,
    retry: false,
    initialData: initialClass,
    initialDataUpdatedAt: initialClass ? 0 : undefined,
  });
}
