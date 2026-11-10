"use client";

import { useState } from "react";
import { useDebounce } from "use-debounce";
import type { ClassSummary } from "@/shared/types/classes";

type SeatRange = { minimum: number; maximum: number | null };
const allSeats: SeatRange = { minimum: 0, maximum: null };

export function useCatalogueFilters(classes: ClassSummary[]) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const [selectedRange, setSelectedRange] = useState(allSeats);
  // Capacity keeps the range steady while available counts change during polling.
  const maximum = classes.reduce((largest, admissionClass) => Math.max(largest, admissionClass.totalSeats), 0);
  const minimumValue = Math.min(selectedRange.minimum, maximum);
  const maximumValue = Math.max(minimumValue, Math.min(selectedRange.maximum ?? maximum, maximum));
  const effectiveSearch = (search === "" ? "" : debouncedSearch).trim().toLocaleLowerCase("en");
  const filtered = classes.filter(admissionClass => admissionClass.name.toLocaleLowerCase("en").includes(effectiveSearch)
    && admissionClass.availableSeats >= minimumValue && admissionClass.availableSeats <= maximumValue);

  function setRange(values: number[]) {
    setSelectedRange({ minimum: values[0] ?? 0, maximum: values[1] === maximum ? null : values[1] ?? null });
  }

  function clearFilters() {
    setSearch("");
    setSelectedRange(allSeats);
  }

  return { search, setSearch, range: [minimumValue, maximumValue] as [number, number], setRange, maximum, filtered, clearFilters,
    hasFilters: search.trim() !== "" || selectedRange.minimum !== 0 || selectedRange.maximum !== null,
    isSearching: search !== debouncedSearch };
}
