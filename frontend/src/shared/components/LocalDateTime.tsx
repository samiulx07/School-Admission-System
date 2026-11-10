"use client";

import { useSyncExternalStore } from "react";
import styles from "./LocalDateTime.module.scss";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const localDate = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
const utcDate = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

export function LocalDateTime({ value }: { value: string }) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const date = new Date(value);
  return <time className={styles.value} dateTime={value}>{hydrated ? localDate.format(date) : `${utcDate.format(date)} UTC`}</time>;
}
