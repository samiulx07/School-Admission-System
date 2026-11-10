"use client";

import { useContext } from "react";
import { StudentIdentityContext } from "@/shared/contexts/StudentIdentityContext";

export function useStudentIdentity() {
  const context = useContext(StudentIdentityContext);
  if (context === null) throw new Error("useStudentIdentity must be used inside StudentIdentityProvider.");
  return context;
}
