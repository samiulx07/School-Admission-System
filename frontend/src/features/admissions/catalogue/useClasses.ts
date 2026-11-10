"use client";

import { useQuery } from "@tanstack/react-query";
import { classQueryKeys, getClasses } from "@/services/classes";
import { useApiClient } from "@/shared/hooks/useApiClient";

export function useClasses() {
  const client = useApiClient();
  return useQuery({
    queryKey: classQueryKeys.all,
    queryFn: ({ signal }) => getClasses(client, signal),
    refetchInterval: 3_000,
    retry: false,
  });
}
