import type { QueryClient } from "@tanstack/react-query";

// Every owned query and mutation includes its student ID. Public classes use a different root.
export const studentQueryKey = (studentId: string, ...parts: readonly unknown[]) => ["student", studentId, ...parts] as const;

export async function clearStudentQueries(queryClient: QueryClient): Promise<void> {
  await queryClient.cancelQueries({ queryKey: ["student"] });
  queryClient.removeQueries({ queryKey: ["student"] });
  const mutationCache = queryClient.getMutationCache();
  mutationCache.findAll({ predicate: (mutation) => mutation.options.mutationKey?.[0] === "student" })
    .forEach((mutation) => mutationCache.remove(mutation));
}
