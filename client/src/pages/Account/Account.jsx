// src/pages/Account/Account.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "./Account.module.css";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";

import coinImg from "../../assets/copupcoin.png";
import { api } from "../../lib/api";
import { useToast } from "../../components/Toast/ToastContext.jsx";

import {
  FiArrowLeft,
  FiPlus,
  FiMinus,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiCopy,
  FiCheck,
  FiUpload,
  FiChevronDown,
} from "react-icons/fi";

function getAuthToken() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken");
}

function formatNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

function clampTab(tab) {
  return tab === "withdraw" ? "withdraw" : "deposit";
}

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeDate(v) {
  try {
    if (!v) return "—";
    return new Date(v).toLocaleString();
  } catch {
    return "—";
  }
}

function statusTone(s) {
  const v = String(s || "").toLowerCase();
  if (v.includes("success") || v.includes("approved")) return "ok";
  if (v.includes("fail") || v.includes("reject")) return "bad";
  return "pending";
}

const NIGERIA_BANKS = [
  "OPay",
  "PalmPay",
  "Kuda",
  "Moniepoint",
  "GTBank",
  "Access Bank",
  "Zenith Bank",
  "First Bank",
  "UBA",
  "Fidelity Bank",
  "Union Bank",
  "Sterling Bank",
  "Wema Bank",
  "FCMB",
  "Stanbic IBTC",
  "Providus Bank",
  "Keystone Bank",
  "Polaris Bank",
  "Jaiz Bank",
  "SunTrust Bank",
  "Globus Bank",
  "Titan Trust Bank",
  "Ecobank",
];

