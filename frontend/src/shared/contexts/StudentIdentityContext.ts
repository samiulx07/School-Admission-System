import { createContext } from "react";
import type { IdentityStorageStatus } from "@/features/admissions/identity/studentIdentity";

export type StudentIdentityValue = {
  studentId: string | null;
  isReady: boolean;
  isChanging: boolean;
  storageStatus: IdentityStorageStatus;
  requestSignal: AbortSignal | undefined;
  changeStudentId: (studentId: string) => Promise<void>;
  clearStudentId: () => Promise<void>;
};

export const StudentIdentityContext = createContext<StudentIdentityValue | null>(null);
