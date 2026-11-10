import { z } from "zod";

export const STUDENT_STORAGE_KEY = "seatwise.student.v1";
export const studentIdSchema = z.string().regex(/^[0-9]{17}$/, "Enter exactly 17 digits (0-9).");
export const studentIdentitySchema = z.object({ studentId: studentIdSchema });

export type StudentIdentityFields = z.infer<typeof studentIdentitySchema>;
export type IdentityStorageStatus = "available" | "unavailable" | "invalid";

export function parseStoredStudent(value: string | null): { studentId: string | null; storageStatus: IdentityStorageStatus } {
  if (value === null) return { studentId: null, storageStatus: "available" };
  try {
    const parsed = z.object({ version: z.literal(1), studentId: studentIdSchema }).strict().safeParse(JSON.parse(value));
    if (parsed.success) return { studentId: parsed.data.studentId, storageStatus: "available" };
  } catch {
    // Malformed or obsolete browser data must never become a request identity.
  }
  return { studentId: null, storageStatus: "invalid" };
}

export function readStoredStudent(): ReturnType<typeof parseStoredStudent> {
  try {
    const result = parseStoredStudent(window.localStorage.getItem(STUDENT_STORAGE_KEY));
    if (result.storageStatus === "invalid") window.localStorage.removeItem(STUDENT_STORAGE_KEY);
    return result;
  } catch {
    return { studentId: null, storageStatus: "unavailable" };
  }
}

export function persistStudent(studentId: string | null): IdentityStorageStatus {
  try {
    if (studentId === null) window.localStorage.removeItem(STUDENT_STORAGE_KEY);
    else window.localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify({ version: 1, studentId }));
    return "available";
  } catch {
    return "unavailable";
  }
}
