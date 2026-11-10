"use client";

import { useId, useState } from "react";
import dynamic from "next/dynamic";
import Button from "react-bootstrap/Button";
import type { StudentHold } from "@/shared/types/holds";
import { ApplicationHistoryRow } from "./ApplicationHistoryRow";
import { emptyHistoryFilters, filterHistory } from "./historyFilterValues";
import styles from "./HistoryRegister.module.scss";

const HistoryFilters = dynamic(() => import("./HistoryFilters").then(module => module.HistoryFilters), {
  loading: () => <p className={styles.loading} role="status">Loading application filters…</p>,
});

export function HistoryRegister({ holds }: { holds: StudentHold[] }) {
  const filtersId = useId();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(emptyHistoryFilters);
  const filtered = filterHistory(holds, filters);
  const active = filters.status !== "all" || filters.classId !== "all" || filters.from !== null || filters.through !== null;

  return (
    <>
      <div className={styles.tools}>
        <Button type="button" variant="outline-primary" className={styles.toggle} aria-expanded={filtersOpen} aria-controls={filtersId} onClick={() => setFiltersOpen(open => !open)}>
          Filter applications <span aria-hidden="true">{filtersOpen ? "−" : "+"}</span>
        </Button>
        {active ? <span className={styles.active}>Filters active</span> : null}
        {active && !filtersOpen ? <Button type="button" variant="link" className={styles.clear} onClick={() => setFilters(emptyHistoryFilters)}>Clear filters</Button> : null}
      </div>
      <div id={filtersId} hidden={!filtersOpen}>
        {filtersOpen ? <HistoryFilters holds={holds} value={filters} onChange={setFilters} /> : null}
      </div>
      <p className={styles.results} role="status">Showing {filtered.length} of {holds.length} {holds.length === 1 ? "application" : "applications"}</p>
      {filtered.length > 0 ? (
        <ul className={styles.register} aria-label="Your applications">{filtered.map(hold => <ApplicationHistoryRow key={hold.holdId} hold={hold} />)}</ul>
      ) : (
        <div className={styles.empty}>
          <h3>No applications match these filters</h3>
          <p>Change the status, class or dates to see more of your applications.</p>
          <Button variant="primary" onClick={() => setFilters(emptyHistoryFilters)}>Clear filters</Button>
        </div>
      )}
    </>
  );
}
