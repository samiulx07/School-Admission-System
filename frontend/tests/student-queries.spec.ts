import { QueryClient } from "@tanstack/react-query";
import { expect, test } from "@playwright/test";
import { clearStudentQueries, studentQueryKey } from "../src/features/admissions/identity/studentQueries";

test("identity changes abort owned queries and remove owned query/mutation caches while retaining public classes", async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const oldStudent = "00123456789012345";
  const newStudent = "00987654321098765";
  const publicKey = ["classes"] as const;
  queryClient.setQueryData(publicKey, [{ id: "class-a" }]);
  queryClient.setQueryData(studentQueryKey(oldStudent, "history"), [{ id: "owned-hold" }]);
  queryClient.setQueryData(studentQueryKey(newStudent, "history"), [{ id: "previous-session" }]);
  const privateMutation = queryClient.getMutationCache().build(queryClient, { mutationKey: studentQueryKey(oldStudent, "confirm"), mutationFn: async () => ({ id: "private-result" }) });
  await privateMutation.execute(undefined);
  const publicMutation = queryClient.getMutationCache().build(queryClient, { mutationKey: ["classes", "create"], mutationFn: async () => ({ id: "public-result" }) });
  await publicMutation.execute(undefined);
  let signal: AbortSignal | undefined;
  const pendingRequest = queryClient.fetchQuery({
    queryKey: studentQueryKey(oldStudent, "detail", "pending-hold"),
    queryFn: ({ signal: requestSignal }) => {
      signal = requestSignal;
      return new Promise((_resolve, reject) => requestSignal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true }));
    },
  }).catch((error: unknown) => error);
  expect(signal?.aborted).toBe(false);
  await clearStudentQueries(queryClient);
  await pendingRequest;
  expect(signal?.aborted).toBe(true);
  expect(queryClient.getQueryCache().findAll({ queryKey: ["student"] })).toHaveLength(0);
  expect(queryClient.getMutationCache().getAll()).toEqual([publicMutation]);
  expect(queryClient.getQueryData(publicKey)).toEqual([{ id: "class-a" }]);
  expect(queryClient.getQueryData(studentQueryKey(newStudent, "history"))).toBeUndefined();
  queryClient.clear();
});

test("each student owns a distinct query key without coercing leading zeros", () => {
  expect(studentQueryKey("00123456789012345", "history")).toEqual(["student", "00123456789012345", "history"]);
  expect(studentQueryKey("00123456789012345", "history")).not.toEqual(studentQueryKey("10123456789012345", "history"));
});