function BankSelect({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const label = value ? String(value) : "Select bank";

  const filteredBanks = useMemo(() => {
    const s = String(q || "").trim().toLowerCase();
    if (!s) return NIGERIA_BANKS;
    return NIGERIA_BANKS.filter((b) => String(b).toLowerCase().includes(s));
  }, [q]);

  return (
    <div className={styles.selectWrap} ref={ref}>
      <button
        type="button"
        className={styles.selectBtn}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open ? "true" : "false"}
      >
        <span className={styles.selectLabel}>{label}</span>
        <span className={styles.selectIcon}>
          <FiChevronDown />
        </span>
      </button>

      {open ? (
        <div className={styles.selectMenu} role="listbox">
          <div className={styles.selectSearchWrap}>
            <input
              ref={inputRef}
              className={styles.selectSearchInput}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search bank…"
              disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
            />
          </div>

          {filteredBanks.length === 0 ? (
            <div className={styles.selectEmpty}>No bank found.</div>
          ) : (
            filteredBanks.map((b) => {
              const active = String(b) === String(value || "");
              return (
                <button
                  type="button"
                  key={b}
                  className={`${styles.selectOption} ${active ? styles.selectOptionActive : ""}`}
                  onClick={() => {
                    onChange?.(b);
                    setOpen(false);
                  }}
                  role="option"
                  aria-selected={active ? "true" : "false"}
                >
                  {b}
                  {active ? <FiCheck /> : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function Account() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const token = useMemo(() => getAuthToken(), []);
  const isLoggedIn = !!token;

  const initialTab = useMemo(
    () => clampTab(searchParams.get("tab")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [tab, setTab] = useState(initialTab);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);

  // Deposit method
  const [depositMethod, setDepositMethod] = useState("flutterwave");

  // Flutterwave deposit state
  const [fwCoins, setFwCoins] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositErr, setDepositErr] = useState("");

  // Manual deposit state
  const [manualCoins, setManualCoins] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [manualProof, setManualProof] = useState(null);
  const [manualConfirm, setManualConfirm] = useState(false); // ✅ NEW
  const [manualLoading, setManualLoading] = useState(false);
  const [manualErr, setManualErr] = useState("");
  const [manualOk, setManualOk] = useState("");

  // Pay account (manual transfer display)
  const [payAccount, setPayAccount] = useState(null);
  const [payAccountLoading, setPayAccountLoading] = useState(false);

  // Rate
  const [rate, setRate] = useState({ unit: 0, price: 0, currency: "NGN" });
  const [rateLoading, setRateLoading] = useState(false);

  // Purchases history
  const [purchases, setPurchases] = useState([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  // Withdraw form
  const [wdCoins, setWdCoins] = useState("");
  const [wdAccountName, setWdAccountName] = useState("");
  const [wdAccountNumber, setWdAccountNumber] = useState("");
  const [wdBank, setWdBank] = useState("");
  const [wdLoading, setWdLoading] = useState(false);
  const [wdErr, setWdErr] = useState("");
  const [wdOk, setWdOk] = useState("");

  // Withdraw history
  const [payouts, setPayouts] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);

  const syncUrl = useCallback(
    (nextTab) => {
      const t = clampTab(nextTab);
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set("tab", t);
        return p;
      });
    },
    [setSearchParams]
  );

  useEffect(() => {
    const t = clampTab(searchParams.get("tab"));
    setTab(t);
  }, [searchParams]);

  const fetchProfile = useCallback(async () => {
    if (!isLoggedIn) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    try {
      const { data } = await api.get("/users/profile");
      setProfile(data);

      if (data?.bid_points !== undefined) {
        localStorage.setItem("copup_bid_points", String(data.bid_points ?? 0));
      }
      if (data?.task_coin !== undefined) {
        localStorage.setItem("copup_task_coin", String(data.task_coin ?? 0));
      }
    } catch (e) {
      console.error("Account profile error:", e);
      setProfile(null);
      toast.error(e?.response?.data?.message || e?.message || "Failed to fetch profile");
    } finally {
      setLoadingProfile(false);
    }
  }, [isLoggedIn, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const fetchCoinRate = useCallback(async () => {
    if (!isLoggedIn) return;
    setRateLoading(true);
    try {
      const { data } = await api.get("/users/coin-rate");
      setRate({
        unit: safeNumber(data?.unit, 0),
        price: safeNumber(data?.price, 0),
        currency: data?.currency || "NGN",
      });
    } catch (e) {
      console.error("coin-rate error:", e);
      setRate({ unit: 0, price: 0, currency: "NGN" });
    } finally {
      setRateLoading(false);
    }
  }, [isLoggedIn]);

  const fetchPurchases = useCallback(async () => {
    if (!isLoggedIn) return;
    setPurchasesLoading(true);
    try {
      const { data } = await api.get("/users/purchases");
      setPurchases(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("purchases error:", e);
      setPurchases([]);
    } finally {
      setPurchasesLoading(false);
    }
  }, [isLoggedIn]);

  const fetchPayAccount = useCallback(async () => {
    if (!isLoggedIn) return;
    setPayAccountLoading(true);
    try {
      const { data } = await api.get("/users/pay-account");
      setPayAccount(data || null);
    } catch (e) {
      setPayAccount(null);
    } finally {
      setPayAccountLoading(false);
    }
  }, [isLoggedIn]);

  const fetchPayouts = useCallback(async () => {
    if (!isLoggedIn) return;
    setPayoutsLoading(true);
    try {
      const { data } = await api.get("/users/payouts");
      setPayouts(Array.isArray(data) ? data : []);
    } catch (e) {
      setPayouts([]);
    } finally {
      setPayoutsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (tab === "deposit") {
      fetchCoinRate();
      fetchPurchases();
      fetchPayAccount();
    }
    if (tab === "withdraw") {
      fetchPayouts();
    }
  }, [tab, fetchCoinRate, fetchPurchases, fetchPayAccount, fetchPayouts]);

  const displayName =
    profile?.full_name || profile?.username || (isLoggedIn ? "User" : "Guest");

  const bidPoints = Number(profile?.bid_points ?? 0);
  const taskCoin = Number(profile?.task_coin ?? 0);

  const onTab = useCallback(
    (next) => {
      const t = clampTab(next);
      setTab(t);
      syncUrl(t);
    },
    [syncUrl]
  );

  const copyText = useCallback(
    async (text, label = "Copied") => {
      try {
        await navigator.clipboard.writeText(String(text || ""));
        toast.success(`${label} to clipboard.`);
      } catch (e) {
        toast.error("Copy failed. Please try again.");
      }
    },
    [toast]
  );

  // Flutterwave estimate
  const estimatedAmountFromCoins = useMemo(() => {
    const coins = safeNumber(fwCoins, 0);
    const unit = safeNumber(rate.unit, 0);
    const price = safeNumber(rate.price, 0);
    if (!(coins > 0) || !(unit > 0) || !(price > 0)) return 0;
    return Math.ceil((coins / unit) * price);
  }, [fwCoins, rate.unit, rate.price]);

  // ✅ Manual estimate (same rate logic)
  const estimatedManualAmount = useMemo(() => {
    const coins = safeNumber(manualCoins, 0);
    const unit = safeNumber(rate.unit, 0);
    const price = safeNumber(rate.price, 0);
    if (!(coins > 0) || !(unit > 0) || !(price > 0)) return 0;
    return Math.ceil((coins / unit) * price);
  }, [manualCoins, rate.unit, rate.price]);

  // ✅ Reset confirm if input/rate changes
  useEffect(() => {
    setManualConfirm(false);
  }, [manualCoins, rate.unit, rate.price]);

  const startFlutterwaveDeposit = useCallback(async () => {
    setDepositErr("");

    const coins = Number(fwCoins);
    if (!Number.isInteger(coins) || coins <= 0) {
      setDepositErr("Enter a valid coin quantity.");
      toast.warning("Enter a valid coin quantity.");
      return;
    }

    const unit = safeNumber(rate.unit, 0);
    const price = safeNumber(rate.price, 0);
    if (!(unit > 0) || !(price > 0)) {
      setDepositErr("Rate is not available right now. Please refresh and try again.");
      toast.warning("Rate not available. Refresh and try again.");
      return;
    }

    const amt = Math.ceil((coins / unit) * price);
    if (!(amt > 0)) {
      setDepositErr("Invalid computed amount. Please try again.");
      toast.error("Invalid computed amount.");
      return;
    }

    setDepositLoading(true);
    try {
      const { data } = await api.post("/payment/copup/init", { amount_ngn: amt });

      if (!data?.ok || !data?.payment_link) {
        setDepositErr(data?.message || "Unable to start checkout.");
        toast.error(data?.message || "Unable to start checkout.");
        setDepositLoading(false);
        return;
      }

      toast.info("Opening secure checkout…");
      window.location.href = data.payment_link;
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Error initiating checkout.";
      setDepositErr(msg);
      toast.error(msg);
      setDepositLoading(false);
    }
  }, [fwCoins, rate.unit, rate.price, toast]);

  // ✅ Manual purchase submit (with amount + confirmation)
  const submitManualDeposit = useCallback(async () => {
    setManualErr("");
    setManualOk("");

    const coins = Number(manualCoins);
    if (!Number.isInteger(coins) || coins <= 0) {
      setManualErr("Coins must be a positive integer.");
      toast.warning("Coins must be a positive integer.");
      return;
    }

    const unit = safeNumber(rate.unit, 0);
    const price = safeNumber(rate.price, 0);
    if (!(unit > 0) || !(price > 0)) {
      setManualErr("Rate is not available right now. Please refresh and try again.");
      toast.warning("Rate not available. Refresh and try again.");
      return;
    }

    const amt = estimatedManualAmount;
    if (!(amt > 0)) {
      setManualErr("Unable to compute amount. Please re-enter coins.");
      toast.warning("Unable to compute amount.");
      return;
    }

    if (!manualConfirm) {
      const msg = "Please confirm the exact amount you will transfer.";
      setManualErr(msg);
      toast.warning(msg);
      return;
    }

    if (!manualProof) {
      setManualErr("Payment proof is required.");
      toast.warning("Payment proof is required.");
      return;
    }

    setManualLoading(true);
    try {
      const fd = new FormData();
      fd.append("coins", String(coins));
      fd.append("amount_ngn", String(amt)); // ✅ NEW
      fd.append("currency", String(rate.currency || "NGN")); // ✅ NEW
      if (manualNote?.trim()) fd.append("user_note", manualNote.trim());
      fd.append("proof", manualProof);

      const { data } = await api.post("/users/purchases", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const msg = data?.message || "Purchase submitted. Awaiting admin approval.";
      setManualOk(msg);
      toast.success(msg);

      setManualCoins("");
      setManualNote("");
      setManualProof(null);
      setManualConfirm(false);

      fetchPurchases();
      fetchProfile();
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Error creating purchase request";
      setManualErr(msg);
      toast.error(msg);
    } finally {
      setManualLoading(false);
    }
  }, [
    manualCoins,
    manualNote,
    manualProof,
    manualConfirm,
    rate.unit,
    rate.price,
    rate.currency,
    estimatedManualAmount,
    fetchPurchases,
    fetchProfile,
    toast,
  ]);

  const submitWithdraw = useCallback(async () => {
    setWdErr("");
    setWdOk("");

    const bid_points = Number(wdCoins);
    if (!Number.isInteger(bid_points) || bid_points < 1) {
      const msg = "Minimum coin required is 1";
      setWdErr(msg);
      toast.warning(msg);
      return;
    }

    const account_name = String(wdAccountName || "").trim();
    const account_number = String(wdAccountNumber || "").trim();
    const bank_name = String(wdBank || "").trim();

    if (!account_name || !account_number || !bank_name) {
      const msg = "account_name, account_number and bank_name are required";
      setWdErr(msg);
      toast.warning("Fill account name, number, and bank.");
      return;
    }

    if (!/^\d{10}$/.test(account_number)) {
      const msg = "Account number must be 10 digits.";
      setWdErr(msg);
      toast.warning(msg);
      return;
    }

    setWdLoading(true);
    try {
      const { data } = await api.post("/users/payout", {
        bid_points,
        account_name,
        account_number,
        bank_name,
      });

      const msg = data?.message || "Payout request created successfully";
      setWdOk(msg);
      toast.success(msg);

      setWdCoins("");

      fetchProfile();
      fetchPayouts();
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to create payout request";
      setWdErr(msg);
      toast.error(msg);
    } finally {
      setWdLoading(false);
    }
  }, [
    wdCoins,
    wdAccountName,
    wdAccountNumber,
    wdBank,
    fetchProfile,
    fetchPayouts,
    toast,
  ]);

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} aria-hidden="true">
        <svg className={styles.bgSvg} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="agl1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="agl2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="agl3" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="18%" cy="24%" r="320" fill="url(#agl1)" className={styles.pulse1} />
          <circle cx="82%" cy="70%" r="260" fill="url(#agl2)" className={styles.pulse2} />
          <circle cx="62%" cy="16%" r="210" fill="url(#agl3)" className={styles.pulse3} />
        </svg>
      </div>

      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.topBar}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => navigate(-1)}
              title="Back"
            >
              <FiArrowLeft />
            </button>

            <div className={styles.titleWrap}>
              <div className={styles.kicker}>Account</div>
              <div className={styles.title}>{loadingProfile ? "Loading…" : displayName}</div>
            </div>

            <button
              type="button"
              className={styles.refreshBtn}
              onClick={() => {
                fetchProfile();
                if (tab === "deposit") {
                  fetchCoinRate();
                  fetchPurchases();
                  fetchPayAccount();
                }
                if (tab === "withdraw") fetchPayouts();
                toast.info("Refreshing…");
              }}
              title="Refresh"
              disabled={!isLoggedIn}
            >
              <FiRefreshCw />
            </button>
          </div>

          <div className={styles.walletCard}>
            <div className={styles.walletTop}>
              <div>
                <div className={styles.walletTitle}>Wallet Overview</div>
                <div className={styles.walletHint}>
                  {isLoggedIn
                    ? "Manage deposits and withdrawals."
                    : "Login to access deposits and withdrawals."}
                </div>
              </div>

              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setHideBalance((v) => !v)}
                title={hideBalance ? "Show balances" : "Hide balances"}
                disabled={!isLoggedIn}
              >
                {hideBalance ? <FiEye /> : <FiEyeOff />}
              </button>
            </div>

            <div className={styles.walletGrid}>
              <div className={styles.walletBox}>
                <div className={styles.walletLabel}>Task Coin</div>
                <div className={styles.walletValue}>
                  <img src={coinImg} alt="coin" className={styles.coinIcon} />
                  {hideBalance ? "••••" : formatNum(taskCoin)}
                </div>
              </div>

              <div className={styles.walletBox}>
                <div className={styles.walletLabel}>CopUp Coin</div>
                <div className={styles.walletValue}>
                  <img src={coinImg} alt="coin" className={styles.coinIcon} />
                  {hideBalance ? "••••" : formatNum(bidPoints)}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${tab === "deposit" ? styles.tabActive : ""}`}
              onClick={() => onTab("deposit")}
            >
              <FiPlus /> Deposit
            </button>

            <button
              type="button"
              className={`${styles.tab} ${tab === "withdraw" ? styles.tabActive : ""}`}
              onClick={() => onTab("withdraw")}
            >
              <FiMinus /> Withdraw
            </button>
          </div>

          <div className={styles.panel}>
            {!isLoggedIn ? (
              <div className={styles.locked}>
                <div className={styles.lockTitle}>You’re not logged in</div>
                <div className={styles.lockSub}>Please login to access Deposit and Withdraw.</div>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => navigate("/login")}
                >
                  Go to Login
                </button>
              </div>
            ) : tab === "deposit" ? (
              <div className={styles.panelInner}>
                <div className={styles.panelHead}>
                  <div className={styles.panelTitle}>Deposit</div>
                  <div className={styles.panelSub}>
                    Choose Instant Checkout (Flutterwave) or Manual Transfer (upload proof for
                    approval).
                  </div>
                </div>

                <div className={styles.methodTabs}>
                  <button
                    type="button"
                    className={`${styles.methodTab} ${
                      depositMethod === "flutterwave" ? styles.methodTabActive : ""
                    }`}
                    onClick={() => {
                      setDepositMethod("flutterwave");
                      setDepositErr("");
                      setManualErr("");
                      setManualOk("");
                    }}
                  >
                    Instant Checkout
                  </button>

                  <button
                    type="button"
                    className={`${styles.methodTab} ${
                      depositMethod === "manual" ? styles.methodTabActive : ""
                    }`}
                    onClick={() => {
                      setDepositMethod("manual");
                      setDepositErr("");
                      setManualErr("");
                      setManualOk("");
                      fetchPayAccount();
                    }}
                  >
                    Manual Transfer
                  </button>
                </div>

                {depositMethod === "flutterwave" ? (
                  <div className={styles.formCard}>
                    <div className={styles.rateRow}>
                      <div className={styles.rateTitle}>Current Rate</div>
                      <div className={styles.rateValue}>
                        {rateLoading ? (
                          "Loading…"
                        ) : rate.unit > 0 && rate.price > 0 ? (
                          <>
                            {formatNum(rate.unit)} coins / {formatNum(rate.price)}{" "}
                            {rate.currency || "NGN"}
                          </>
                        ) : (
                          "Not available"
                        )}
                      </div>
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formLabel}>CopUp Coins</div>
                      <input
                        className={styles.input}
                        value={fwCoins}
                        onChange={(e) =>
                          setFwCoins(e.target.value.replace(/[^\d]/g, "").slice(0, 10))
                        }
                        placeholder="e.g. 200"
                        inputMode="numeric"
                      />
                      <div className={styles.helper}>
                        You’ll pay:{" "}
                        <b>
                          {estimatedAmountFromCoins > 0
                            ? `${formatNum(estimatedAmountFromCoins)} ${rate.currency || "NGN"}`
                            : "—"}
                        </b>
                      </div>
                    </div>

                    {depositErr ? <div className={styles.errorBox}>{depositErr}</div> : null}

                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={startFlutterwaveDeposit}
                      disabled={depositLoading}
                    >
                      {depositLoading ? "Opening checkout…" : "Proceed to Secure Checkout"}
                    </button>

                    <div className={styles.formNote}>
                      You’ll be redirected to a secure checkout. After payment, you’ll return to the
                      payment result page.
                    </div>
                  </div>
                ) : (
                  <div className={styles.formCard}>
                    <div className={styles.payAccountCard}>
                      <div className={styles.payAccountTitle}>Transfer To</div>
                      {payAccountLoading ? (
                        <div className={styles.payAccountRow}>Loading payment account…</div>
                      ) : payAccount ? (
                        <>
                          <div className={styles.payAccountRow}>
                            <span className={styles.payKey}>Bank</span>
                            <span className={styles.payVal}>{payAccount.bank_name}</span>
                            <button
                              type="button"
                              className={styles.miniCopy}
                              onClick={() => copyText(payAccount.bank_name, "Bank name copied")}
                              title="Copy"
                            >
                              <FiCopy />
                            </button>
                          </div>

                          <div className={styles.payAccountRow}>
                            <span className={styles.payKey}>Account Name</span>
                            <span className={styles.payVal}>{payAccount.account_name}</span>
                            <button
                              type="button"
                              className={styles.miniCopy}
                              onClick={() =>
                                copyText(payAccount.account_name, "Account name copied")
                              }
                              title="Copy"
                            >
                              <FiCopy />
                            </button>
                          </div>

                          <div className={styles.payAccountRow}>
                            <span className={styles.payKey}>Account Number</span>
                            <span className={styles.payVal}>{payAccount.account_number}</span>
                            <button
                              type="button"
                              className={styles.miniCopy}
                              onClick={() =>
                                copyText(payAccount.account_number, "Account number copied")
                              }
                              title="Copy"
                            >
                              <FiCopy />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className={styles.payAccountRow}>Payment account not available.</div>
                      )}
                      <div className={styles.payAccountHint}>
                        Make transfer, then upload proof below for approval.
                      </div>
                    </div>

                    {/* ✅ Manual coins + computed amount + confirmation */}
                    <div className={styles.formRow}>
                      <div className={styles.formLabel}>Coins to Buy</div>
                      <input
                        className={styles.input}
                        value={manualCoins}
                        onChange={(e) =>
                          setManualCoins(e.target.value.replace(/[^\d]/g, "").slice(0, 10))
                        }
                        placeholder="e.g. 200"
                        inputMode="numeric"
                      />

                      <div className={styles.helper}>
                        You’ll pay:{" "}
                        <b>
                          {estimatedManualAmount > 0
                            ? `${formatNum(estimatedManualAmount)} ${rate.currency || "NGN"}`
                            : rateLoading
                            ? "Loading rate…"
                            : "—"}
                        </b>

                        <div style={{ marginTop: 6 }}>
                          Submit proof after transfer. Admin will approve and credit your coins.
                        </div>
                      </div>

                      <label className={styles.confirmRow}>
                        <input
                          type="checkbox"
                          checked={manualConfirm}
                          onChange={(e) => setManualConfirm(e.target.checked)}
                          disabled={manualLoading || !(estimatedManualAmount > 0)}
                        />
                        <span>
                          I confirm I will transfer exactly{" "}
                          <b>
                            {estimatedManualAmount > 0
                              ? `${formatNum(estimatedManualAmount)} ${rate.currency || "NGN"}`
                              : "—"}
                          </b>
                        </span>
                      </label>

                      {estimatedManualAmount > 0 ? (
                        <div className={styles.amountActions}>
                          <button
                            type="button"
                            className={styles.ghostBtn}
                            onClick={() =>
                              copyText(
                                String(estimatedManualAmount),
                                "Amount copied"
                              )
                            }
                            disabled={manualLoading}
                          >
                            <FiCopy /> Copy Amount
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formLabel}>Note (optional)</div>
                      <input
                        className={styles.input}
                        value={manualNote}
                        onChange={(e) => setManualNote(e.target.value.slice(0, 120))}
                        placeholder="e.g. Paid from GTBank, 2:15PM"
                      />
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formLabel}>Upload Proof</div>

                      <label className={styles.uploadBox}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setManualProof(e.target.files?.[0] || null)}
                          className={styles.fileInput}
                        />
                        <span className={styles.uploadIcon}>
                          <FiUpload />
                        </span>
                        <span className={styles.uploadText}>
                          {manualProof ? manualProof.name : "Choose an image (proof)"}
                        </span>
                      </label>

                      {manualProof ? (
                        <div className={styles.miniRow}>
                          <button
                            type="button"
                            className={styles.ghostBtn}
                            onClick={() => {
                              setManualProof(null);
                              toast.info("Proof removed.");
                            }}
                          >
                            Remove file
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {manualErr ? <div className={styles.errorBox}>{manualErr}</div> : null}
                    {manualOk ? <div className={styles.okBox}>{manualOk}</div> : null}

                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={submitManualDeposit}
                      disabled={manualLoading || !manualConfirm || !(estimatedManualAmount > 0)}
                    >
                      {manualLoading ? "Submitting…" : "Submit Manual Deposit"}
                    </button>

                    <div className={styles.formNote}>
                      Status will be <b>pending</b> until an admin approves it.
                    </div>
                  </div>
                )}

                <div className={styles.historyCard}>
                  <div className={styles.historyTop}>
                    <div className={styles.historyTitle}>My Deposits</div>
                    <button type="button" className={styles.ghostBtn} onClick={fetchPurchases}>
                      <FiRefreshCw /> Refresh
                    </button>
                  </div>

                  {purchasesLoading ? (
                    <div className={styles.historyEmpty}>Loading…</div>
                  ) : purchases.length === 0 ? (
                    <div className={styles.historyEmpty}>No deposit requests yet.</div>
                  ) : (
                    <div className={styles.historyList}>
                      {purchases.map((p) => {
                        const tone = statusTone(p.status);
                        return (
                          <div className={styles.historyItem} key={p.id}>
                            <div className={styles.historyRow1}>
                              <div className={styles.historyLeft}>
                                <div className={styles.hCoins}>{formatNum(p.coins)} coins</div>
                                <div className={styles.hMeta}>
                                  ID #{p.id} • {safeDate(p.created_at)}
                                </div>
                              </div>

                              <span
                                className={`${styles.statusPill} ${
                                  tone === "ok"
                                    ? styles.statusOk
                                    : tone === "bad"
                                    ? styles.statusBad
                                    : styles.statusPending
                                }`}
                              >
                                {String(p.status || "pending")}
                              </span>
                            </div>

                            <div className={styles.historyRow2}>
                              <div className={styles.hPrice}>
                                Total: <b>{formatNum(p.total_price)}</b> {p.currency || "NGN"}
                              </div>

                              {p.proof_image ? (
                                <a
                                  className={styles.proofLink}
                                  href={p.proof_image}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  View Proof
                                </a>
                              ) : null}
                            </div>

                            {p.admin_note ? (
                              <div className={styles.adminNote}>
                                <b>Admin:</b> {p.admin_note}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.panelInner}>
                <div className={styles.panelHead}>
                  <div className={styles.panelTitle}>Withdraw</div>
                  <div className={styles.panelSub}>
                    Request a payout. Coins are deducted immediately and status starts as pending.
                  </div>
                </div>

                <div className={styles.formCard}>
                  <div className={styles.formRow}>
                    <div className={styles.formLabel}>Withdraw Method</div>
                    <div className={styles.helper}>
                      Select the bank/provider you want to receive funds in.
                    </div>
                    <BankSelect value={wdBank} onChange={setWdBank} disabled={wdLoading} />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formLabel}>CopUp Coins (Bid Points)</div>
                    <input
                      className={styles.input}
                      placeholder="e.g. 50"
                      inputMode="numeric"
                      value={wdCoins}
                      onChange={(e) =>
                        setWdCoins(e.target.value.replace(/[^\d]/g, "").slice(0, 10))
                      }
                      disabled={wdLoading}
                    />
                    <div className={styles.helper}>
                      Available: <b>{formatNum(bidPoints)}</b>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formLabel}>Account Name</div>
                    <input
                      className={styles.input}
                      placeholder="e.g. Samuel Okafor"
                      value={wdAccountName}
                      onChange={(e) => setWdAccountName(e.target.value.slice(0, 50))}
                      disabled={wdLoading}
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formLabel}>Account Number</div>
                    <input
                      className={styles.input}
                      placeholder="10-digit NUBAN"
                      inputMode="numeric"
                      value={wdAccountNumber}
                      onChange={(e) =>
                        setWdAccountNumber(e.target.value.replace(/[^\d]/g, "").slice(0, 10))
                      }
                      disabled={wdLoading}
                    />
                  </div>

                  {wdErr ? <div className={styles.errorBox}>{wdErr}</div> : null}
                  {wdOk ? <div className={styles.okBox}>{wdOk}</div> : null}

                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={submitWithdraw}
                    disabled={wdLoading}
                  >
                    {wdLoading ? "Submitting…" : "Submit Withdrawal"}
                  </button>

                  <div className={styles.formNote}>
                    Your request will be reviewed by admin. Status stays <b>pending</b> until
                    approved/rejected.
                  </div>
                </div>

                <div className={styles.historyCard}>
                  <div className={styles.historyTop}>
                    <div className={styles.historyTitle}>My Withdrawals</div>
                    <button
                      type="button"
                      className={styles.ghostBtn}
                      onClick={() => {
                        fetchPayouts();
                        toast.info("Refreshing withdrawals…");
                      }}
                    >
                      <FiRefreshCw /> Refresh
                    </button>
                  </div>

                  {payoutsLoading ? (
                    <div className={styles.historyEmpty}>Loading…</div>
                  ) : payouts.length === 0 ? (
                    <div className={styles.historyEmpty}>No withdrawal requests yet.</div>
                  ) : (
                    <div className={styles.historyList}>
                      {payouts.map((p) => {
                        const tone = statusTone(p.status);
                        return (
                          <div className={styles.historyItem} key={p.id}>
                            <div className={styles.historyRow1}>
                              <div className={styles.historyLeft}>
                                <div className={styles.hCoins}>{formatNum(p.bid_points)} coins</div>
                                <div className={styles.hMeta}>
                                  ID #{p.id} • {safeDate(p.created_at)}
                                </div>
                              </div>

                              <span
                                className={`${styles.statusPill} ${
                                  tone === "ok"
                                    ? styles.statusOk
                                    : tone === "bad"
                                    ? styles.statusBad
                                    : styles.statusPending
                                }`}
                              >
                                {String(p.status || "pending")}
                              </span>
                            </div>

                            <div className={styles.historyRow2}>
                              <div className={styles.hPrice}>
                                <b>{p.bank_name}</b> • {p.account_number} • {p.account_name}
                              </div>

                              <button
                                type="button"
                                className={styles.proofLinkBtn}
                                onClick={() =>
                                  copyText(
                                    `${p.bank_name} | ${p.account_number} | ${p.account_name}`,
                                    "Withdrawal details copied"
                                  )
                                }
                              >
                                Copy Details
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={styles.utilityRow}>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => copyText(window.location.href, "Page link copied")}
              title="Copy link"
            >
              <FiCopy /> Copy Page Link
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}