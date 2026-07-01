// src/pages/HeistPlay/HeistPlay.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import styles from "./HeistPlay.module.css";

import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { api, imgUrl } from "../../lib/api";
import { useToast } from "../../components/Toast/ToastContext.jsx";

import HeistPlayHeader from "./components/HeistPlayHeader";
import HeistPayGate from "./components/HeistPayGate";
import HeistQuestionCard from "./components/HeistQuestionCard";
import HeistLeaderboardTable from "./components/HeistLeaderboardTable";

function safeNum(v, f = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : f;
}

function isJsonObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function fmtSeconds(s) {
  const n = safeNum(s, null);
  if (n == null) return "—";
  const mm = String(Math.floor(n / 60)).padStart(2, "0");
  const ss = String(Math.floor(n % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
}

function msLeft(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return t - Date.now();
}

function lsKey(heistId) {
  return `heist_attempt_state:${heistId}`;
}

function loadAttemptState(heistId) {
  try {
    const raw = localStorage.getItem(lsKey(heistId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed) return null;
    const attemptId = parsed?.attemptId != null ? Number(parsed.attemptId) : null;
    const questionVariant = parsed?.questionVariant ?? null;
    if (!Number.isFinite(attemptId) || !questionVariant) return null;
    return { attemptId, questionVariant };
  } catch {
    return null;
  }
}

function saveAttemptState(heistId, attemptId, questionVariant) {
  try {
    localStorage.setItem(
      lsKey(heistId),
      JSON.stringify({ attemptId, questionVariant, savedAt: Date.now() })
    );
  } catch {}
}

function clearAttemptState(heistId) {
  try {
    localStorage.removeItem(lsKey(heistId));
  } catch {}
}

/** ✅ parse JSON if question_variant is stored as JSON string */
function tryParseJsonString(s) {
  if (typeof s !== "string") return null;
  const t = s.trim();
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

/** ✅ extract visible question text from object / json-string / plain string */
function extractQuestionText(questionVariant) {
  if (!questionVariant) return "";

  // object
  if (isJsonObject(questionVariant)) {
    if (typeof questionVariant.question === "string") return questionVariant.question;
    if (typeof questionVariant.text === "string") return questionVariant.text;
    return JSON.stringify(questionVariant);
  }

  // string
  if (typeof questionVariant === "string") {
    const t = questionVariant.trim();
    if (!t) return "";

    // json string
    const parsed = tryParseJsonString(t);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.question === "string") return parsed.question;
      if (typeof parsed.text === "string") return parsed.text;
      return JSON.stringify(parsed);
    }

    // plain question
    return t;
  }

  return String(questionVariant);
}

export default function HeistPlay() {
  const { id } = useParams();
  const heistId = Number(id);
  const nav = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const [heist, setHeist] = useState(null);
  const [userBestTime, setUserBestTime] = useState(null);

  // preview list from /play (top 10 fastest correct)
  const [leaderboardPreview, setLeaderboardPreview] = useState([]);

  // full leaderboard (paginated)
  const [lbLoading, setLbLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbPage, setLbPage] = useState(1);
  const [lbLimit] = useState(20);
  const [lbTotal, setLbTotal] = useState(0);
  const [lbTotalPages, setLbTotalPages] = useState(1);

  const [attemptId, setAttemptId] = useState(null);
  const [questionVariant, setQuestionVariant] = useState(null);
  const [answer, setAnswer] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const [lastResult, setLastResult] = useState(null);

  const tickRef = useRef(null);
  const [nowTick, setNowTick] = useState(0);

  // restore attempt from localStorage (safe fallback before server truth)
  useEffect(() => {
    if (!Number.isFinite(heistId)) return;
    const cached = loadAttemptState(heistId);
    if (cached?.attemptId && cached?.questionVariant) {
      setAttemptId(cached.attemptId);
      setQuestionVariant(cached.questionVariant);
    }
  }, [heistId]);

  // ✅ GET /api/heists/heist/:id/play
  const fetchPlay = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/heists/heist/${heistId}/play`);

      const h = data?.heist || null;
      setHeist(
        h
          ? {
              ...h,
              prize_image: h?.prize_image ? imgUrl(h.prize_image) : "",
              ticket_price: safeNum(h.ticket_price, 0),
              retry_ticket_price: safeNum(h.retry_ticket_price, 0),
              min_users: safeNum(h.min_users, 0),
              submissions_locked: !!h.submissions_locked,
            }
          : null
      );

      setUserBestTime(data?.userBestTime != null ? safeNum(data.userBestTime, null) : null);

      // preview rows
      const prev = Array.isArray(data?.leaderboardPreview) ? data.leaderboardPreview : [];
      setLeaderboardPreview(
        prev.map((r) => ({
          user_id: r?.user_id,
          best_time: r?.best_time != null ? safeNum(r.best_time, null) : null,
          username: r?.username ?? null,
          full_name: r?.full_name ?? null,
          image: r?.image ? imgUrl(r.image) : "",
        }))
      );

      // ✅ SERVER TRUTH: openAttempt shows your current question if attempt is open
      const oa = data?.openAttempt || null;
      if (oa?.attempt_id && oa?.question_variant) {
        const serverAttemptId = Number(oa.attempt_id);
        if (Number.isFinite(serverAttemptId)) {
          setAttemptId(serverAttemptId);
          setQuestionVariant(oa.question_variant);
          saveAttemptState(heistId, serverAttemptId, oa.question_variant);
        }
      } else {
        clearAttemptState(heistId);
        setAttemptId(null);
        setQuestionVariant(null);
      }
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.message || "Failed to load heist";

      if (status === 403) {
        setHeist({ id: heistId, status: "locked" });
        return;
      }

      if (status === 400 && /ended|no longer playable|completed/i.test(String(msg))) {
        setHeist({ id: heistId, status: "completed" });
        toast.info(msg);
        return;
      }

      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast, heistId]);

  // ✅ GET /api/heists/heist/:id/leaderboard
  const fetchLeaderboard = useCallback(
    async (page = 1) => {
      setLbLoading(true);
      try {
        const { data } = await api.get(
          `/heists/heist/${heistId}/leaderboard?page=${page}&limit=${lbLimit}`
        );

        const list = Array.isArray(data?.leaderboard) ? data.leaderboard : [];
        setLeaderboard(
          list.map((r) => ({
            ...r,
            best_time: r?.best_time != null ? safeNum(r.best_time, null) : null,
            image: r?.image ? imgUrl(r.image) : "",
            attempts_count: safeNum(r.attempts_count, 0),
            correct_attempts: safeNum(r.correct_attempts, 0),
            joined: r?.joined === true,
          }))
        );

        const total = safeNum(data?.total, 0);
        const totalPages = safeNum(data?.totalPages, 1);
        setLbTotal(total);
        setLbTotalPages(totalPages);
        setLbPage(safeNum(data?.page, page));
      } catch (e) {
        toast.error(e?.response?.data?.message || e?.message || "Failed to load leaderboard");
      } finally {
        setLbLoading(false);
      }
    },
    [toast, heistId, lbLimit]
  );

  useEffect(() => {
    if (!Number.isFinite(heistId)) {
      nav("/heist");
      return;
    }
    fetchPlay();
  }, [fetchPlay, heistId, nav]);

  // timer tick for countdown UI
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => setNowTick((v) => v + 1), 1000);
    return () => tickRef.current && clearInterval(tickRef.current);
  }, []);

  const countdownEndsAt = heist?.countdown_ends_at || null;
  const endsInMs = useMemo(() => msLeft(countdownEndsAt), [countdownEndsAt, nowTick]);
  const endsInText = useMemo(() => {
    if (endsInMs == null) return "—";
    if (endsInMs <= 0) return "00:00";
    const s = Math.floor(endsInMs / 1000);
    return fmtSeconds(s);
  }, [endsInMs]);

  const canPlay =
    heist?.status !== "completed" &&
    heist?.status !== "locked" &&
    !heist?.submissions_locked;

  // ✅ POST /api/heists/heist/:id/start
  const startAttempt = useCallback(async () => {
    setStarting(true);
    setLastResult(null);
    try {
      const { data } = await api.post(`/heists/heist/${heistId}/start`);

      if (String(data?.status || "") === "completed") {
        toast.info(data?.message || "Heist ended.");
        clearAttemptState(heistId);
        setAttemptId(null);
        setQuestionVariant(null);
        return nav(`/heist/${heistId}/result`);
      }

      // ✅ accept multiple key names safely
      const newAttemptIdRaw =
        data?.attempt_id ?? data?.attemptId ?? data?.attempt ?? data?.openAttempt?.attempt_id ?? null;

      const qv =
        data?.question_variant ??
        data?.questionVariant ??
        data?.question ??
        data?.openAttempt?.question_variant ??
        null;

      const newAttemptId = newAttemptIdRaw != null ? Number(newAttemptIdRaw) : null;

      if (data?.resumed && newAttemptId) {
        setAttemptId(newAttemptId);
        setQuestionVariant(qv || questionVariant);
        toast.info(data?.message || "Resumed your attempt.");
      } else {
        setAttemptId(newAttemptId);
        setQuestionVariant(qv);
        toast.success("Attempt started. Solve fast.");
      }

      setAnswer("");
      if (newAttemptId && qv) saveAttemptState(heistId, newAttemptId, qv);

      setHeist((prev) =>
        prev
          ? {
              ...prev,
              status: data?.heist_status || prev.status,
              countdown_ends_at: data?.countdown_ends_at ?? prev.countdown_ends_at,
            }
          : prev
      );
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to start attempt");
    } finally {
      setStarting(false);
    }
  }, [toast, heistId, nav, questionVariant]);

  // ✅ POST /api/heists/heist/:id/submit
  const submitAttempt = useCallback(async () => {
    if (!attemptId) return toast.error("No attempt started yet.");
    setSubmitting(true);

    try {
      const payload = { attempt_id: attemptId, answer };
      const { data } = await api.post(`/heists/heist/${heistId}/submit`, payload);

      if (String(data?.status || "") === "completed") {
        toast.info(data?.message || "Heist ended.");
        clearAttemptState(heistId);
        setAttemptId(null);
        setQuestionVariant(null);
        return nav(`/heist/${heistId}/result`);
      }

      const resObj = {
        message: data?.message || "Submitted",
        is_correct: !!data?.is_correct,
        attempt_open: data?.attempt_open !== false,

        // ✅ NEW: wrong-answer elapsed time from backend
        time_so_far_seconds:
          data?.time_so_far_seconds != null ? safeNum(data.time_so_far_seconds, null) : null,

        total_time_seconds:
          data?.total_time_seconds != null ? safeNum(data.total_time_seconds, null) : null,
        user_best_time:
          data?.user_best_time != null ? safeNum(data.user_best_time, null) : userBestTime,
        heist_status: data?.heist_status || null,
      };

      setLastResult(resObj);

      if (resObj.heist_status) {
        setHeist((prev) => (prev ? { ...prev, status: resObj.heist_status || prev.status } : prev));
      }

      if (resObj.is_correct) {
        setUserBestTime(resObj.user_best_time);
        toast.success(resObj.message);

        clearAttemptState(heistId);
        setAttemptId(null);
        setQuestionVariant(null);

        if (leaderboard.length) fetchLeaderboard(lbPage);
      } else {
        toast.error(resObj.message);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }, [
    toast,
    heistId,
    attemptId,
    answer,
    userBestTime,
    nav,
    leaderboard.length,
    fetchLeaderboard,
    lbPage,
  ]);

  // ✅ POST /api/heists/heist/:id/retry
  const retryAttempt = useCallback(async () => {
    setRetrying(true);
    setLastResult(null);
    try {
      const { data } = await api.post(`/heists/heist/${heistId}/retry`);

      if (String(data?.status || "") === "completed") {
        toast.info(data?.message || "Heist ended.");
        clearAttemptState(heistId);
        setAttemptId(null);
        setQuestionVariant(null);
        return nav(`/heist/${heistId}/result`);
      }

      const newAttemptIdRaw = data?.attempt_id ?? data?.attemptId ?? null;
      const qv = data?.question_variant ?? data?.questionVariant ?? data?.question ?? null;

      const newAttemptId = newAttemptIdRaw != null ? Number(newAttemptIdRaw) : null;

      setAttemptId(newAttemptId);
      setQuestionVariant(qv);
      setAnswer("");

      if (newAttemptId && qv) saveAttemptState(heistId, newAttemptId, qv);

      toast.success(`Retry started${data?.retry_cost ? ` • Cost: ${data.retry_cost} COIN` : ""}`);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Retry failed");
    } finally {
      setRetrying(false);
    }
  }, [toast, heistId, nav]);

  // ✅ POST /api/heists/pay-entry/:id
  const payEntry = useCallback(async () => {
    setPaying(true);
    try {
      const { data } = await api.post(`/heists/pay-entry/${heistId}`);
      toast.success(data?.message || "Entry paid.");
      await fetchPlay();

      setLeaderboard([]);
      setLbPage(1);
      setLbTotal(0);
      setLbTotalPages(1);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  }, [toast, heistId, fetchPlay]);

  // ✅ THIS is what makes the question ALWAYS show
  const qText = useMemo(() => extractQuestionText(questionVariant), [questionVariant]);

  const showingFullLb = leaderboard.length > 0;

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.topRow}>
            <Link to="/heist" className={styles.backBtn}>
              ← Back
            </Link>

            <div className={styles.rightTop}>
              <Link to={`/heist/${heistId}/result`} className={styles.ghostBtn}>
                Result
              </Link>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={fetchPlay}
                disabled={loading}
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          <HeistPlayHeader
            heist={heist}
            endsInText={endsInText}
            userBestTime={userBestTime}
            loading={loading}
          />

          {heist?.status === "locked" ? (
            <HeistPayGate paying={paying} onPay={payEntry} />
          ) : heist?.status === "completed" ? (
            <div className={styles.panel}>
              <div className={styles.panelTitle}>Heist Ended</div>
              <div className={styles.panelSub}>This heist is no longer playable.</div>
              <Link to={`/heist/${heistId}/result`} className={styles.panelBtn}>
                View Results
              </Link>
            </div>
          ) : (
            <div className={styles.grid}>
              <HeistQuestionCard
                heist={heist}
                canStart={canPlay}
                starting={starting}
                attemptId={attemptId}
                questionText={qText}
                answer={answer}
                setAnswer={setAnswer}
                submitting={submitting}
                retrying={retrying}
                lastResult={lastResult}
                onStart={startAttempt}
                onSubmit={submitAttempt}
                onRetry={retryAttempt}
              />

              <div className={styles.side}>
                <div className={styles.panel}>
                  <div className={styles.panelTitle}>Leaderboard (Joined Players)</div>
                  <div className={styles.panelSub}>
                    {showingFullLb ? (
                      <>
                        Showing <b>{Math.min(lbLimit, leaderboard.length)}</b> of <b>{lbTotal}</b>{" "}
                        players • Page <b>{lbPage}</b>/<b>{lbTotalPages}</b>
                      </>
                    ) : (
                      "Preview shows fastest correct times (Top 10). Load full list to see all joined."
                    )}
                  </div>

                  <div className={styles.lbActions}>
                    {!showingFullLb ? (
                      <button
                        type="button"
                        className={styles.panelBtn}
                        onClick={() => fetchLeaderboard(1)}
                        disabled={lbLoading}
                      >
                        {lbLoading ? "Loading…" : "Load Joined Leaderboard"}
                      </button>
                    ) : (
                      <div className={styles.pager}>
                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={() => fetchLeaderboard(Math.max(1, lbPage - 1))}
                          disabled={lbLoading || lbPage <= 1}
                        >
                          Prev
                        </button>

                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={() => fetchLeaderboard(Math.min(lbTotalPages, lbPage + 1))}
                          disabled={lbLoading || lbPage >= lbTotalPages}
                        >
                          Next
                        </button>

                        <button
                          type="button"
                          className={styles.ghostBtn}
                          onClick={() => {
                            setLeaderboard([]);
                            setLbPage(1);
                          }}
                          disabled={lbLoading}
                          title="Return to preview"
                        >
                          Preview
                        </button>
                      </div>
                    )}
                  </div>

                  <HeistLeaderboardTable
                    compact
                    rows={showingFullLb ? leaderboard : leaderboardPreview}
                    loading={lbLoading}
                    showJoinedMeta={showingFullLb}
                  />
                </div>

                <div className={styles.panel}>
                  <div className={styles.panelTitle}>How it works</div>
                  <ul className={styles.rules}>
                    <li>Pay entry to access the heist.</li>
                    <li>
                      You can <b>start + submit</b> as long as you joined.
                    </li>
                    <li>
                      Countdown To End starts automatically when <b>min users</b> is reached.
                    </li>
                    <li>
                      Your score = <b>fastest correct time</b>.
                    </li>
                    <li>
                      If you answer wrong, the attempt stays <b>OPEN</b> (timer continues).
                    </li>
                    <li>Retry creates a new attempt (may cost coins).</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}