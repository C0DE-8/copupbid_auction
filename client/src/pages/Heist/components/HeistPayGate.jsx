import React from "react";
import styles from "./HeistPayGate.module.css";

export default function HeistPayGate({ paying, onPay }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Access Locked</div>
      <div className={styles.sub}>
        You must pay the entry fee to access this heist room.
      </div>

      <div className={styles.steps}>
        <div className={styles.step}><b>1.</b> Pay entry</div>
        <div className={styles.step}><b>2.</b> Wait for room to go LIVE</div>
        <div className={styles.step}><b>3.</b> Solve fast to win</div>
      </div>

      <button className={styles.btn} onClick={onPay} disabled={paying}>
        {paying ? "Processing…" : "Pay Entry Now"}
      </button>
    </div>
  );
}
