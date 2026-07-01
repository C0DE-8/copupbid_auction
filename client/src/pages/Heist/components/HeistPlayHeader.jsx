// HeistPlayHeader.jsx
import React, { useMemo, useState } from "react";
import styles from "./HeistPlayHeader.module.css";
import StoryPreviewModal from "./StoryPreviewModal";

function statusTone(s) {
  const v = String(s || "").toLowerCase();
  if (v === "started") return "live";
  if (v === "hold") return "hold";
  if (v === "pending") return "pending";
  return "pending";
}

function fmtSeconds(s) {
  if (s == null) return "—";
  const n = Number(s);
  if (!Number.isFinite(n)) return "—";
  const mm = String(Math.floor(n / 60)).padStart(2, "0");
  const ss = String(Math.floor(n % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function HeistPlayHeader({
  heist,
  endsInText = "—",
  userBestTime,
  loading,
  // ✅ optional: pass storyLoading from parent if you fetch story separately
  storyLoading: storyLoadingProp,
}) {
  const tone = useMemo(() => statusTone(heist?.status), [heist?.status]);

  // ✅ book preview modal
  const [storyOpen, setStoryOpen] = useState(false);

  const status = String(heist?.status || "").toLowerCase();

  // ✅ Decide loader vs locked vs content
  const storyLoading =
    typeof storyLoadingProp === "boolean"
      ? storyLoadingProp
      : Boolean(loading || (heist && heist.story == null));

  const canShowStory = Boolean(heist?.story);
  const isLocked = !storyLoading && !canShowStory && status !== "started"; // not started yet => locked

  return (
    <div className={styles.wrap}>
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.top}>
        <div className={styles.left}>
          <div className={styles.kicker}>HEIST ROOM</div>

          <div className={styles.title}>
            {loading ? "Loading…" : heist?.name || "Unknown Heist"}
          </div>

          <div className={styles.meta}>
            <span
              className={`${styles.badge} ${
                tone === "live"
                  ? styles.live
                  : tone === "hold"
                  ? styles.hold
                  : styles.pending
              }`}
            >
              {String(heist?.status || "pending").toUpperCase()}
            </span>

            <span className={styles.pill}>
              Ends in: <b>{endsInText}</b>
            </span>

            <span className={styles.pill}>
              Your best: <b>{fmtSeconds(userBestTime)}</b>
            </span>
          </div>
        </div>

        {heist?.prize_name ? (
          <div className={styles.prize}>
            <div className={styles.prizeLabel}>Prize</div>
            <div className={styles.prizeName}>{heist.prize_name}</div>
            <div className={styles.prizeVal}>
              {heist?.prize ? `${Number(heist.prize).toLocaleString()} COIN` : "—"}
            </div>
          </div>
        ) : null}
      </div>

      {/* ✅ Story block: loader -> locked -> content */}
      <div className={styles.storyCard}>
        <div className={styles.storyHead}>
          <div className={styles.storyTitle}>Story</div>

          <button
            type="button"
            className={styles.storyPreviewBtn}
            onClick={() => setStoryOpen(true)}
            disabled={!canShowStory}
            title={!canShowStory ? "Story not available yet" : "Open book preview"}
          >
            Preview
          </button>
        </div>

        {storyLoading ? (
          <div className={styles.storyLoader} aria-label="Loading story">
            <div className={styles.skelLine} />
            <div className={styles.skelLine} />
            <div className={`${styles.skelLine} ${styles.skelShort}`} />
            <div className={`${styles.skelLine} ${styles.skelLong}`} />
            <div className={`${styles.skelLine} ${styles.skelMid}`} />
          </div>
        ) : isLocked ? (
          <div className={styles.storyLocked}>
            Story unlocks when the heist becomes <b>STARTED</b>.
          </div>
        ) : canShowStory ? (
          <div className={styles.storyBodyWrap}>
            {/* ✅ no-select is controlled via CSS in .storyBody */}
            <div className={styles.storyBody}>{heist.story}</div>
            <div className={styles.storyFade} aria-hidden="true" />
          </div>
        ) : (
          <div className={styles.storyLocked}>
            Story is not available yet. Please refresh.
          </div>
        )}
      </div>

      {/* ✅ Portal-based modal (NOT inside card) */}
      <StoryPreviewModal
        open={storyOpen}
        title={heist?.name || "Heist"}
        story={heist?.story || ""}
        onClose={() => setStoryOpen(false)}
      />
    </div>
  );
}