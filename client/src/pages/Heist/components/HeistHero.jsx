import React from "react";
import styles from "../Heist.module.css";

export default function HeistHero({ totalOpen = 0, totalLive = 0, onRefresh }) {
  return (
    <div className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />

      <div className={styles.heroTop}>
        <div>
          <div className={styles.kicker}>THE HEIST</div>
          <div className={styles.heroTitle}>Compete. Solve. Escape.</div>
          <div className={styles.heroSub}>
            Pay entry, wait for the room to fill, then race for the fastest correct solve.
          </div>
        </div>

        <button type="button" className={styles.ghostBtn} onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Open Heists</div>
          <div className={styles.statVal}>{totalOpen}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Live Now</div>
          <div className={styles.statVal}>{totalLive}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Win Condition</div>
          <div className={styles.statValSmall}>Fastest Correct</div>
        </div>
      </div>
    </div>
  );
}