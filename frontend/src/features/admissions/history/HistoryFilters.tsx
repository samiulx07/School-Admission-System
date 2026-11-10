"use client";

import { useId } from "react";
import Select from "react-select";
import DatePicker from "react-datepicker";
import Button from "react-bootstrap/Button";
import type { HoldStatus, StudentHold } from "@/shared/types/holds";
import { applicationStatusLabels } from "./ApplicationStatus";
import { emptyHistoryFilters, type HistoryFilterValue } from "./historyFilterValues";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./HistoryFilters.module.scss";

type SelectOption = { value: string; label: string };
const statusOptions: SelectOption[] = [
  { value: "all", label: "All statuses" },
  ...Object.entries(applicationStatusLabels).map(([value, label]) => ({ value, label })),
];

export function HistoryFilters({ holds, value, onChange }: { holds: StudentHold[]; value: HistoryFilterValue; onChange: (value: HistoryFilterValue) => void }) {
  const id = useId();
  const classOptions: SelectOption[] = [
    { value: "all", label: "All classes" },
    ...Array.from(new Map(holds.map(hold => [hold.classId, { value: hold.classId, label: hold.className }])).values())
      .sort((first, second) => first.label.localeCompare(second.label)),
  ];
  const active = value.status !== "all" || value.classId !== "all" || value.from !== null || value.through !== null;

  return (
    <div className={styles.filters} role="group" aria-label="Filter applications">
      <div className={styles.selects}>
        <div className={styles.field}>
          <label htmlFor={`${id}-status`}>Application status</label>
          <Select<SelectOption>
            inputId={`${id}-status`}
            instanceId={`${id}-status`}
            classNamePrefix="history-select"
            unstyled
            options={statusOptions}
            value={statusOptions.find(option => option.value === value.status)}
            onChange={option => onChange({ ...value, status: (option?.value ?? "all") as HoldStatus | "all" })}
            isSearchable={false}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-class`}>Class</label>
          <Select<SelectOption>
            inputId={`${id}-class`}
            instanceId={`${id}-class`}
            classNamePrefix="history-select"
            unstyled
            options={classOptions}
            value={classOptions.find(option => option.value === value.classId) ?? classOptions[0]}
            onChange={option => onChange({ ...value, classId: option?.value ?? "all" })}
            noOptionsMessage={() => "No matching classes"}
          />
        </div>
      </div>
      <div className={styles.dates}>
        <div className={styles.field}>
          <label htmlFor={`${id}-from`}>Applied from</label>
          <DatePicker
            id={`${id}-from`}
            selected={value.from}
            onChange={(from: Date | null) => onChange({ ...value, from })}
            selectsStart
            startDate={value.from}
            endDate={value.through}
            maxDate={value.through ?? undefined}
            dateFormat="yyyy-MM-dd"
            placeholderText="YYYY-MM-DD"
            strictParsing
            autoComplete="off"
            ariaDescribedBy={`${id}-date-help`}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-through`}>Applied through</label>
          <DatePicker
            id={`${id}-through`}
            selected={value.through}
            onChange={(through: Date | null) => onChange({ ...value, through })}
            selectsEnd
            startDate={value.from}
            endDate={value.through}
            minDate={value.from ?? undefined}
            dateFormat="yyyy-MM-dd"
            placeholderText="YYYY-MM-DD"
            strictParsing
            autoComplete="off"
            ariaDescribedBy={`${id}-date-help`}
          />
        </div>
      </div>
      <div className={styles.footer}>
        <p id={`${id}-date-help`}>Dates include the whole day in this device&apos;s timezone.</p>
        {active ? <Button type="button" variant="link" className={styles.clear} onClick={() => onChange(emptyHistoryFilters)}>Clear filters</Button> : null}
      </div>
    </div>
  );
}
