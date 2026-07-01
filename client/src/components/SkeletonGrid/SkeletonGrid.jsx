// src/components/SkeletonGrid/SkeletonGrid.jsx
import React from "react";
import styles from "./SkeletonGrid.module.css";

export default function SkeletonGrid({ count = 9 }) {
  const items = Array.from({ length: count });
  return (
    <section className={styles.grid}>
      {items.map((_, idx) => (
        <article key={idx} className={styles.card}>
          <div className={styles.top}>
            <div className={styles.shimmer} />
          </div>
          <div className={styles.body}>
            <div className={styles.line1} />
            <div className={styles.line2} />
            <div className={styles.row}>
              <div className={styles.box} />
              <div className={styles.box} />
              <div className={styles.box} />
            </div>
            <div className={styles.btnRow}>
              <div className={styles.btn} />
              <div className={styles.btn} />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
