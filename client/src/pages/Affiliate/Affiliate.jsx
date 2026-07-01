// src/pages/Affiliate/Affiliate.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./Affiliate.module.css";

import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import LoginRequiredModal from "../../components/LoginRequiredModal/LoginRequiredModal";
import SkeletonGrid from "../../components/SkeletonGrid/SkeletonGrid";
import { api } from "../../lib/api";

import {
  FiUsers,
  FiCopy,
  FiLink,
  FiRefreshCw,
  FiAlertTriangle,
  FiCheckCircle,
  FiTrendingUp,
  FiGift,
  FiChevronRight,
} from "react-icons/fi";

/* ---------------- helpers ---------------- */
function getAuthToken() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken");
}
function buildUsersUrl(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  return `users/${clean}`;
}
function explainAxiosError(e) {
  if (e?.response) {
    const msg =
      e.response.data?.message || e.response.statusText || "Request failed";
    return `API error (${e.response.status}): ${msg}`;
  }
  if (e?.request) return "No response from server. Check API URL / CORS / network.";
  return e?.message || "Unknown error";
}
function toIntOrNull(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  return i > 0 ? i : null;
}
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function maskId(v) {
  const s = String(v || "");
  if (s.length <= 8) return s;
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}

export default function Affiliate() {
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
      message:
        message || "Please login to view your affiliate progress and claim rewards.",
    });
    setLoginModalOpen(true);
  }, []);
  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);

  // profile (we need id)
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // ui state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ heists dropdown
  const [heists, setHeists] = useState([]);
  const [heistsLoading, setHeistsLoading] = useState(false);
  const [heistsError, setHeistsError] = useState("");
  const [selectedHeistId, setSelectedHeistId] = useState("");

  // progress response
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [progress, setProgress] = useState(null);

  // claim response
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const [claimErr, setClaimErr] = useState("");

  // copy toast-ish
  const [info, setInfo] = useState("");

  const myUserId = profile?.id; // backend returns id in /profile
  const myUsername = profile?.username || "—";

  // build affiliate link:
  // backend route: GET /api/users/heist/affiliate/:heistId/:referrerId
  // redirects to /pages/affilate-h.html?heist=...&ref=...
  const apiBase = String(api?.defaults?.baseURL || "").replace(/\/+$/, "");
  const heistIdNum = useMemo(() => toIntOrNull(selectedHeistId), [selectedHeistId]);

  const affiliateLink = useMemo(() => {
    if (!apiBase) return "";
    if (!myUserId || !heistIdNum) return "";
    return `${apiBase}/users/heist/affiliate/${heistIdNum}/${myUserId}`;
  }, [apiBase, myUserId, heistIdNum]);

  const progressPct = useMemo(() => {
    const referred = Number(progress?.referredUsers || 0);
    const target = Number(progress?.targetUsers || 0);
    if (!target) return 0;
    return clamp(Math.round((referred / target) * 100), 0, 100);
  }, [progress]);

  const fetchProfile = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      openLoginModal("Login required", "Login to use the affiliate system.");
      setProfile(null);
      return null;
    }
    setProfileLoading(true);
    try {
      const { data } = await api.get(buildUsersUrl("profile"));
      setProfile(data || null);
      return data || null;
    } finally {
      setProfileLoading(false);
    }
  }, [openLoginModal]);

  // ✅ load heists list from /api/heists/available
  const fetchAvailableHeists = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setHeists([]);
      setHeistsError("");
      return [];
    }

    setHeistsLoading(true);
    setHeistsError("");

    try {
      // api base likely already includes "/api"
      const { data } = await api.get("/heists/heists/available");
      const arr = Array.isArray(data?.heists) ? data.heists : [];
      setHeists(arr);
      return arr;
    } catch (e) {
      setHeists([]);
      setHeistsError(explainAxiosError(e));
      return [];
    } finally {
      setHeistsLoading(false);
    }
  }, []);

  const fetchProgress = useCallback(
    async (heistId) => {
      const token = getAuthToken();
      if (!token) {
        openLoginModal("Login required", "Login to view affiliate progress.");
        return null;
      }

      setProgressLoading(true);
      setProgressError("");
      setProgress(null);
      setClaimMsg("");
      setClaimErr("");

      try {
        const { data } = await api.get(buildUsersUrl(`heist/affiliate/progress/${heistId}`));
        setProgress(data || null);
        return data || null;
      } catch (e) {
        setProgressError(explainAxiosError(e));
        return null;
      } finally {
        setProgressLoading(false);
      }
    },
    [openLoginModal]
  );

  const claimReward = useCallback(
    async (heistId) => {
      const token = getAuthToken();
      if (!token) {
        openLoginModal("Login required", "Login to claim affiliate rewards.");
        return;
      }

      setClaimLoading(true);
      setClaimMsg("");
      setClaimErr("");

      try {
        const { data } = await api.post(buildUsersUrl(`heist/affiliate/claim/${heistId}`));
        const msg = data?.message || "Claim processed.";
        setClaimMsg(msg);

        // refresh progress after claim
        await fetchProgress(heistId);
      } catch (e) {
        const server = e?.response?.data || {};
        setClaimErr(server?.message || e?.message || "Claim failed");
      } finally {
        setClaimLoading(false);
      }
    },
    [openLoginModal, fetchProgress]
  );

  const init = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await fetchProfile();
      const hs = await fetchAvailableHeists();

      // auto-select: prefer started & unlocked, else first
      if (hs?.length) {
        const startedUnlocked = hs.find(
          (h) => String(h.status) === "started" && !h.submissions_locked && !h.ended
        );
        const pick = startedUnlocked || hs[0];
        setSelectedHeistId(String(pick.id));
      }
    } catch (e) {
      setError(explainAxiosError(e));
    } finally {
      setLoading(false);
    }
  }, [fetchProfile, fetchAvailableHeists]);

  useEffect(() => {
    init();
  }, [init]);

  const onRefresh = useCallback(async () => {
    await init();
    if (heistIdNum) await fetchProgress(heistIdNum);
  }, [init, heistIdNum, fetchProgress]);

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

  const onCheck = useCallback(async () => {
    const hid = toIntOrNull(selectedHeistId);
    if (!hid) {
      setProgressError("Select a heist");
      return;
    }
    await fetchProgress(hid);
  }, [selectedHeistId, fetchProgress]);

  const canClaim = useMemo(() => {
    const referred = Number(progress?.referredUsers || 0);
    const target = Number(progress?.targetUsers || 0);
    return target > 0 && referred >= target;
  }, [progress]);

  const selectedHeist = useMemo(() => {
    return heists.find((h) => String(h.id) === String(selectedHeistId)) || null;
  }, [heists, selectedHeistId]);

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
                <FiUsers />
              </div>

              <div className={styles.heroMain}>
                <div className={styles.heroTitle}>Affiliate (Heist Referrals)</div>
                <div className={styles.heroSub}>
                  Share your link, hit the target, and claim bid points.
                </div>

                <div className={styles.pills}>
                  <div className={styles.pill}>
                    <FiTrendingUp />
                    <span>
                      User: <b>{myUsername}</b> • ID:{" "}
                      <b>{myUserId ? maskId(myUserId) : "—"}</b>
                    </span>
                  </div>

                  {info ? (
                    <div className={styles.pillAlt}>
                      <FiCheckCircle />
                      <span>{info}</span>
                    </div>
                  ) : (
                    <div className={styles.pillAlt}>
                      <FiLink />
                      <span>Copy link & track progress</span>
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

            <div className={styles.tools}>
              <div className={styles.toolLeft}>
                <div className={styles.label}>Select Heist</div>

                <select
                  className={styles.select}
                  value={selectedHeistId}
                  onChange={(e) => {
                    setSelectedHeistId(e.target.value);
                    setProgress(null);
                    setProgressError("");
                    setClaimErr("");
                    setClaimMsg("");
                  }}
                  disabled={heistsLoading}
                >
                  <option value="">
                    {heistsLoading ? "Loading heists..." : "Choose a heist"}
                  </option>

                  {heists.map((h) => {
                    const locked = !!h.submissions_locked || !!h.ended;
                    const label = `${h.name} • ${String(h.status || "").toUpperCase()} • ${
                      h.participantsProgress || ""
                    }`;
                    return (
                      <option key={h.id} value={String(h.id)} disabled={locked}>
                        {locked ? `${label} • LOCKED` : label}
                      </option>
                    );
                  })}
                </select>

                {heistsError ? (
                  <div className={styles.miniErr}>
                    <FiAlertTriangle style={{ marginRight: 6 }} />
                    {heistsError}
                  </div>
                ) : null}

                {selectedHeist ? (
                  <div className={styles.heistMeta}>
                    <div className={styles.metaRow}>
                      <span>Status:</span>
                      <b className={styles.badge}>
                        {String(selectedHeist.status || "").toUpperCase()}
                      </b>
                      <span className={styles.dot} />
                      <span>Participants:</span>
                      <b>{selectedHeist.participantsProgress || "—"}</b>
                    </div>

                    <div className={styles.metaSub}>
                      Prize: <b>{selectedHeist.prize_name || "—"}</b>
                      {selectedHeist.submissions_locked ? (
                        <span className={styles.locked}> • submissions locked</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className={styles.toolRight}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={onCheck}
                  disabled={progressLoading || !heistIdNum}
                >
                  Check progress <FiChevronRight style={{ marginLeft: 8 }} />
                </button>
              </div>
            </div>

            <div className={styles.linkBox}>
              <div className={styles.linkTop}>
                <div className={styles.linkTitle}>Your affiliate link</div>
                <div className={styles.linkSub}>
                  Anyone who opens this link gets redirected to your public affiliate page.
                </div>
              </div>

              <div className={styles.linkRow}>
                <div className={styles.linkValue} title={affiliateLink || ""}>
                  {affiliateLink || "Select a heist to generate your link."}
                </div>

                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => copyText(affiliateLink)}
                  disabled={!affiliateLink}
                  title="Copy link"
                >
                  <FiCopy style={{ marginRight: 8 }} />
                  Copy
                </button>
              </div>

              <div className={styles.softNote}>
                Note: This uses your backend redirect route:
                <code> /api/users/heist/affiliate/:heistId/:referrerId </code>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.body}>
        <div className={styles.container}>
          {loading || profileLoading ? (
            <SkeletonGrid count={6} />
          ) : progressLoading ? (
            <SkeletonGrid count={6} />
          ) : progressError ? (
            <div className={styles.stateCard}>
              <div className={styles.stateTop}>
                <div className={styles.stateIcon}>
                  <FiAlertTriangle />
                </div>
                <div>
                  <div className={styles.stateTitle}>Couldn’t load progress</div>
                  <div className={styles.stateSub}>Select a heist and try again.</div>
                </div>
              </div>

              {!isProd ? (
                <div className={styles.devHint}>
                  <span>Dev:</span> {String(progressError).slice(0, 240)}
                </div>
              ) : null}

              <div className={styles.stateActions}>
                <button type="button" className={styles.btnPrimary} onClick={onCheck}>
                  <FiRefreshCw style={{ marginRight: 8 }} />
                  Try again
                </button>
              </div>
            </div>
          ) : !progress ? (
            <div className={styles.stateCard}>
              <div className={styles.stateTop}>
                <div className={styles.stateIcon}>
                  <FiUsers />
                </div>
                <div>
                  <div className={styles.stateTitle}>Check your referral progress</div>
                  <div className={styles.stateSub}>
                    Select a heist above and press <b>Check progress</b>.
                  </div>
                </div>
              </div>

              <div className={styles.stateActions}>
                <button type="button" className={styles.btnPrimary} onClick={onCheck}>
                  Check progress
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.gridTwo}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Progress</div>
                  <div className={styles.cardSub}>
                    {progress?.message || "Referral progress"}
                  </div>
                </div>

                <div className={styles.statsRow}>
                  <div className={styles.stat}>
                    <div className={styles.statLabel}>Referred</div>
                    <div className={styles.statValue}>
                      {Number(progress.referredUsers || 0)}
                    </div>
                  </div>
                  <div className={styles.stat}>
                    <div className={styles.statLabel}>Target</div>
                    <div className={styles.statValue}>
                      {Number(progress.targetUsers || 0)}
                    </div>
                  </div>
                  <div className={styles.stat}>
                    <div className={styles.statLabel}>Remaining</div>
                    <div className={styles.statValue}>
                      {Number(progress.remainingReferrals || 0)}
                    </div>
                  </div>
                </div>

                <div className={styles.progressWrap}>
                  <div className={styles.progressTop}>
                    <div className={styles.progressLabel}>
                      Progress: <b>{progress.progressDisplay}</b>
                    </div>
                    <div className={styles.progressPct}>{progressPct}%</div>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {claimErr ? <div className={styles.alertErr}>{claimErr}</div> : null}
                {claimMsg ? <div className={styles.alertOk}>{claimMsg}</div> : null}

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={() => claimReward(heistIdNum)}
                    disabled={claimLoading || !heistIdNum || !canClaim}
                    title={!canClaim ? "Reach the target to claim" : "Claim reward"}
                  >
                    <FiGift style={{ marginRight: 8 }} />
                    {claimLoading ? "Claiming..." : "Claim reward"}
                  </button>

                  <button type="button" className={styles.btnGhost} onClick={onRefresh}>
                    <FiRefreshCw style={{ marginRight: 8 }} />
                    Refresh
                  </button>
                </div>

                <div className={styles.softNote}>
                  Claiming grants bid points and subtracts one target “block” from your
                  progress (so you can claim again after another full target).
                </div>
              </div>

              <div className={styles.sideCard}>
                <div className={styles.sideTitle}>How it works</div>
                <ul className={styles.sideList}>
                  <li>Select a heist.</li>
                  <li>Copy and share your affiliate link.</li>
                  <li>When referrals reach target, claim reward.</li>
                  <li>After claim, your progress reduces by the target block.</li>
                </ul>

                <div className={styles.sideMini}>
                  Tip: use “Copy” and share via WhatsApp / Telegram / X.
                </div>
              </div>
            </div>
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