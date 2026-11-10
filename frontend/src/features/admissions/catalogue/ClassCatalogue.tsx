"use client";

import Link from "next/link";
import Button from "react-bootstrap/Button";
import { BsArrowClockwise, BsExclamationCircle, BsJournal } from "react-icons/bs";
import { FilteredClassRegister } from "./FilteredClassRegister";
import { useClasses } from "./useClasses";
import styles from "./ClassCatalogue.module.scss";

export function ClassCatalogue() {
  const classes = useClasses();
  const data = classes.data;
  const isInitialLoad = classes.isPending;
  const isStale = classes.isError && data !== undefined;
  const updatedAt = classes.dataUpdatedAt > 0
    ? new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(classes.dataUpdatedAt)
    : null;

  return (
    <section className={styles.catalogue} aria-labelledby="class-register-heading">
      <div className={styles.heading}>
        <h2 id="class-register-heading">Class register{data && <span>{data.length} {data.length === 1 ? "class" : "classes"}</span>}</h2>
        <p className={styles.freshness}>
          <span className={isStale ? styles.staleDot : styles.liveDot} aria-hidden="true" />
          {isStale ? "Showing the last available counts" : updatedAt ? `Updated ${updatedAt}` : "Live seat availability"}
        </p>
      </div>

      {isInitialLoad && (
        <div className={styles.state} role="status">
          <BsJournal aria-hidden="true" />
          <h3>{classes.fetchStatus === "paused" ? "Waiting for a connection" : "Opening the class register"}</h3>
          <p>{classes.fetchStatus === "paused" ? "Seat availability will load when your connection returns." : "Checking the latest seat availability."}</p>
        </div>
      )}

      {classes.isError && (
        <div className={`${styles.error} ${data === undefined ? styles.initialError : ""}`} role="alert">
          <BsExclamationCircle aria-hidden="true" />
          <div>
            <h3>{data === undefined ? "The class register could not load" : "Seat availability could not refresh"}</h3>
            <p>{data === undefined ? "Please try again to check which classes have places." : "These are the last counts we received. Try again for current availability."}</p>
          </div>
          <Button variant="primary" onClick={() => void classes.refetch()} disabled={classes.isFetching}>
            <BsArrowClockwise aria-hidden="true" />{classes.isFetching ? "Retrying" : "Try again"}
          </Button>
        </div>
      )}

      {data?.length === 0 && (
        <div className={styles.state}>
          <BsJournal aria-hidden="true" />
          <h3>No classes on the register yet</h3>
          <p>Create a class to open the first places for applications.</p>
          <Link href="/admin/classes/new" className="btn btn-primary">Create a class</Link>
        </div>
      )}

      {data && data.length > 0 && (
        <>
          <FilteredClassRegister classes={data} />
          <div className={styles.legend} aria-label="Capacity band key">
            <span><i className={styles.confirmed} aria-hidden="true" />Confirmed</span>
            <span><i className={styles.held} aria-hidden="true" />Held</span>
            <span><i className={styles.available} aria-hidden="true" />Available</span>
          </div>
        </>
      )}
      <p className={styles.pollingNote}>Seat counts refresh every 3 seconds while this page is active. Availability can change as students apply.</p>
    </section>
  );
}
