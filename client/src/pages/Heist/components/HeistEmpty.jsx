import React from "react";
import styles from "../Heist.module.css";

export default function HeistEmpty({ onRefresh }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyTitle}>No heists available</div>
      <div className={styles.emptySub}>Check back soon or refresh to load new rooms.</div>
      <button type="button" className={styles.primaryBtn} onClick={onRefresh}>
        Refresh
      </button>
    </div>
  );
}