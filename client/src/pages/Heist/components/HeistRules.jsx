import React from "react";
import styles from "../Heist.module.css";

export default function HeistRules() {
  return (
    <div className={styles.rules}>
      <div className={styles.rulesTitle}>How to Win</div>

      <ul className={styles.rulesList}>
        <li>Pay entry to join the room — you can play immediately after joining.</li>
        <li>You get a randomized question based on the room story (same difficulty).</li>
        <li>Answer correctly as fast as possible.</li>
        <li>Fastest correct solve ranks highest on the leaderboard.</li>
        <li>
          Not happy with your score? You can try again (retries may cost the retry fee if enabled),
          and each retry creates a fresh attempt.
        </li>
      </ul>
    </div>
  );
}