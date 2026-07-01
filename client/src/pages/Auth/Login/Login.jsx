import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import styles from "../Auth.module.css";
import { api } from "../../../lib/api";
import coinImg from "../../../assets/copupcoin.png";

function normalizeRole(raw) {
  const r = String(raw || "").toLowerCase();
  if (r.includes("admin")) return "admin";
  return "user";
}

/**
 * Try to read JWT exp in seconds.
 * Returns:
 *  - number (exp seconds) if parseable
 *  - null if not JWT / not parseable
 */
function getJwtExp(token) {
  try {
    if (!token) return null;
    const parts = String(token).split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded =
      base64 + "=".repeat((4 - (base64.length % 4)) % 4);

    const json = atob(padded);
    const data = JSON.parse(json);

    if (typeof data?.exp === "number") return data.exp;
    return null;
  } catch (_) {
    return null;
  }
}

function isTokenExpired(token) {
  const exp = getJwtExp(token);
  if (!exp) return false; // not a JWT or no exp; let server verify instead
  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec >= exp;
}

export default function Login() {
  const nav = useNavigate();

  const [form, setForm] = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Read stored session once
  const storedToken = useMemo(() => localStorage.getItem("token"), []);
  const storedRole = useMemo(
    () => normalizeRole(localStorage.getItem("role")),
    []
  );

  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
  };

  const redirectByRole = (role) => {
    if (role === "admin") nav("/admin-dashboard", { replace: true });
    else nav("/", { replace: true });
  };

  // ✅ Session check on mount:
  // 1) if token missing -> done
  // 2) if JWT expired -> clear
  // 3) server verify (/users/profile) to confirm token is truly valid
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!storedToken) {
          if (mounted) setCheckingSession(false);
          return;
        }

        // quick local exp check (only if JWT with exp)
        if (isTokenExpired(storedToken)) {
          clearSession();
          if (mounted) setCheckingSession(false);
          return;
        }

        // server check to confirm token is valid
        await api.get("/users/profile", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        // valid token -> redirect
        if (mounted) {
          setCheckingSession(false);
          redirectByRole(storedRole || "user");
        }
      } catch (e) {
        // invalid token -> clear
        clearSession();
        if (mounted) setCheckingSession(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");

    if (!form.identifier || !form.password) {
      setErr("Email/Username and Password are required.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", {
        identifier: form.identifier.trim(),
        password: form.password,
      });

      // ✅ token (supports many backend shapes)
      const token = data?.token || data?.accessToken || data?.data?.token;
      if (token) localStorage.setItem("token", token);

      // ✅ role (supports many backend shapes)
      const role = normalizeRole(
        data?.role ||
          data?.data?.role ||
          data?.user?.role ||
          data?.data?.user?.role
      );

      localStorage.setItem("role", role);

      // ✅ if token is a JWT and already expired (rare but safe)
      if (token && isTokenExpired(token)) {
        clearSession();
        setErr("Session expired. Please login again.");
        return;
      }

      // ✅ verify token once (optional but prevents mismatch)
      try {
        await api.get("/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (_) {
        clearSession();
        setErr("Login session could not be verified. Try again.");
        return;
      }

      setMsg("Login successful.");
      redirectByRole(role);
    } catch (e2) {
      const apiMsg =
        e2?.response?.data?.message || e2?.message || "Login failed";
      setErr(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ During session check, prevent flashing login form
  if (checkingSession) {
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
                  <h1 className={styles.brandTitle}>Checking session…</h1>
                  <div className={styles.brandSub}>
                    Please wait a moment.
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.row}>
                <div className={styles.helper}>
                  Verifying your login token…
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Normal login form
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
                <h1 className={styles.brandTitle}>Welcome back</h1>
                <div className={styles.brandSub}>
                  Login with email or username.
                </div>
              </div>
            </div>
          </div>

          <div className={styles.cardBody}>
            <form className={styles.row} onSubmit={onSubmit}>
              <div className={styles.field}>
                <div className={styles.label}>Email or Username</div>
                <input
                  className={styles.input}
                  value={form.identifier}
                  onChange={onChange("identifier")}
                  placeholder="email or username"
                  autoComplete="username"
                />
              </div>

              <div className={styles.field}>
                <div className={styles.label}>Password</div>

                <div className={styles.passwordWrap}>
                  <input
                    className={styles.input}
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={onChange("password")}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className={styles.actions}>
                <button className={styles.btnPrimary} disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </button>
              </div>

              {msg && <div className={styles.msgOk}>{msg}</div>}
              {err && <div className={styles.msgErr}>{err}</div>}

              <div className={styles.hr} />

              <div className={styles.miniRow}>
                <Link className={styles.link} to="/auth/forgot-password">
                  Forgot password?
                </Link>

                <div className={styles.helper}>
                  New here?{" "}
                  <Link className={styles.link} to="/auth/register">
                    Create account
                  </Link>
                </div>
              </div>

              <div className={styles.miniRow}>
                <Link className={styles.link} to="/">
                  ← Back to Shop
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
