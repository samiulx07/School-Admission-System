import dayjs from "dayjs";
import type { HoldStatus, StudentHold } from "@/shared/types/holds";

export type HistoryFilterValue = {
  status: HoldStatus | "all";
  classId: string;
  from: Date | null;
  through: Date | null;
};

export const emptyHistoryFilters: HistoryFilterValue = { status: "all", classId: "all", from: null, through: null };

export function filterHistory(holds: StudentHold[], filters: HistoryFilterValue): StudentHold[] {
  const from = filters.from ? dayjs(filters.from).startOf("day").valueOf() : null;
  const through = filters.through ? dayjs(filters.through).endOf("day").valueOf() : null;

  return holds.filter((hold) => {
    const appliedAt = dayjs(hold.createdAt).valueOf();
    return (filters.status === "all" || hold.status === filters.status)
      && (filters.classId === "all" || hold.classId === filters.classId)
      && (from === null || appliedAt >= from)
      && (through === null || appliedAt <= through);
  }).sort((first, second) => dayjs(second.createdAt).valueOf() - dayjs(first.createdAt).valueOf());
}
