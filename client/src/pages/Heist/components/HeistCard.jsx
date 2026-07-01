import React, { useMemo } from "react";
import styles from "../Heist.module.css";

function formatNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

export default function HeistCard({
  heist,
  tone = "pending",
  paying = false,
  onPay,
  onOpen,
}) {
  const joined = Number(heist?.participantsJoined || 0);
  const min = Number(heist?.minUsers || 0);

  const percent = min > 0 ? Math.min(100, Math.round((joined / min) * 100)) : 0;
  const isReady = percent >= 100;

  const statusText = useMemo(() => {
    if (tone === "live") return "LIVE";
    if (tone === "hold") return "HOLD";
    return "PENDING";
  }, [tone]);

  return (
    <div
      className={`${styles.card} ${
        tone === "live"
          ? styles.cardLive
          : tone === "hold"
          ? styles.cardHold
          : ""
      }`}
    >
      {/* ================= TOP ================= */}
      <div className={styles.cardTop}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.cardTitle}>{heist?.name || "Unnamed Heist"}</div>

          <div className={styles.cardMeta}>
            {tone === "live"
              ? "This room is live. Enter and play."
              : tone === "hold"
              ? "Room is on hold. Check back shortly."
              : "Open room. Join anytime."}
          </div>
        </div>

        <span
          className={`${styles.badgePill} ${
            tone === "live"
              ? styles.badgeLive
              : tone === "hold"
              ? styles.badgeHold
              : styles.badgePending
          }`}
        >
          {statusText}
        </span>
      </div>

      {/* ================= PRIZE ================= */}
      <div className={styles.prizeRow}>
        <div className={styles.prizeLeft}>
          {heist?.prize_image ? (
            <img
              src={heist.prize_image}
              alt={heist?.prize_name || "Prize"}
              className={styles.prizeImg}
              loading="lazy"
            />
          ) : (
            <div className={styles.prizeFallback} />
          )}

          <div style={{ minWidth: 0 }}>
            <div className={styles.prizeLabel}>Prize</div>
            <div
              className={styles.prizeName}
              title={heist?.prize_name || "Mystery Reward"}
            >
              {heist?.prize_name || "Mystery Reward"}
            </div>
            <div className={styles.prizeVal}>
              {heist?.prize ? `${formatNum(heist.prize)} COIN` : "—"}
            </div>
          </div>
        </div>

        <div className={styles.priceBox}>
          <div className={styles.priceLabel}>Entry</div>
          <div className={styles.priceVal}>{formatNum(heist?.ticket_price)} COIN</div>
          <div className={styles.priceSub}>
            Retry: {formatNum(heist?.retry_ticket_price)} COIN
          </div>
        </div>
      </div>

      {/* ================= ENERGY (TEMP: SIMPLE BAR) ================= */}
      <div className={styles.progressWrap}>
        <div className={styles.progressTop}>
          <span className={styles.progressLabel}>Heist Energy</span>
          <span className={styles.progressVal}>{percent}%</span>
        </div>

        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className={styles.progressHint}>
          {isReady
            ? "Energy full — this heist is ready."
            : "Filling up as players join."}
        </div>
      </div>

      {/* ================= WATER ENERGY (COMMENTED OUT FOR NOW) ================= */}
      {/*
      <div className={`${styles.fillWrap} ${isReady ? styles.fillReady : ""}`}>
        <div className={styles.fillHeader}>
          <span className={styles.fillTitle}>Heist Energy</span>
          <span className={styles.fillPct}>{percent}%</span>
        </div>

        <div className={styles.tank} style={{ ["--fill"]: `${percent}%` }}>
          <div className={styles.liquid} />
          <div className={styles.surface} />
          <div className={styles.bubbles} />
        </div>
      </div>
      */}

      {/* ================= ACTIONS ================= */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={onPay}
          disabled={paying}
        >
          {paying ? "Processing…" : "Pay Entry"}
        </button>

        <button type="button" className={styles.ghostBtn} onClick={onOpen}>
          View / Play
        </button>
      </div>
    </div>
  );
}