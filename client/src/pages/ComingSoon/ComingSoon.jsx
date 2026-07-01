import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./ComingSoon.module.css";
import coinImg from "../../assets/copupcoin.png";

function pad2(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "00";
  return String(Math.max(0, v)).padStart(2, "0");
}

export default function ComingSoon() {
  // ✅ Set your launch date here (local time)
  const launchAt = useMemo(() => new Date("2026-04-01T12:00:00"), []);
  const [now, setNow] = useState(() => Date.now());

  const [email, setEmail] = useState("");
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.max(0, launchAt.getTime() - now);
  const totalSec = Math.floor(diff / 1000);

  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const isLive = diff <= 0;

  function submitNotify(e) {
    e.preventDefault();
    setOk("");
    setErr("");

    const v = String(email || "").trim();
    if (!v) return setErr("Enter your email.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setErr("Enter a valid email.");

    // ✅ Frontend-only success (wire to backend later if you want)
    setOk("You’re on the list. We’ll notify you.");
    setEmail("");
  }

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.card}>
        <img src={coinImg} alt="CopUpCoin" className={styles.logo} />

        <div className={styles.badge}>COMING SOON</div>

        <h1 className={styles.title}>
          {isLive ? "We’re Live 🚀" : "New Drop Incoming"}
        </h1>

        <p className={styles.subtitle}>
          {isLive
            ? "This feature is now available. Head back and explore."
            : "We’re building something clean, fast, and addictive. Stay close."}
        </p>

        {!isLive ? (
          <div className={styles.timer}>
            <div className={styles.timeBox}>
              <div className={styles.timeVal}>{pad2(days)}</div>
              <div className={styles.timeLabel}>Days</div>
            </div>
            <div className={styles.timeBox}>
              <div className={styles.timeVal}>{pad2(hours)}</div>
              <div className={styles.timeLabel}>Hours</div>
            </div>
            <div className={styles.timeBox}>
              <div className={styles.timeVal}>{pad2(mins)}</div>
              <div className={styles.timeLabel}>Mins</div>
            </div>
            <div className={styles.timeBox}>
              <div className={styles.timeVal}>{pad2(secs)}</div>
              <div className={styles.timeLabel}>Secs</div>
            </div>
          </div>
        ) : null}

        <form className={styles.form} onSubmit={submitNotify}>
          <div className={styles.formLabel}>Get notified at launch</div>

          <div className={styles.formRow}>
            <input
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yourname@email.com"
              inputMode="email"
              autoComplete="email"
              disabled={isLive}
            />
            <button className={styles.btn} type="submit" disabled={isLive}>
              Notify me
            </button>
          </div>

          {err ? <div className={styles.error}>{err}</div> : null}
          {ok ? <div className={styles.ok}>{ok}</div> : null}
        </form>

        <div className={styles.actions}>
          <Link to="/" className={styles.ghostBtn}>
            Back to Home
          </Link>

          <Link to="/account" className={styles.ghostBtn}>
            Go to Account
          </Link>
        </div>

        <p className={styles.small}>
          Tip: Change <b>launchAt</b> in the file to your real date.
        </p>
      </div>
    </div>
  );
}