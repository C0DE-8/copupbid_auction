import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "../Auth.module.css";
import { api } from "../../../lib/api";
import coinImg from "../../../assets/copupcoin.png";

const isEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

export default function ResetPassword() {
  const nav = useNavigate();
  const loc = useLocation();

  const [form, setForm] = useState({
    email: "",
    otp: "",
    newPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const prefill = loc?.state?.email;
    if (prefill) {
      setForm((p) => ({ ...p, email: String(prefill) }));
    }
  }, [loc]);

  const onChange = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");

    if (!form.email || !form.otp || !form.newPassword) {
      setErr("email, otp, and new password are required.");
      return;
    }
    if (!isEmail(form.email)) {
      setErr("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", {
        email: form.email.trim(),
        otp: form.otp.trim(),
        newPassword: form.newPassword,
      });

      setMsg(data?.message || "Password reset successfully.");
      setTimeout(() => nav("/auth/login"), 800);
    } catch (e2) {
      const apiMsg =
        e2?.response?.data?.message || e2?.message || "Reset failed";
      setErr(apiMsg);
    } finally {
      setLoading(false);
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
                <h1 className={styles.brandTitle}>Reset password</h1>
                <div className={styles.brandSub}>
                  Enter OTP and set a new password.
                </div>
              </div>
            </div>
          </div>

          <div className={styles.cardBody}>
            <form className={styles.row} onSubmit={onSubmit}>
              <div className={styles.field}>
                <div className={styles.label}>Email</div>
                <input
                  className={styles.input}
                  value={form.email}
                  onChange={onChange("email")}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </div>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <div className={styles.label}>OTP</div>
                  <input
                    className={styles.input}
                    value={form.otp}
                    onChange={onChange("otp")}
                    placeholder="6-digit code"
                  />
                </div>

                <div className={styles.field}>
                  <div className={styles.label}>New password</div>
                  <input
                    className={styles.input}
                    type="password"
                    value={form.newPassword}
                    onChange={onChange("newPassword")}
                    placeholder="New password"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className={styles.actions}>
                <button className={styles.btnPrimary} disabled={loading}>
                  {loading ? "Resetting..." : "Reset password"}
                </button>
              </div>

              {msg ? <div className={styles.msgOk}>{msg}</div> : null}
              {err ? <div className={styles.msgErr}>{err}</div> : null}

              <div className={styles.hr} />
              <div className={styles.miniRow}>
                <Link className={styles.link} to="/auth/forgot-password">
                  Resend OTP
                </Link>
                <Link className={styles.link} to="/auth/login">
                  Back to Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
