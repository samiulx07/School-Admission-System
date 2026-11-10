"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/shared/hooks/useApiClient";
import { createClass } from "./createClass";
import { type CreateClassRequest } from "./classCreationSchema";

export function useCreateClass() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateClassRequest) => createClass(client, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classes"] }),
  });
}
