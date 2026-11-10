"use client";

import { useEffect, useState } from "react";
import type { HoldStatus, TimedHold } from "@/shared/types/holds";

export function useHoldCountdown(snapshot?: TimedHold) {
  const [now, setNow] = useState(0);
  const isHeld = snapshot?.hold.status === "HELD";

  useEffect(() => {
    if (!isHeld) return;
    const timer = window.setInterval(() => setNow(performance.now()), 200);
    return () => window.clearInterval(timer);
  }, [isHeld]);

  const remainingMs = snapshot && isHeld
    ? Math.max(0, Math.min(snapshot.remainingAtReceipt, snapshot.deadlineAt - now))
    : 0;
  const status: HoldStatus | undefined = snapshot?.hold.status === "HELD" && remainingMs <= 0 ? "EXPIRED" : snapshot?.hold.status;
  const seconds = Math.ceil(remainingMs / 1_000);
  const minutesPart = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secondsPart = String(seconds % 60).padStart(2, "0");

  return { status, remainingMs, countdown: `${minutesPart}:${secondsPart}` };
}
