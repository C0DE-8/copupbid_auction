import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "../Auth.module.css";
import { api } from "../../../lib/api";
import coinImg from "../../../assets/copupcoin.png";

const isEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

export default function ForgotPassword() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const sendOtp = async () => {
    setMsg("");
    setErr("");

    if (!email || !isEmail(email)) {
      setErr("Enter a valid email address.");
      return;
    }

    setSending(true);
    try {
      const { data } = await api.post("/auth/forget-password", {
        email: email.trim(),
      });
      setMsg(data?.message || "OTP sent to your email.");
      nav("/auth/reset-password", { state: { email: email.trim() } });
    } catch (e2) {
      const apiMsg =
        e2?.response?.data?.message || e2?.message || "Failed to send OTP";
      setErr(apiMsg);
    } finally {
      setSending(false);
    }
  };

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
          <circle
            cx="20%"
            cy="30%"
            r="320"
            fill="url(#glow1)"
            className={styles.pulse1}
          />
          <circle
            cx="80%"
            cy="70%"
            r="260"
            fill="url(#glow2)"
            className={styles.pulse2}
          />
          <circle
            cx="60%"
            cy="20%"
            r="210"
            fill="url(#glow3)"
            className={styles.pulse3}
          />
        </svg>
      </div>

      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <div className={styles.brandRow}>
              <div className={styles.brandLogo}>
                <img
                  src={coinImg}
                  alt="CopupBid"
                  className={styles.brandLogoImg}
                />
              </div>

              <div className={styles.brandText}>
                <div className={styles.siteName}>CopupBid</div>
                <h1 className={styles.brandTitle}>Forgot password</h1>
                <div className={styles.brandSub}>
                  We’ll send an OTP to reset your password.
                </div>
              </div>
            </div>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.row}>
              <div className={styles.field}>
                <div className={styles.label}>Email</div>
                <input
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={sendOtp}
                  disabled={sending}
                >
                  {sending ? "Sending OTP..." : "Send OTP"}
                </button>
              </div>

              {msg ? <div className={styles.msgOk}>{msg}</div> : null}
              {err ? <div className={styles.msgErr}>{err}</div> : null}

              <div className={styles.hr} />
              <div className={styles.miniRow}>
                <Link className={styles.link} to="/auth/login">
                  Back to Login
                </Link>
                <Link className={styles.link} to="/auth/register">
                  Create account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
