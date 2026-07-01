// src/pages/Trade/Trade.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./Trade.module.css";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import LoginRequiredModal from "../../components/LoginRequiredModal/LoginRequiredModal";
import SkeletonGrid from "../../components/SkeletonGrid/SkeletonGrid";
import { api } from "../../lib/api";

import {
  FiSend,
  FiCopy,
  FiRefreshCw,
  FiAlertTriangle,
  FiUser,
  FiHash,
  FiLock,
  FiClock,
  FiArrowUpRight,
  FiArrowDownLeft,
  FiList,
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
function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function parseIntSafe(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  return i > 0 ? i : null;
}
function maskWallet(w) {
  const s = String(w || "");
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}...${s.slice(-6)}`;
}

export default function Trade() {
  const isProd =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.MODE === "production") ||
    process.env.NODE_ENV === "production";

  // login required modal
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalMeta, setLoginModalMeta] = useState({ title: "", message: "" });
  const openLoginModal = useCallback((title, message) => {
    setLoginModalMeta({
      title: title || "Login required",
      message: message || "Please login to access Trade features.",
    });
    setLoginModalOpen(true);
  }, []);
  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);

  // page state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // profile
  const [profile, setProfile] = useState(null);
  const myWallet = profile?.wallet_address || "";
  const myUsername = profile?.username || "—";
  const myBidPoints = safeNum(profile?.bid_points, 0);

  // tabs
  const [tab, setTab] = useState("send"); // send | history

  // send form
  const [recipientWallet, setRecipientWallet] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendOk, setSendOk] = useState("");

  // transactions
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState("");
  const [transactions, setTransactions] = useState([]);

  /* ---------------- fetchers ---------------- */

  const fetchProfile = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      openLoginModal("Login required", "Please login to use Trade.");
      return null;
    }
    const { data } = await api.get(buildUsersUrl("profile"));
    setProfile(data || null);
    return data || null;
  }, [openLoginModal]);

  const fetchTransactions = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return [];
    setTxLoading(true);
    setTxError("");
    try {
      const { data } = await api.get(buildUsersUrl("transactions"));
      const arr = Array.isArray(data) ? data : [];
      setTransactions(arr);
      return arr;
    } catch (e) {
      setTxError(explainAxiosError(e));
      setTransactions([]);
      return [];
    } finally {
      setTxLoading(false);
    }
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    setError("");
    setSendError("");
    setSendOk("");
    try {
      await fetchProfile();
      await fetchTransactions();
    } catch (e) {
      setError(explainAxiosError(e));
    } finally {
      setLoading(false);
    }
  }, [fetchProfile, fetchTransactions]);

  useEffect(() => {
    init();
  }, [init]);

  const onRefresh = useCallback(async () => {
    await init();
  }, [init]);

  /* ---------------- derived ---------------- */

  const canSend = useMemo(() => {
    const amt = parseIntSafe(amount);
    if (!recipientWallet.trim()) return false;
    if (!amt) return false;
    if (!String(pin || "").trim()) return false;
    if (myWallet && recipientWallet.trim() === myWallet.trim()) return false;
    if (amt > myBidPoints) return false;
    return true;
  }, [recipientWallet, amount, pin, myWallet, myBidPoints]);

  const txCount = transactions.length;

  /* ---------------- actions ---------------- */

  const copyMyWallet = useCallback(async () => {
    if (!myWallet) return;
    try {
      await navigator.clipboard.writeText(String(myWallet));
      setSendOk("Wallet copied.");
      setTimeout(() => setSendOk(""), 1400);
    } catch {
      // ignore
    }
  }, [myWallet]);

  const onSend = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      openLoginModal("Login required", "You must login to send copup coin.");
      return;
    }

    setSendOk("");
    setSendError("");

    const amt = parseIntSafe(amount);
    if (!recipientWallet.trim() || !pin.trim()) {
      setSendError("recipientWallet and pin are required");
      return;
    }
    if (!amt) {
      setSendError("Amount must be a positive integer");
      return;
    }
    if (recipientWallet.trim() === myWallet.trim()) {
      setSendError("You cannot send points to yourself");
      return;
    }
    if (amt > myBidPoints) {
      setSendError("Insufficient copup coin");
      return;
    }

    setSendLoading(true);
    try {
      const payload = {
        recipientWallet: recipientWallet.trim(),
        amount: amt,
        pin: pin.trim(),
      };

      const { data } = await api.post(buildUsersUrl("send-bid-points"), payload);

      setSendOk(data?.message || "copup coin sent successfully.");
      setRecipientWallet("");
      setAmount("");
      setPin("");

      // refresh profile + tx
      await Promise.all([fetchProfile(), fetchTransactions()]);
      setTab("history");
    } catch (e) {
      const server = e?.response?.data || {};
      setSendError(server?.message || e?.message || "Error sending copup coin");
    } finally {
      setSendLoading(false);
    }
  }, [
    recipientWallet,
    amount,
    pin,
    myWallet,
    myBidPoints,
    openLoginModal,
    fetchProfile,
    fetchTransactions,
  ]);

  const clearForm = useCallback(() => {
    setRecipientWallet("");
    setAmount("");
    setPin("");
    setSendError("");
    setSendOk("");
  }, []);

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
                <FiSend />
              </div>

              <div className={styles.heroMain}>
                <div className={styles.heroTitle}>Trade (copup coin)</div>
                <div className={styles.heroSub}>
                  Send copup coin instantly to another wallet. No charge.
                </div>

                <div className={styles.pills}>
                  <div className={styles.pill}>
                    <FiUser />
                    <span>
                      {myUsername} • <b>{myBidPoints}</b> points
                    </span>
                  </div>

                  <div className={styles.pill}>
                    <FiHash />
                    <span title={myWallet || ""}>
                      My Wallet: <b>{myWallet ? maskWallet(myWallet) : "—"}</b>
                    </span>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={copyMyWallet}
                      disabled={!myWallet}
                      title="Copy wallet"
                    >
                      <FiCopy />
                    </button>
                  </div>

                  <div className={styles.pillAlt}>
                    <FiList />
                    <span>
                      History: <b>{txCount}</b>
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.heroActions}>
                <button type="button" className={styles.btnPrimary} onClick={onRefresh} disabled={loading}>
                  <FiRefreshCw style={{ marginRight: 8 }} />
                  Refresh
                </button>

                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => (window.location.href = "/")}
                  title="Back"
                >
                  Back
                </button>
              </div>
            </div>

            {!isProd && error ? (
              <div className={styles.devHint}>
                <span>Dev:</span> {String(error).slice(0, 240)}
              </div>
            ) : null}

            {/* tabs */}
            <div className={styles.tabs}>
              <button
                type="button"
                className={tab === "send" ? styles.tabActive : styles.tab}
                onClick={() => setTab("send")}
              >
                <FiSend style={{ marginRight: 8 }} /> Send
              </button>
              <button
                type="button"
                className={tab === "history" ? styles.tabActive : styles.tab}
                onClick={() => setTab("history")}
              >
                <FiClock style={{ marginRight: 8 }} /> History
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.body}>
        <div className={styles.container}>
          {error ? (
            <div className={styles.stateCard}>
              <div className={styles.stateTop}>
                <div className={styles.stateIcon}>
                  <FiAlertTriangle />
                </div>
                <div>
                  <div className={styles.stateTitle}>We couldn’t load Trade</div>
                  <div className={styles.stateSub}>Please try again.</div>
                </div>
              </div>

              <div className={styles.stateActions}>
                <button type="button" className={styles.btnPrimary} onClick={init}>
                  <FiRefreshCw style={{ marginRight: 8 }} />
                  Try again
                </button>
              </div>
            </div>
          ) : loading ? (
            <SkeletonGrid count={6} />
          ) : tab === "send" ? (
            <div className={styles.gridTwo}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Send copup coin</div>
                  <div className={styles.cardSub}>
                    Enter recipient wallet address, amount, and your PIN.
                  </div>
                </div>

                <div className={styles.form}>
                  <label className={styles.field}>
                    <span className={styles.label}>
                      <FiHash /> Recipient wallet address
                    </span>
                    <input
                      className={styles.input}
                      value={recipientWallet}
                      onChange={(e) => setRecipientWallet(e.target.value)}
                      placeholder="Paste recipient wallet address"
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>
                      <FiArrowUpRight /> Amount (points)
                    </span>
                    <input
                      className={styles.input}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g., 50"
                      inputMode="numeric"
                    />
                    <div className={styles.hint}>
                      Available: <b>{myBidPoints}</b> points
                    </div>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>
                      <FiLock /> PIN
                    </span>
                    <input
                      className={styles.input}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="Your PIN"
                      inputMode="numeric"
                    />
                    {profile?.has_pin === 0 ? (
                      <div className={styles.warn}>
                        You don’t have a PIN set on your account.
                      </div>
                    ) : null}
                  </label>

                  {sendError ? <div className={styles.alertErr}>{sendError}</div> : null}
                  {sendOk ? <div className={styles.alertOk}>{sendOk}</div> : null}

                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      onClick={onSend}
                      disabled={sendLoading || !canSend}
                      title={!canSend ? "Fill valid fields to send" : "Send points"}
                    >
                      <FiSend style={{ marginRight: 8 }} />
                      {sendLoading ? "Sending..." : "Send points"}
                    </button>

                    <button type="button" className={styles.btnGhost} onClick={clearForm}>
                      Clear
                    </button>
                  </div>

                  <div className={styles.softNote}>
                    This transfer is logged in <code>transactions</code>. No fee is charged.
                  </div>
                </div>
              </div>

              <div className={styles.sideCard}>
                <div className={styles.sideTitle}>Safety tips</div>
                <ul className={styles.sideList}>
                  <li>Double-check the wallet address before sending.</li>
                  <li>Never share your PIN with anyone.</li>
                  <li>If a transfer fails, refresh and try again.</li>
                </ul>

                <div className={styles.sideMini}>
                  <b>Tip:</b> Copy your wallet above to receive points.
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>Transaction history</div>
                <div className={styles.cardSub}>
                  Incoming and outgoing copup coin transfers.
                </div>
              </div>

              {txError ? (
                <div className={styles.alertErr}>{txError}</div>
              ) : txLoading ? (
                <SkeletonGrid count={6} />
              ) : transactions.length === 0 ? (
                <div className={styles.emptyMini}>No transactions yet.</div>
              ) : (
                <div className={styles.txList}>
                  {transactions.map((t) => {
                    const isOut = String(t.sender || "") === String(myUsername || "");
                    return (
                      <div className={styles.txRow} key={t.id}>
                        <div className={isOut ? styles.txIconOut : styles.txIconIn}>
                          {isOut ? <FiArrowUpRight /> : <FiArrowDownLeft />}
                        </div>

                        <div className={styles.txMain}>
                          <div className={styles.txTop}>
                            <div className={styles.txTitle}>
                              {isOut ? "Sent" : "Received"}{" "}
                              <b>{safeNum(t.amount, 0)}</b> points
                            </div>
                            <div className={styles.txTime}>
                              {t.timestamp_local || t.timestamp}
                            </div>
                          </div>
                          <div className={styles.txSub}>
                            From <b>{t.sender}</b> → To <b>{t.recipient}</b>
                          </div>
                        </div>

                        <div className={styles.txBadge}>
                          {isOut ? "outgoing" : "incoming"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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