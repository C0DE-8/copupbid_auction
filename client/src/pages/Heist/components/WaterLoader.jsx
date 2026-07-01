import React from "react";
import styles from "./WaterLoader.module.css";

/**
 * Classic circular water loader
 * - size: px (default 180)
 * - label: optional text under it
 */
export default function WaterLoader({ size = 180, label }) {
  return (
    <div className={styles.wrap} style={{ "--size": `${size}px` }}>
      <div className={styles.water} />
      {label ? <div className={styles.label}>{label}</div> : null}
    </div>
  );
}