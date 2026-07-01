// src/pages/Winner/Winner.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import styles from "./Winner.module.css";

import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import LoginRequiredModal from "../../components/LoginRequiredModal/LoginRequiredModal";
import SkeletonGrid from "../../components/SkeletonGrid/SkeletonGrid";
import { api } from "../../lib/api";

import {
  FiAward,
  FiUsers,
  FiClock,
  FiRefreshCw,
  FiAlertTriangle,
  FiChevronRight,
  FiChevronLeft,
  FiCopy,
  FiCheckCircle,
} from "react-icons/fi";

/* ---------------- helpers ---------------- */
function getAuthToken() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken");
}
function explainAxiosError(e) {
  if (e?.response) {
    const msg = e.response.data?.message || e.response.statusText || "Request failed";
    return `API error (${e.response.status}): ${msg}`;
  }
  if (e?.request) return "No response from server. Check API URL / CORS / network.";
  return e?.message || "Unknown error";
}
function fmtSec(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 60) return `${n.toFixed(2)}s`;
  const m = Math.floor(n / 60);
  const s = (n - m * 60).toFixed(2).padStart(5, "0");
  return `${m}m ${s}s`;
}
function maskId(v) {
  const s = String(v || "");
  if (s.length <= 8) return s;
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}

// robust datetime formatter for mixed formats (ISO, "YYYY-MM-DD HH:mm:ss", etc.)
function fmtDateTime(v, withSeconds = false) {
  if (!v) return "—";
  const m = moment(v, moment.ISO_8601, true).isValid()
    ? moment(v)
    : moment(v, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY/MM/DD HH:mm:ss"], true);

  if (!m.isValid()) return String(v);

  return withSeconds ? m.format("MMM D, YYYY • h:mm:ss A") : m.format("MMM D, YYYY • h:mm A");
}

export default function Winner() {
  const isProd =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.MODE === "production") ||
    process.env.NODE_ENV === "production";

  // login modal
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalMeta, setLoginModalMeta] = useState({ title: "", message: "" });

  const openLoginModal = useCallback((title, message) => {
    setLoginModalMeta({
      title: title || "Login required",
      message: message || "Please login to view completed heists and winners.",
    });
    setLoginModalOpen(true);
  }, []);
  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);

  // data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState([]); // [{heist,winner,leaderboard,attempts,userBestTime}]
  const [count, setCount] = useState(0);

  // selection
  const [activeIdx, setActiveIdx] = useState(0);

  // ui
  const [info, setInfo] = useState("");

  // attempts accordion
  const [openAttemptId, setOpenAttemptId] = useState(null);
  const toggleAttempt = useCallback((attemptId) => {
    setOpenAttemptId((prev) => (prev === attemptId ? null : attemptId));
  }, []);

  const active = useMemo(() => {
    const list = Array.isArray(completed) ? completed : [];
    if (!list.length) return null;
    const idx = Math.max(0, Math.min(activeIdx, list.length - 1));
    return list[idx] || null;
  }, [completed, activeIdx]);

  const fetchCompleted = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      openLoginModal("Login required", "Login to view winners and completed heists.");
      setCompleted([]);
      setCount(0);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // assuming api base includes /api
      const { data } = await api.get("/heists/heists/completed");
      const arr = Array.isArray(data?.completed) ? data.completed : [];
      setCompleted(arr);
      setCount(Number(data?.count || arr.length || 0));
      setActiveIdx(0);
      setOpenAttemptId(null);
    } catch (e) {
      setError(explainAxiosError(e));
      setCompleted([]);
      setCount(0);
      setOpenAttemptId(null);
    } finally {
      setLoading(false);
    }
  }, [openLoginModal]);

  useEffect(() => {
    fetchCompleted();
  }, [fetchCompleted]);

  const onRefresh = useCallback(async () => {
    await fetchCompleted();
  }, [fetchCompleted]);

  const copyText = useCallback(async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(String(text));
      setInfo("Copied.");
      setTimeout(() => setInfo(""), 1200);
    } catch {
      // ignore
    }
  }, []);

  const nextHeist = useCallback(() => {
    setActiveIdx((i) => {
      const total = (Array.isArray(completed) ? completed.length : 0) || 0;
      if (!total) return 0;
      return Math.min(total - 1, i + 1);
    });
    setOpenAttemptId(null);
  }, [completed]);

  const prevHeist = useCallback(() => {
    setActiveIdx((i) => Math.max(0, i - 1));
    setOpenAttemptId(null);
  }, []);

  // derived
  const heist = active?.heist || null;
  const winner = active?.winner || null;
  const leaderboard = Array.isArray(active?.leaderboard) ? active.leaderboard : [];
  const attempts = Array.isArray(active?.attempts) ? active.attempts : [];

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} aria-hidden="true">
        <svg className={styles.bgSvg} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="glow2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="glow3" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="20%" cy="30%" r="320" fill="url(#glow1)" className={styles.pulse1} />
          <circle cx="80%" cy="70%" r="260" fill="url(#glow2)" className={styles.pulse2} />
          <circle cx="60%" cy="20%" r="210" fill="url(#glow3)" className={styles.pulse3} />
        </svg>
      </div>

      <Header />

      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroCard}>
            <div className={styles.heroTop}>
              <div className={styles.heroIcon}>
                <FiAward />
              </div>

              <div className={styles.heroMain}>
                <div className={styles.heroTitle}>Winners (Completed Heists)</div>
                <div className={styles.heroSub}>
                  View completed heists, the winner card, leaderboard, and all attempts.
                </div>

                <div className={styles.pills}>
                  <div className={styles.pill}>
                    <FiUsers />
                    <span>
                      Completed: <b>{count}</b>
                    </span>
                  </div>

                  {info ? (
                    <div className={styles.pillAlt}>
                      <FiCheckCircle />
                      <span>{info}</span>
                    </div>
                  ) : (
                    <div className={styles.pillAlt}>
                      <FiClock />
                      <span>Fast summary + full history</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.heroActions}>
                <button type="button" className={styles.btnPrimary} onClick={onRefresh}>
                  <FiRefreshCw style={{ marginRight: 8 }} />
                  Refresh
                </button>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => (window.location.href = "/app/dashboard")}
                >
                  Back
                </button>
              </div>
            </div>

            {!isProd && error ? (
              <div className={styles.devHint}>
                <span>Dev:</span> {String(error).slice(0, 220)}
              </div>
            ) : null}

            {/* selector row */}
            <div className={styles.selectorRow}>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={prevHeist}
                disabled={activeIdx <= 0}
                title="Previous"
              >
                <FiChevronLeft />
              </button>

              <div className={styles.selectorMid}>
                <div className={styles.selectorTitle}>{heist ? heist.name : "—"}</div>
                <div className={styles.selectorSub}>
                  {heist ? (
                    <>
                      Status <b>{String(heist.status || "").toUpperCase()}</b>
                    </>
                  ) : (
                    "No completed heists yet"
                  )}
                </div>
              </div>

              <button
                type="button"
                className={styles.pageBtn}
                onClick={nextHeist}
                disabled={!completed.length || activeIdx >= completed.length - 1}
                title="Next"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.body}>
        <div className={styles.container}>
          {loading ? (
            <SkeletonGrid count={9} />
          ) : error ? (
            <div className={styles.stateCard}>
              <div className={styles.stateTop}>
                <div className={styles.stateIcon}>
                  <FiAlertTriangle />
                </div>
                <div>
                  <div className={styles.stateTitle}>We couldn’t load winners</div>
                  <div className={styles.stateSub}>Please refresh and try again.</div>
                </div>
              </div>

              {!isProd ? (
                <div className={styles.devHint}>
                  <span>Dev:</span> {String(error).slice(0, 240)}
                </div>
              ) : null}

              <div className={styles.stateActions}>
                <button type="button" className={styles.btnPrimary} onClick={onRefresh}>
                  <FiRefreshCw style={{ marginRight: 8 }} />
                  Try again
                </button>
              </div>
            </div>
          ) : !active ? (
            <div className={styles.stateCard}>
              <div className={styles.stateTop}>
                <div className={styles.stateIcon}>
                  <FiAward />
                </div>
                <div>
                  <div className={styles.stateTitle}>No completed heists yet</div>
                  <div className={styles.stateSub}>
                    When a heist is completed, winners and history will show here.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* winner + heist summary */}
              <div className={styles.gridTop}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitle}>Winner</div>
                    <div className={styles.cardSub}>The official winner for this heist</div>
                  </div>

                  {winner ? (
                    <div className={styles.winnerRow}>
                      <div className={styles.avatarWrap}>
                        {winner.image ? (
                          <img className={styles.avatar} src={winner.image} alt="winner" />
                        ) : (
                          <div className={styles.avatarFallback}>
                            {String(winner.username || "U").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className={styles.winnerMain}>
                        <div className={styles.winnerName}>{winner.full_name || "Unknown"}</div>
                        <div className={styles.winnerSub}>
                          @{winner.username || "—"} • ID: <b>{maskId(winner.id)}</b>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={() => copyText(String(winner.username || ""))}
                        title="Copy winner username"
                      >
                        <FiCopy style={{ marginRight: 8 }} />
                        Copy
                      </button>
                    </div>
                  ) : (
                    <div className={styles.softNote}>No winner_id recorded for this heist.</div>
                  )}

                  <div className={styles.divider} />

                  <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                      <div className={styles.metaLabel}>Prize</div>
                      <div className={styles.metaValue}>{heist?.prize_name || "—"}</div>
                    </div>
                    <div className={styles.metaItem}>
                      <div className={styles.metaLabel}>Prize value</div>
                      <div className={styles.metaValue}>{heist?.prize || "—"}</div>
                    </div>
                    <div className={styles.metaItem}>
                      <div className={styles.metaLabel}>Ended</div>
                      <div className={styles.metaValue}>{fmtDateTime(heist?.countdown_ends_at, false)}</div>
                    </div>
                    <div className={styles.metaItem}>
                      <div className={styles.metaLabel}>Locked</div>
                      <div className={styles.metaValue}>{heist?.submissions_locked ? "Yes" : "No"}</div>
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitle}>Story</div>
                    <div className={styles.cardSub}>Full story is visible for completed heists</div>
                  </div>

                  <div className={styles.storyWrap}>
                    <div className={styles.story}>{heist?.story ? heist.story : "—"}</div>
                  </div>

                  <div className={styles.prizeRow}>
                    {heist?.prize_image ? (
                      <img className={styles.prizeImg} src={heist.prize_image} alt="prize" />
                    ) : (
                      <div className={styles.prizeImgFallback}>No image</div>
                    )}

                    <div className={styles.prizeText}>
                      <div className={styles.prizeTitle}>{heist?.prize_name || "Prize"}</div>
                      <div className={styles.prizeSub}>Completed heist</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* leaderboard */}
              <div className={styles.card}>
                <div className={styles.cardHeaderRow}>
                  <div>
                    <div className={styles.cardTitle}>Leaderboard</div>
                    <div className={styles.cardSub}>Top 20 performers</div>
                  </div>
                  <div className={styles.badgeSoft}>{leaderboard.length} users</div>
                </div>

                {leaderboard.length ? (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>User</th>
                          <th>Best Time</th>
                          <th>Correct</th>
                          <th>Attempts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((r, idx) => (
                          <tr key={`${r.user_id}-${idx}`}>
                            <td className={styles.tdRank}>{idx + 1}</td>
                            <td>
                              <div className={styles.userCell}>
                                {r.image ? (
                                  <img className={styles.userAvatar} src={r.image} alt="u" />
                                ) : (
                                  <div className={styles.userAvatarFallback}>
                                    {String(r.username || "U").slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                                <div className={styles.userText}>
                                  <div className={styles.userName}>{r.full_name || r.username || "Unknown"}</div>
                                  <div className={styles.userSub}>@{r.username || "—"}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={styles.timePill}>
                                <FiClock style={{ marginRight: 6 }} />
                                {fmtSec(r.best_time)}
                              </span>
                            </td>
                            <td>{Number(r.correct_attempts || 0)}</td>
                            <td>{Number(r.attempts_count || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={styles.softNote}>No leaderboard data for this heist.</div>
                )}
              </div>

              {/* attempts history */}
              <div className={styles.card}>
                <div className={styles.cardHeaderRow}>
                  <div>
                    <div className={styles.cardTitle}>All Attempts</div>
                    <div className={styles.cardSub}>Tap a user to expand full details</div>
                  </div>
                  <div className={styles.badgeSoft}>{attempts.length} attempts</div>
                </div>

                {attempts.length ? (
                  <div className={styles.attempts}>
                    {attempts.map((a) => {
                      const isOpen = openAttemptId === a.attempt_id;

                      return (
                        <div className={styles.attemptCard} key={a.attempt_id}>
                          <button
                            type="button"
                            className={styles.attemptHeaderBtn}
                            onClick={() => toggleAttempt(a.attempt_id)}
                            aria-expanded={isOpen ? "true" : "false"}
                          >
                            <div className={styles.attemptTop}>
                              <div className={styles.userCell}>
                                {a.image ? (
                                  <img className={styles.userAvatar} src={a.image} alt="u" />
                                ) : (
                                  <div className={styles.userAvatarFallback}>
                                    {String(a.username || "U").slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                                <div className={styles.userText}>
                                  <div className={styles.userName}>
                                    {a.full_name || a.username || "Unknown"}
                                  </div>
                                  <div className={styles.userSub}>@{a.username || "—"}</div>
                                </div>
                              </div>

                              <div className={styles.attemptRight}>
                                <div
                                  className={a.is_correct ? styles.pillOk : styles.pillErr}
                                  title={a.is_correct ? "Correct" : "Wrong"}
                                >
                                  {a.is_correct ? "Correct" : "Wrong"}
                                </div>
                                <div className={styles.expandHint}>{isOpen ? "Hide" : "View"}</div>
                              </div>
                            </div>
                          </button>

                          {isOpen ? (
                            <div className={styles.attemptBody}>
                              <div className={styles.qaGrid}>
                                <div className={styles.qaItem}>
                                  <div className={styles.qaLabel}>Variant</div>
                                  <div className={styles.qaValue}>{a.question_variant ?? "—"}</div>
                                </div>
                                <div className={styles.qaItem}>
                                  <div className={styles.qaLabel}>Correct Answer</div>
                                  <div className={styles.qaValue}>{a.correct_answer ?? "—"}</div>
                                </div>
                                <div className={styles.qaItem}>
                                  <div className={styles.qaLabel}>Submitted</div>
                                  <div className={styles.qaValue}>{a.submitted_answer ?? "—"}</div>
                                </div>
                                <div className={styles.qaItem}>
                                  <div className={styles.qaLabel}>Time</div>
                                  <div className={styles.qaValue}>{fmtSec(a.total_time_seconds)}</div>
                                </div>
                              </div>

                              <div className={styles.attemptMeta}>
                                Attempt ID: <b>{a.attempt_id}</b> • Created:{" "}
                                <span>{fmtDateTime(a.created_at, true)}</span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.softNote}>No attempts recorded for this heist.</div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />

      <LoginRequiredModal
        open={loginModalOpen}
        onClose={closeLoginModal}
        title={loginModalMeta.title}
        message={loginModalMeta.message}
      />
    </div>
  );
}