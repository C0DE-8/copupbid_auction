// src/pages/HeistPlay/components/HeistQuestionCard.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./HeistQuestionCard.module.css";
import copupGif from "./assets/copup.gif";

function fmtSeconds(s) {
  if (s == null) return "—";
  const n = Number(s);
  if (!Number.isFinite(n)) return "—";
  const mm = String(Math.floor(n / 60)).padStart(2, "0");
  const ss = String(Math.floor(n % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
}

function isObj(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function tryParseJsonString(v) {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;

  const looksJson =
    (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"));

  if (!looksJson) return null;

  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function toQuestionText(v) {
  if (v == null) return "";

  if (isObj(v)) {
    if (typeof v.question === "string") return v.question;
    if (typeof v.text === "string") return v.text;
    return JSON.stringify(v);
  }

  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return "";

    const parsed = tryParseJsonString(t);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.question === "string") return parsed.question;
      if (typeof parsed.text === "string") return parsed.text;
      return JSON.stringify(parsed);
    }

    return t;
  }

  return String(v);
}

/* ---------------- Start Popup "Seen" storage (per heist, per session tab) ---------------- */
function startPopupKey(heistId) {
  return `heist_start_popup_seen:${heistId}`;
}
function getStartPopupSeen(heistId) {
  try {
    return sessionStorage.getItem(startPopupKey(heistId)) === "1";
  } catch {
    return false;
  }
}
function setStartPopupSeen(heistId) {
  try {
    sessionStorage.setItem(startPopupKey(heistId), "1");
  } catch {}
}

/* ---------------- Preloader Overlay (portal) ---------------- */
function StartGateLoader({ open, gifSrc }) {
  if (!open) return null;

  const node = (
    <div className={styles.loaderBackdrop} role="presentation">
      <div className={styles.loaderCard} role="status" aria-live="polite">
        <img className={styles.loaderImg} src={gifSrc} alt="Loading" />
        <div className={styles.loaderTitle}>Preparing your attempt…</div>
        <div className={styles.loaderSub}>Get ready. Timer starts when you begin.</div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

/* ---------------- Confirm Modal (local, portal) ---------------- */
function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "primary", // "primary" | "danger"
  busy = false,
  dismissible = true, // ✅ NEW: allow forced modals
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (!dismissible) {
        if (e.key === "Enter") onConfirm?.();
        return;
      }
      if (e.key === "Escape") onCancel?.();
      if (e.key === "Enter") onConfirm?.();
    };

    window.addEventListener("keydown", onKey);
    setTimeout(() => confirmRef.current?.focus?.(), 0);

    return () => {
      document.body.style.overflow = prevOverflow || "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel, onConfirm, dismissible]);

  if (!open) return null;

  const node = (
    <div
      className={styles.cBackdrop}
      role="presentation"
      onMouseDown={(e) => {
        if (!dismissible) return;
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div className={styles.cModal} role="dialog" aria-modal="true" aria-label={title || "Confirm"}>
        <div className={styles.cHead}>
          <div className={styles.cTitle}>{title || "Confirm"}</div>

          {dismissible ? (
            <button
              type="button"
              className={styles.cClose}
              onClick={onCancel}
              aria-label="Close confirm modal"
              disabled={busy}
            >
              ✕
            </button>
          ) : null}
        </div>

        <div className={styles.cBody}>
          <div className={styles.cMsg}>{message}</div>
        </div>

        <div className={styles.cFoot}>
          {dismissible ? (
            <button type="button" className={styles.cCancel} onClick={onCancel} disabled={busy}>
              {cancelText}
            </button>
          ) : null}

          <button
            ref={confirmRef}
            type="button"
            className={`${styles.cConfirm} ${tone === "danger" ? styles.cDanger : ""}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Please wait…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

export default function HeistQuestionCard({
  heist,
  canStart,
  starting,
  attemptId,
  questionText,
  answer,
  setAnswer,
  submitting,
  retrying,
  lastResult,
  onStart,
  onSubmit,
  onRetry,
}) {
  const lockedReason = useMemo(() => {
    if (!heist) return "Loading…";
    if (heist?.status === "locked") return "Pay entry to access this heist.";
    if (heist?.status === "completed") return "Heist has ended.";
    if (heist?.submissions_locked) return "Submissions are locked.";
    return "Unavailable right now.";
  }, [heist]);

  // Open attempt => only retry after correct
  const retryBlocked = !!attemptId && !lastResult?.is_correct;

  // ✅ normalize whatever the parent gives us
  const q = useMemo(() => toQuestionText(questionText), [questionText]);

  // ✅ confirm modal state (manual confirmations) — only for retry now
  const [confirm, setConfirm] = useState({
    open: false,
    kind: null, // "retry" only (start removed from UI)
  });

  const openRetryConfirm = () => setConfirm({ open: true, kind: "retry" });
  const closeConfirm = () => setConfirm({ open: false, kind: null });

  const busy = Boolean(starting || retrying);

  const confirmTitle = "Retry Attempt?";
  const confirmText = "Yes, Retry";

  const confirmMsg = `This will create a fresh attempt and replace your current question. ${
    heist?.retry_fee_enabled ? `A retry fee may apply.` : ``
  }`;

  // ---------------- Auto Start Gate (preloader + forced popup) ----------------
  const heistId = Number(heist?.id);

  const [startGateLoading, setStartGateLoading] = useState(false);
  const [startGateOpen, setStartGateOpen] = useState(false);
  const startGateTimerRef = useRef(null);

  useEffect(() => {
    if (!Number.isFinite(heistId)) return;

    // Cleanup any previous timer
    if (startGateTimerRef.current) {
      clearTimeout(startGateTimerRef.current);
      startGateTimerRef.current = null;
    }

    const seen = getStartPopupSeen(heistId);

    // ✅ trigger only if canStart, no attempt yet, and not seen
    const shouldGate = canStart && !attemptId && !seen;

    if (!shouldGate) {
      setStartGateLoading(false);
      setStartGateOpen(false);
      return;
    }

    // ✅ show preloader first, then popup (prevents "flash then popup")
    setStartGateLoading(true);
    setStartGateOpen(false);

    startGateTimerRef.current = setTimeout(() => {
      setStartGateLoading(false);
      setStartGateOpen(true);
      startGateTimerRef.current = null;
    }, 650); // tweak: 450–900ms if you want faster/slower
  }, [canStart, attemptId, heistId]);

  const handleRetryConfirm = () => {
    closeConfirm();
    onRetry?.();
  };

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Attempt Console</div>
          <div className={styles.sub}>Start an attempt, submit the correct answer fast, climb leaderboard.</div>
        </div>

        <div className={styles.status}>
          Attempt: <b>{attemptId ? `#${attemptId}` : "—"}</b>
        </div>
      </div>

      <div className={styles.body}>
        {q ? (
          <div className={styles.qBox}>
            <div className={styles.qLabel}>Question</div>
            <div className={styles.qText}>{q}</div>
          </div>
        ) : (
          <div className={styles.qEmpty}>
            {attemptId ? "Loading your question…" : "Waiting for you to start…"}
          </div>
        )}

        <div className={styles.answerRow}>
          <input
            className={styles.input}
            placeholder="Type your answer…"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={!attemptId || submitting}
          />

          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              // ✅ once they submit, never auto-popup again
              if (Number.isFinite(heistId)) setStartPopupSeen(heistId);
              onSubmit?.();
            }}
            disabled={!attemptId || submitting || !String(answer || "").trim()}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>

        {lastResult ? (
          <div className={`${styles.result} ${lastResult.is_correct ? styles.ok : styles.bad}`}>
            <div className={styles.resultTop}>
              <b>{lastResult.is_correct ? "Correct ✅" : "Incorrect ❌"}</b>

              {lastResult.is_correct ? (
                <>
                  <span>
                    Time: <b>{fmtSeconds(lastResult.total_time_seconds)}</b>
                  </span>
                  <span>
                    Your best: <b>{fmtSeconds(lastResult.user_best_time)}</b>
                  </span>
                </>
              ) : (
                <>
                  <span>
                    Attempt: <b>{lastResult.attempt_open ? "OPEN (keep trying)" : "—"}</b>
                  </span>
                  {lastResult.attempt_open ? (
                    <span>
                      Time so far: <b>{fmtSeconds(lastResult.time_so_far_seconds)}</b>
                    </span>
                  ) : null}
                </>
              )}
            </div>

            <div className={styles.resultMsg}>{lastResult.message}</div>

            {!lastResult.is_correct && lastResult.attempt_open ? (
              <div className={styles.tip}>Keep submitting until you get it correct — your timer is still running.</div>
            ) : null}
          </div>
        ) : null}

        {/* ✅ ACTIONS: Start button removed. Only Retry remains. */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.ghost}
            onClick={openRetryConfirm}
            disabled={!canStart || retrying || retryBlocked}
            title={retryBlocked ? "Finish this attempt (get it correct) before retry." : "Retry"}
          >
            {retrying ? "Retrying…" : "Retry"}
          </button>
        </div>

        {!canStart ? (
          <div className={styles.note}>
            <b>Note:</b> {lockedReason || "Heist unavailable right now."}
          </div>
        ) : null}
      </div>

      {/* ✅ PRELOADER OVERLAY using copup.gif */}
      <StartGateLoader open={startGateLoading} gifSrc={copupGif} />

      {/* ✅ FORCED Start Attempt popup (no cancel / no close / no escape / no click outside) */}
      <ConfirmModal
        open={startGateOpen}
        dismissible={false}
        title="Start your attempt"
        message="You’re in the room and eligible to play. Click Start Attempt to begin your timed run."
        confirmText="Start Attempt"
        tone="primary"
        busy={busy}
        onConfirm={() => {
          if (Number.isFinite(heistId)) setStartPopupSeen(heistId);
          setStartGateOpen(false);
          onStart?.();
        }}
      />

      {/* ✅ Manual confirmation modal (Retry only) */}
      <ConfirmModal
        open={confirm.open}
        title={confirmTitle}
        message={confirmMsg}
        confirmText={confirmText}
        cancelText="Cancel"
        tone="danger"
        busy={busy}
        onCancel={closeConfirm}
        onConfirm={handleRetryConfirm}
      />
    </div>
  );
}