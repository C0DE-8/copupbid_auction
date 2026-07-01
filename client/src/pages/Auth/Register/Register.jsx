import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "../Auth.module.css";
import { api } from "../../../lib/api";
import coinImg from "../../../assets/copupcoin.png";

const isEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

function cleanRedirect(path) {
  const value = String(path || "").trim();
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "";
  if (value.startsWith("/auth/")) return "";
  return value;
}

export default function Register() {
  const nav = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const intendedRedirect =
    cleanRedirect(location.state?.from) ||
    cleanRedirect(params.get("redirect")) ||
    cleanRedirect(localStorage.getItem("copup_auth_redirect"));

  // step 1 = send otp, step 2 = register
  const [step, setStep] = useState(1);

  const [sendingOtp, setSendingOtp] = useState(false);
  const [registering, setRegistering] = useState(false);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    otp: "",
    referralCode: "",
  });

  const onChange = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
  };

  const sendOtp = async () => {
    setMsg("");
    setErr("");

    if (!form.email || !isEmail(form.email)) {
      setErr("Enter a valid email address.");
      return;
    }

    setSendingOtp(true);
    try {
      const { data } = await api.post("/auth/send-otp", {
        email: form.email.trim(),
        name: form.full_name || form.username || "New CopUp User",
      });
      setMsg(data?.message || "OTP sent to your email.");
      setStep(2);
    } catch (e2) {
      const apiMsg =
        e2?.response?.data?.message || e2?.message || "Failed to send OTP";
      setErr(apiMsg);
    } finally {
      setSendingOtp(false);
    }
  };

  const register = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");

    if (!form.username || !form.email || !form.password || !form.otp) {
      setErr("username, email, password and otp are required.");
      return;
    }
    if (!isEmail(form.email)) {
      setErr("Enter a valid email address.");
      return;
    }

    setRegistering(true);
    try {
      const { data } = await api.post("/auth/register", {
        username: form.username.trim(),
        full_name: form.full_name.trim() || null,
        email: form.email.trim(),
        password: form.password,
        otp: form.otp.trim(),
        referralCode: form.referralCode.trim() || null,
      });

      setMsg(data?.message || "Registered successfully.");
      const loginPath = intendedRedirect
        ? `/auth/login?redirect=${encodeURIComponent(intendedRedirect)}`
        : "/auth/login";
      nav(loginPath, {
        state: intendedRedirect ? { from: intendedRedirect } : undefined,
      });
    } catch (e2) {
      const apiMsg =
        e2?.response?.data?.message || e2?.message || "Registration failed";
      setErr(apiMsg);
    } finally {
      setRegistering(false);
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
                <h1 className={styles.brandTitle}>Create your account</h1>
                <div className={styles.brandSub}>
                  Step {step}/2 • Email OTP verification
                </div>
              </div>
            </div>
          </div>

          <div className={styles.cardBody}>
            {step === 1 ? (
              <div className={styles.row}>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <div className={styles.label}>Username</div>
                    <input
                      className={styles.input}
                      value={form.username}
                      onChange={onChange("username")}
                      placeholder="your username"
                      autoComplete="username"
                    />
                  </div>

                  <div className={styles.field}>
                    <div className={styles.label}>Full name (optional)</div>
                    <input
                      className={styles.input}
                      value={form.full_name}
                      onChange={onChange("full_name")}
                      placeholder="your full name"
                      autoComplete="name"
                    />
                  </div>
                </div>

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

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={sendOtp}
                    disabled={sendingOtp}
                  >
                    {sendingOtp ? "Sending OTP..." : "Send OTP"}
                  </button>
                </div>

                {msg ? <div className={styles.msgOk}>{msg}</div> : null}
                {err ? <div className={styles.msgErr}>{err}</div> : null}

                <div className={styles.hr} />
                <div className={styles.miniRow}>
                  <Link
                    className={styles.link}
                    to={
                      intendedRedirect
                        ? `/auth/login?redirect=${encodeURIComponent(intendedRedirect)}`
                        : "/auth/login"
                    }
                    state={intendedRedirect ? { from: intendedRedirect } : undefined}
                  >
                    I already have an account
                  </Link>
                  <div className={styles.helper}>Next: enter OTP + password</div>
                </div>
              </div>
            ) : (
              <form className={styles.row} onSubmit={register}>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <div className={styles.label}>Username</div>
                    <input
                      className={styles.input}
                      value={form.username}
                      onChange={onChange("username")}
                      placeholder="your username"
                    />
                  </div>

                  <div className={styles.field}>
                    <div className={styles.label}>Full name (optional)</div>
                    <input
                      className={styles.input}
                      value={form.full_name}
                      onChange={onChange("full_name")}
                      placeholder="your full name"
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <div className={styles.label}>Email</div>
                  <input
                    className={styles.input}
                    value={form.email}
                    onChange={onChange("email")}
                    placeholder="name@example.com"
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
                    <div className={styles.label}>Password</div>
                    <input
                      className={styles.input}
                      type="password"
                      value={form.password}
                      onChange={onChange("password")}
                      placeholder="Create a password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <div className={styles.label}>Referral code (optional)</div>
                  <input
                    className={styles.input}
                    value={form.referralCode}
                    onChange={onChange("referralCode")}
                    placeholder="Referral code"
                  />
                </div>

                <div className={styles.actions}>
                  <button
                    className={styles.btnPrimary}
                    disabled={registering}
                    type="submit"
                  >
                    {registering ? "Creating account..." : "Create account"}
                  </button>

                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => setStep(1)}
                    disabled={registering}
                  >
                    Back to Send OTP
                  </button>
                </div>

                {msg ? <div className={styles.msgOk}>{msg}</div> : null}
                {err ? <div className={styles.msgErr}>{err}</div> : null}

                <div className={styles.hr} />
                <div className={styles.miniRow}>
                  <Link
                    className={styles.link}
                    to={
                      intendedRedirect
                        ? `/auth/login?redirect=${encodeURIComponent(intendedRedirect)}`
                        : "/auth/login"
                    }
                    state={intendedRedirect ? { from: intendedRedirect } : undefined}
                  >
                    Already have an account?
                  </Link>
                  <div className={styles.helper}>OTP expires in 10 mins</div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
