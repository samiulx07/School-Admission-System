import type { AxiosInstance } from "axios";
import { z } from "zod";
import type { ClassSummary } from "@/shared/types/classes";
import type { HoldDetails, ReservedHold, StudentHold, TimedHold } from "@/shared/types/holds";

export const holdQueryKeys = {
  all: ["holds"] as const,
  detail: (holdId: string) => ["holds", holdId] as const,
};

const timestampSchema = z.iso.datetime({ offset: true }).refine(value => Number.isFinite(Date.parse(value)), "Invalid application timestamp.");
const holdSchema = z.object({
  holdId: z.uuid(),
  classId: z.uuid(),
  status: z.enum(["HELD", "CONFIRMED", "EXPIRED", "CANCELLED"]),
  expiresAt: timestampSchema,
  createdAt: timestampSchema,
  serverNow: timestampSchema,
});

export function timeHold(hold: HoldDetails, requestStartedAt: number): TimedHold {
  const publicHold = holdSchema.parse(hold);
  const receivedAt = performance.now();
  // Starting at request dispatch conservatively accounts for the full round trip.
  const deadlineAt = requestStartedAt + Math.max(0, Date.parse(publicHold.expiresAt) - Date.parse(publicHold.serverNow));
  // The schema strips studentId from reservation responses before public caching.
  return { hold: publicHold, requestStartedAt, receivedAt, deadlineAt, remainingAtReceipt: Math.max(0, deadlineAt - receivedAt) };
}

export async function getHold(client: AxiosInstance, holdId: string, signal?: AbortSignal): Promise<TimedHold> {
  const requestStartedAt = performance.now();
  const response = await client.get<HoldDetails>(`/holds/${encodeURIComponent(holdId)}`, { signal });
  const data = holdSchema.parse(response.data);
  if (data.holdId !== holdId) throw new Error("The application response does not match this request.");
  return timeHold(data, requestStartedAt);
}

export async function reserveSeat(client: AxiosInstance, classId: string, studentId: string, signal?: AbortSignal): Promise<TimedHold> {
  const requestStartedAt = performance.now();
  const response = await client.post<ReservedHold>(`/classes/${encodeURIComponent(classId)}/holds`, undefined, {
    headers: { "X-Student-Id": studentId }, signal,
  });
  const data = holdSchema.extend({ studentId: z.string().regex(/^[0-9]{17}$/) }).parse(response.data);
  if (data.studentId !== studentId || data.classId !== classId) throw new Error("The reservation response does not match this request.");
  return timeHold(data, requestStartedAt);
}

export async function getStudentHolds(client: AxiosInstance, studentId: string, signal?: AbortSignal): Promise<StudentHold[]> {
  const response = await client.get<StudentHold[]>("/me/holds", { headers: { "X-Student-Id": studentId }, signal });
  return z.array(holdSchema.extend({ className: z.string().min(1) })).parse(response.data);
}

export async function getClassForHold(client: AxiosInstance, classId: string, signal?: AbortSignal): Promise<ClassSummary> {
  const response = await client.get<ClassSummary>(`/classes/${encodeURIComponent(classId)}`, { signal });
  return response.data;
}
