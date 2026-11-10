"use client";

import { useId } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { BsSearch } from "react-icons/bs";
import type { ClassSummary } from "@/shared/types/classes";
import { AvailableSeatRange } from "../AvailableSeatRange/AvailableSeatRange";
import { ClassRow } from "../ClassRow/ClassRow";
import { useCatalogueFilters } from "../useCatalogueFilters";
import styles from "./FilteredClassRegister.module.scss";

export function FilteredClassRegister({ classes }: { classes: ClassSummary[] }) {
  const id = useId();
  const filters = useCatalogueFilters(classes);

  return (
    <>
      <div className={styles.filters} role="group" aria-label="Filter classes">
        <Form.Group className={styles.search} controlId={`${id}-search`}>
          <Form.Label>Search classes</Form.Label>
          <div><BsSearch aria-hidden="true" /><Form.Control type="search" value={filters.search} onChange={event => filters.setSearch(event.target.value)} placeholder="Search by class name" autoComplete="off" /></div>
        </Form.Group>
        <AvailableSeatRange maximum={filters.maximum} value={filters.range} onChange={filters.setRange} />
      </div>
      <div className={styles.results}>
        <p role="status" aria-live="polite">{filters.isSearching ? "Updating results..." : `Showing ${filters.filtered.length} of ${classes.length} ${classes.length === 1 ? "class" : "classes"}`}</p>
        {filters.hasFilters ? <Button variant="link" className={styles.clear} onClick={filters.clearFilters}>Clear filters</Button> : null}
      </div>
      {filters.filtered.length > 0 ? (
        <ul className={styles.register} aria-label="Classes and seat availability">{filters.filtered.map(admissionClass => <ClassRow key={admissionClass.id} admissionClass={admissionClass} />)}</ul>
      ) : (
        <div className={styles.empty}>
          <h3>No classes match these filters</h3>
          <p>Try a different name or a wider range of available places.</p>
          <Button onClick={filters.clearFilters}>Show all classes</Button>
        </div>
      )}
    </>
  );
}
