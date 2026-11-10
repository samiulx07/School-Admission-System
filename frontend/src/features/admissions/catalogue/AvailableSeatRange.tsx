"use client";

import { useId } from "react";
import * as Slider from "@radix-ui/react-slider";
import { Tooltip } from "react-tooltip";
import { BsInfoCircle } from "react-icons/bs";
import styles from "./AvailableSeatRange.module.scss";

export function AvailableSeatRange({ maximum, value, onChange }: { maximum: number; value: [number, number]; onChange: (value: number[]) => void }) {
  const id = useId();

  return (
    <fieldset className={styles.range}>
      <legend>
        <span>Available seats</span>
        <button type="button" className={styles.help} aria-label="About the available seat range" data-tooltip-id={`${id}-help`} data-tooltip-content="Choose a minimum and maximum number of open places. The range follows the latest seat counts."><BsInfoCircle aria-hidden="true" /></button>
        <output>{value[0].toLocaleString("en-US")} to {value[1].toLocaleString("en-US")}</output>
      </legend>
      <Slider.Root className={styles.slider} min={0} max={Math.max(1, maximum)} step={1} value={value} onValueChange={onChange} disabled={maximum === 0} minStepsBetweenThumbs={0}>
        <Slider.Track className={styles.track}><Slider.Range className={styles.selected} /></Slider.Track>
        <Slider.Thumb className={styles.thumb} aria-label="Minimum available seats" aria-valuetext={`${value[0]} seats`} />
        <Slider.Thumb className={styles.thumb} aria-label="Maximum available seats" aria-valuetext={`${value[1]} seats`} />
      </Slider.Root>
      <Tooltip id={`${id}-help`} className={styles.tooltip} place="top" globalCloseEvents={{ escape: true, scroll: true, resize: true, clickOutsideAnchor: true }} />
    </fieldset>
  );
}
