"use client";

import { useState } from "react";
import Button from "react-bootstrap/Button";
import type { StudentHold } from "@/shared/types/holds";
import { ApplicationHistoryRow } from "./ApplicationHistoryRow";
import { HistoryFilters } from "./HistoryFilters";
import { emptyHistoryFilters, filterHistory } from "./historyFilterValues";
import styles from "./HistoryRegister.module.scss";

export function HistoryRegister({ holds }: { holds: StudentHold[] }) {
  const [filters, setFilters] = useState(emptyHistoryFilters);
  const filtered = filterHistory(holds, filters);

  return (
    <>
      <HistoryFilters holds={holds} value={filters} onChange={setFilters} />
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
