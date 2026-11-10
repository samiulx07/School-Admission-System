export type HoldStatus = "HELD" | "CONFIRMED" | "EXPIRED" | "CANCELLED";

export type HoldDetails = {
  holdId: string;
  classId: string;
  status: HoldStatus;
  expiresAt: string;
  createdAt: string;
  serverNow: string;
};

export type ReservedHold = HoldDetails & { studentId: string };
export type StudentHold = HoldDetails & { className: string };

// A monotonic deadline stays accurate if the device's wall clock changes.
export type TimedHold = {
  serverBootstrap?: boolean;
  hold: HoldDetails;
  requestStartedAt: number;
  receivedAt: number;
  deadlineAt: number;
  remainingAtReceipt: number;
};
