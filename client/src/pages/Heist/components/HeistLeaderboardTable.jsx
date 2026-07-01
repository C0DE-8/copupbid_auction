// src/pages/HeistPlay/components/HeistLeaderboardTable.jsx
import React from "react";
import styles from "./HeistLeaderboardTable.module.css";

function fmtSeconds(s) {
  if (s == null) return "—";
  const n = Number(s);
  if (!Number.isFinite(n)) return "—";
  const mm = String(Math.floor(n / 60)).padStart(2, "0");
  const ss = String(Math.floor(n % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function HeistLeaderboardTable({
  rows = [],
  loading = false,
  compact = false,
  showJoinedMeta = false, // ✅ when using joined-users leaderboard
}) {
  const list = Array.isArray(rows) ? rows : [];

  if (loading) return <div className={styles.muted}>Loading leaderboard…</div>;
  if (!list.length) return <div className={styles.muted}>No leaderboard yet.</div>;

  return (
    <div className={styles.tableWrap}>
      {list.map((r, idx) => {
        const name = r.username || r.full_name || `User ${r.user_id}`;
        const hasScore = r.best_time != null;
        return (
          <div key={`${r.user_id}-${idx}`} className={styles.row}>
            <div className={styles.rank}>#{idx + 1}</div>

            <div className={styles.user}>
              {r.image ? (
                <img src={r.image} alt="profile" className={styles.avatar} />
              ) : (
                <div className={styles.avatarFallback} />
              )}

              <div className={styles.names}>
                <div className={styles.name}>{name}</div>

                {!compact ? (
                  <div className={styles.sub}>
                    Attempts: <b>{r.attempts_count ?? "—"}</b> • Correct:{" "}
                    <b>{r.correct_attempts ?? "—"}</b>
                  </div>
                ) : null}

                {showJoinedMeta ? (
                  <div className={styles.sub}>
                    {hasScore ? (
                      <>
                        Status: <b>Scored</b>
                      </>
                    ) : (
                      <>
                        Status: <b>Joined (no score yet)</b>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className={styles.time}>{fmtSeconds(r.best_time)}</div>
          </div>
        );
      })}
    </div>
  );
}