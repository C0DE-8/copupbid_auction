import React from "react";
import styles from "../Heist.module.css";

export default function HeistSkeleton() {
  return (
    <div className={`${styles.card} ${styles.skel}`}>
      <div className={styles.skelLineLg} />
      <div className={styles.skelLineSm} />
      <div className={styles.skelRow}>
        <div className={styles.skelBox} />
        <div className={styles.skelBox} />
      </div>
      <div className={styles.skelLineMd} />
      <div className={styles.skelBtnRow}>
        <div className={styles.skelBtn} />
        <div className={styles.skelBtn} />
      </div>
    </div>
  );
}