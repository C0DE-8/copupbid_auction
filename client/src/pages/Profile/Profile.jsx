import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./Profile.module.css";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import SidebarFrame from "../../components/SidebarFrame/SidebarFrame";
import LoginRequiredModal from "../../components/LoginRequiredModal/LoginRequiredModal";
import coinImg from "../../assets/copupcoin.png";
import { api, imgUrl } from "../../lib/api";
import { useToast } from "../../components/Toast/ToastContext";

import {
  FiUser,
  FiEdit3,
  FiSave,
  FiX,
  FiCopy,
  FiCamera,
  FiRefreshCw,
  FiShield,
  FiKey,
  FiMail,
  FiLock,
} from "react-icons/fi";

function getAuthToken() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken");
}

function clampStr(v, max = 40) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function safeDate(v) {
  try {
    if (!v) return "—";
    return new Date(v).toLocaleDateString();
  } catch {
    return "—";
  }
}

function onlyDigits4(v) {
  return String(v || "")
    .replace(/[^\d]/g, "")
    .slice(0, 4);
}

export default function Profile() {
  const toast = useToast();
  const token = useMemo(() => getAuthToken(), []);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginMeta, setLoginMeta] = useState({
    title: "Login required",
    message: "Please login to view and edit your profile.",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [user, setUser] = useState(null);

  // edit mode
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  // photo upload
  const fileRef = useRef(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoFile, setPhotoFile] = useState(null);

  // ✅ PIN modal state
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinMode, setPinMode] = useState("set"); // "set" | "recover"
  const [pinOld, setPinOld] = useState("");
  const [pinNew, setPinNew] = useState("");
  const [pinEmail, setPinEmail] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinErr, setPinErr] = useState("");
  const [pinOk, setPinOk] = useState("");

  const openLogin = useCallback((title, message) => {
    setLoginMeta({
      title: title || "Login required",
      message: message || "You need to login to access this feature.",
    });
    setLoginModalOpen(true);
  }, []);

  const closeLogin = useCallback(() => setLoginModalOpen(false), []);

  const explainAxiosError = useCallback((e) => {
    if (e?.response) {
      return (
        e.response.data?.message ||
        e.response.statusText ||
        `API error (${e.response.status})`
      );
    }
    if (e?.request) return "No response from server. Check API URL / CORS / network.";
    return e?.message || "Unknown error";
  }, []);

  // ✅ toaster copy helper
  const copyToClipboard = useCallback(
    (value, label = "Copied") => {
      const t = String(value ?? "").trim();
      if (!t) return toast.error("Nothing to copy");

      if (navigator?.clipboard?.writeText) {
        navigator.clipboard
          .writeText(t)
          .then(() => toast.success(`${label} copied`))
          .catch(() => toast.error("Failed to copy"));
        return;
      }

      try {
        const ta = document.createElement("textarea");
        ta.value = t;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast.success(`${label} copied`);
      } catch {
        toast.error("Copy failed");
      }
    },
    [toast]
  );

  const fetchProfile = useCallback(async () => {
    const t = getAuthToken();
    if (!t) {
      setLoading(false);
      setUser(null);
      openLogin("Login required", "Please login to view your profile.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const { data } = await api.get("users/profile");
      setUser(data);

      setFullName(String(data?.full_name ?? ""));
      setUsername(String(data?.username ?? ""));
      setPhotoPreview(imgUrl(data?.profile)); // ✅ path -> absolute
      setPhotoFile(null);

      // ✅ keep email ready for PIN recovery
      setPinEmail(String(data?.email ?? ""));

      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      const msg = explainAxiosError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [explainAxiosError, openLogin, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onPickPhoto = useCallback(
    (e) => {
      const f = e?.target?.files?.[0];
      if (!f) return;

      const okTypes = ["image/png", "image/jpeg", "image/webp"];
      if (!okTypes.includes(f.type)) {
        setNotice("Please upload a PNG, JPG, or WEBP image.");
        toast.error("Only PNG, JPG, or WEBP allowed");
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setNotice("Image too large. Max 5MB.");
        toast.error("Image too large (max 5MB)");
        return;
      }

      setPhotoFile(f);
      const url = URL.createObjectURL(f);
      setPhotoPreview(url);
      toast.info("Photo selected");
    },
    [toast]
  );

  const resetEdits = useCallback(() => {
    setEditing(false);
    setNotice("");
    setError("");

    setFullName(String(user?.full_name ?? ""));
    setUsername(String(user?.username ?? ""));
    setPhotoPreview(imgUrl(user?.profile));
    setPhotoFile(null);

    if (fileRef.current) fileRef.current.value = "";
    toast.info("Changes discarded");
  }, [user, toast]);

  const startEdit = useCallback(() => {
    const t = getAuthToken();
    if (!t) {
      openLogin("Login required", "Please login to edit your profile.");
      return;
    }
    setEditing(true);
    setNotice("");
    setError("");
  }, [openLogin]);

  const saveProfile = useCallback(async () => {
    const t = getAuthToken();
    if (!t) {
      openLogin("Login required", "Please login to edit your profile.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const fd = new FormData();

      const fTrim = String(fullName ?? "").trim();
      const uTrim = String(username ?? "").trim();

      if (fTrim && fTrim !== String(user?.full_name ?? "")) fd.append("full_name", fTrim);
      if (uTrim && uTrim !== String(user?.username ?? "")) fd.append("username", uTrim);
      if (photoFile) fd.append("profile", photoFile);

      const { data } = await api.put("users/profile", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated = {
        ...user,
        full_name: data?.user?.full_name ?? fTrim ?? user?.full_name,
        username: data?.user?.username ?? uTrim ?? user?.username,
        profile: data?.user?.profile ? String(data.user.profile) : user?.profile,
      };

      setUser(updated);
      setEditing(false);
      setNotice(data?.message || "Profile updated successfully.");
      toast.success(data?.message || "Profile updated successfully.");
      setPhotoFile(null);

      setPhotoPreview((prev) => {
        if (String(prev || "").startsWith("blob:")) return prev;
        return imgUrl(updated.profile);
      });

      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      const msg = explainAxiosError(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [fullName, username, photoFile, user, explainAxiosError, openLogin, toast]);

  const profileInitials = useMemo(() => {
    const a = String(user?.full_name || user?.username || "User").trim();
    const parts = a.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "U";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (first + last).toUpperCase();
  }, [user]);

  const statusChips = useMemo(() => {
    const hasPin = Number(user?.has_pin) === 1;
    return [
      { key: "pin", label: hasPin ? "PIN Set" : "No PIN", icon: FiKey, good: hasPin },
      { key: "secure", label: "Secure Profile", icon: FiShield, good: true },
    ];
  }, [user]);

  const profileImgSrc = useMemo(() => {
    const p = String(photoPreview || "").trim();
    if (!p) return "";
    if (p.startsWith("blob:")) return p;
    return imgUrl(p);
  }, [photoPreview]);

  // ✅ PIN modal helpers
  const closePinModal = useCallback(() => {
    setPinModalOpen(false);
    setPinMode("set");
    setPinOld("");
    setPinNew("");
    setPinErr("");
    setPinOk("");
  }, []);

  const openPinSet = useCallback(() => {
    const t = getAuthToken();
    if (!t) {
      openLogin("Login required", "Please login to manage your PIN.");
      return;
    }
    setPinMode("set");
    setPinOld("");
    setPinNew("");
    setPinErr("");
    setPinOk("");
    setPinModalOpen(true);
  }, [openLogin]);

  const openPinRecover = useCallback(() => {
    setPinMode("recover");
    setPinOld("");
    setPinNew("");
    setPinErr("");
    setPinOk("");
    setPinModalOpen(true);
  }, []);

  const submitSetPin = useCallback(async () => {
    const t = getAuthToken();
    if (!t) {
      openLogin("Login required", "Please login to set or change your PIN.");
      return;
    }

    const hasPinLocal = Number(user?.has_pin) === 1;

    const newClean = onlyDigits4(pinNew);
    const oldClean = onlyDigits4(pinOld);

    if (!/^\d{4}$/.test(newClean)) {
      setPinErr("New PIN must be exactly 4 digits.");
      toast.error("New PIN must be 4 digits");
      return;
    }
    if (hasPinLocal && !/^\d{4}$/.test(oldClean)) {
      setPinErr("Old PIN must be exactly 4 digits.");
      toast.error("Old PIN must be 4 digits");
      return;
    }
    if (hasPinLocal && oldClean === newClean) {
      setPinErr("New PIN must be different from old PIN.");
      toast.error("New PIN must be different");
      return;
    }

    setPinLoading(true);
    setPinErr("");
    setPinOk("");

    try {
      const payload = { newPin: newClean };
      if (hasPinLocal) payload.oldPin = oldClean;

      const { data } = await api.post("users/set-pin", payload);

      const msg = data?.message || "PIN updated.";
      setPinOk(msg);
      toast.success(msg);

      setPinOld("");
      setPinNew("");

      setUser((prev) => {
        if (!prev) return prev;
        return { ...prev, has_pin: 1 };
      });
    } catch (e) {
      const msg = explainAxiosError(e);
      setPinErr(msg);
      toast.error(msg);
    } finally {
      setPinLoading(false);
    }
  }, [pinNew, pinOld, user, explainAxiosError, openLogin, toast]);

  const submitRecoverPin = useCallback(async () => {
    const email = String(pinEmail || user?.email || "").trim();
    if (!email) {
      setPinErr("Email is required.");
      toast.error("Email is required");
      return;
    }

    setPinLoading(true);
    setPinErr("");
    setPinOk("");

    try {
      const { data } = await api.post("users/recover-pin", { email });
      const msg = data?.message || "PIN has been sent to your email.";
      setPinOk(msg);
      toast.success(msg);
    } catch (e) {
      const msg = explainAxiosError(e);
      setPinErr(msg);
      toast.error(msg);
    } finally {
      setPinLoading(false);
    }
  }, [pinEmail, user, explainAxiosError, toast]);

  const hasPin = useMemo(() => Number(user?.has_pin) === 1, [user]);

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} aria-hidden="true">
        <svg className={styles.bgSvg} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="pglow1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="pglow2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="pglow3" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="18%" cy="28%" r="320" fill="url(#pglow1)" className={styles.pulse1} />
          <circle cx="82%" cy="72%" r="260" fill="url(#pglow2)" className={styles.pulse2} />
          <circle cx="58%" cy="18%" r="210" fill="url(#pglow3)" className={styles.pulse3} />
        </svg>
      </div>

      <Header />

      <main className={styles.main}>
        <SidebarFrame active="profile">
        <div className={styles.container}>
          {/* Header row */}
          <div className={styles.topRow}>
            <div>
              <div className={styles.title}>Profile</div>
              <div className={styles.subTitle}>Manage your account details, avatar, and identity.</div>
            </div>

            <div className={styles.topActions}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={fetchProfile}
                disabled={loading || saving}
                title="Refresh"
              >
                <FiRefreshCw />
                <span>Refresh</span>
              </button>

              {!editing ? (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={startEdit}
                  disabled={loading || saving || !user}
                >
                  <FiEdit3 />
                  <span>Edit</span>
                </button>
              ) : (
                <div className={styles.editActionGroup}>
                  <button type="button" className={styles.btnPrimary} onClick={saveProfile} disabled={saving}>
                    <FiSave />
                    <span>{saving ? "Saving..." : "Save"}</span>
                  </button>
                  <button type="button" className={styles.btnDanger} onClick={resetEdits} disabled={saving}>
                    <FiX />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div className={styles.statusRow}>
            {statusChips.map((c) => (
              <div key={c.key} className={`${styles.statusChip} ${c.good ? styles.good : styles.bad}`}>
                <c.icon />
                <span>{c.label}</span>
              </div>
            ))}
          </div>

          {/* Alerts (keep your existing UI alerts too) */}
          {error ? (
            <div className={styles.alertError}>
              <div className={styles.alertTitle}>Something went wrong</div>
              <div className={styles.alertText}>{error}</div>
            </div>
          ) : null}

          {notice ? (
            <div className={styles.alertOk}>
              <div className={styles.alertTitle}>Update</div>
              <div className={styles.alertText}>{notice}</div>
            </div>
          ) : null}

          {/* Body */}
          {loading ? (
            <div className={styles.skelWrap}>
              <div className={styles.skelCard} />
              <div className={styles.skelCard} />
            </div>
          ) : !user ? (
            <div className={styles.stateCard}>
              <div className={styles.stateIcon}>
                <FiUser />
              </div>
              <div className={styles.stateTitle}>Not logged in</div>
              <div className={styles.stateSub}>Please login to view and manage your profile.</div>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => openLogin("Login required", "Please login to continue.")}
              >
                Login
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {/* Left */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Account</div>
                  <div className={styles.cardSub}>Your public identity</div>
                </div>

                <div className={styles.avatarRow}>
                  <div className={styles.avatarWrap}>
                    {profileImgSrc ? (
                      <img src={profileImgSrc} alt="Profile" className={styles.avatarImg} />
                    ) : (
                      <div className={styles.avatarFallback}>
                        <span>{profileInitials}</span>
                      </div>
                    )}

                    {editing ? (
                      <>
                        <button
                          type="button"
                          className={styles.avatarBtn}
                          onClick={() => fileRef.current?.click()}
                          title="Change photo"
                        >
                          <FiCamera />
                        </button>
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className={styles.fileInput}
                          onChange={onPickPhoto}
                        />
                      </>
                    ) : null}
                  </div>

                  <div className={styles.quickInfo}>
                    <div className={styles.nameLine}>
                      <div className={styles.nameText}>
                        {clampStr(user?.full_name || user?.username || "User", 40)}
                      </div>
                      <div className={styles.userTag}>@{user?.username || "user"}</div>
                    </div>

                    <div className={styles.miniGrid}>
                      <div className={styles.miniBox}>
                        <div className={styles.miniLabel}>Bid Points</div>
                        <div className={styles.miniValue}>
                          {Number(user?.bid_points ?? 0).toLocaleString()}
                        </div>
                      </div>
                      <div className={styles.miniBox}>
                        <div className={styles.miniLabel}>Task Coin</div>
                        <div className={styles.miniValue}>
                          <img src={coinImg} alt="coin" className={styles.coinIcon} />
                          {Number(user?.task_coin ?? 0).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className={styles.joinLine}>
                      Joined <b>{safeDate(user?.created_at)}</b>
                    </div>
                  </div>
                </div>

                <div className={styles.divider} />

                {/* ✅ Security actions */}
                <div className={styles.securityRow}>
                  <div className={styles.securityTitle}>
                    <FiLock />
                    <span>Security</span>
                  </div>

                  <div className={styles.securityBtns}>
                    <button
                      type="button"
                      className={styles.btnSecPrimary}
                      onClick={openPinSet}
                      disabled={loading || saving}
                      title={hasPin ? "Change PIN" : "Set PIN"}
                    >
                      <FiKey />
                      <span>{hasPin ? "Change PIN" : "Set PIN"}</span>
                    </button>

                    <button
                      type="button"
                      className={styles.btnSecGhost}
                      onClick={openPinRecover}
                      disabled={loading || saving}
                      title="Recover PIN"
                    >
                      <FiMail />
                      <span>Recover PIN</span>
                    </button>
                  </div>

                  <div className={styles.securityHint}>
                    {hasPin
                      ? "PIN is enabled. You can change it anytime."
                      : "No PIN yet. Set a 4-digit PIN to secure actions."}
                  </div>
                </div>

                <div className={styles.divider} />

                {/* identity */}
                <div className={styles.kv}>
                  <div className={styles.kvRow}>
                    <div className={styles.kvKey}>Email</div>
                    <div className={styles.kvVal}>{user?.email || "—"}</div>
                  </div>

                  <div className={styles.kvRow}>
                    <div className={styles.kvKey}>Game ID</div>
                    <div className={styles.kvVal}>
                      <span>{user?.game_id || "—"}</span>
                      {user?.game_id ? (
                        <button
                          type="button"
                          className={styles.copyBtn}
                          onClick={() => copyToClipboard(user.game_id, "Game ID")}
                          title="Copy"
                        >
                          <FiCopy />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.kvRow}>
                    <div className={styles.kvKey}>Referral Code</div>
                    <div className={styles.kvVal}>
                      <span>{user?.referral_code || "—"}</span>
                      {user?.referral_code ? (
                        <button
                          type="button"
                          className={styles.copyBtn}
                          onClick={() => copyToClipboard(user.referral_code, "Referral Code")}
                          title="Copy"
                        >
                          <FiCopy />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.kvRow}>
                    <div className={styles.kvKey}>Wallet Address</div>
                    <div className={styles.kvVal}>
                      <span className={styles.mono}>
                        {user?.wallet_address ? clampStr(user.wallet_address, 22) : "—"}
                      </span>
                      {user?.wallet_address ? (
                        <button
                          type="button"
                          className={styles.copyBtn}
                          onClick={() => copyToClipboard(user.wallet_address, "Wallet Address")}
                          title="Copy"
                        >
                          <FiCopy />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>

              {/* Right */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>Edit Profile</div>
                  <div className={styles.cardSub}>Update your name, username, and profile photo.</div>
                </div>

                <div className={styles.form}>
                  <div className={styles.field}>
                    <label className={styles.label}>Full Name</label>
                    <input
                      className={styles.input}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      disabled={!editing || saving}
                    />
                    <div className={styles.hint}>Min 2 characters.</div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Username</label>
                    <input
                      className={styles.input}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      disabled={!editing || saving}
                    />
                    <div className={styles.hint}>
                      Min 3 chars. Letters, numbers, <span className={styles.mono}>_ . -</span>
                    </div>
                  </div>

                  <div className={styles.tipCard}>
                    <div className={styles.tipTitle}>Tip</div>
                    <div className={styles.tipText}>
                      Choose a clean username. It improves trust and helps people recognize you.
                    </div>
                  </div>

                  {!editing ? (
                    <button type="button" className={styles.btnPrimaryWide} onClick={startEdit}>
                      <FiEdit3 />
                      <span>Edit Profile</span>
                    </button>
                  ) : (
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.btnPrimaryWide}
                        onClick={saveProfile}
                        disabled={saving}
                      >
                        <FiSave />
                        <span>{saving ? "Saving..." : "Save changes"}</span>
                      </button>
                      <button
                        type="button"
                        className={styles.btnGhostWide}
                        onClick={resetEdits}
                        disabled={saving}
                      >
                        <FiX />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
        </SidebarFrame>
      </main>

      <Footer />

      <LoginRequiredModal open={loginModalOpen} onClose={closeLogin} title={loginMeta.title} message={loginMeta.message} />

      {/* ✅ PIN MODAL */}
      {pinModalOpen ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <div className={styles.modalTop}>
              <div className={styles.modalTitle}>
                <FiKey />
                <span>{pinMode === "recover" ? "Recover PIN" : hasPin ? "Change PIN" : "Set PIN"}</span>
              </div>

              <button
                type="button"
                className={styles.modalClose}
                onClick={closePinModal}
                disabled={pinLoading}
                aria-label="Close"
                title="Close"
              >
                <FiX />
              </button>
            </div>

            <div className={styles.modalSub}>
              {pinMode === "recover"
                ? "We’ll send your 4-digit PIN to your email."
                : "PIN must be exactly 4 digits."}
            </div>

            {pinErr ? (
              <div className={styles.modalAlertErr}>
                <div className={styles.modalAlertTitle}>Action failed</div>
                <div className={styles.modalAlertText}>{pinErr}</div>
              </div>
            ) : null}

            {pinOk ? (
              <div className={styles.modalAlertOk}>
                <div className={styles.modalAlertTitle}>Done</div>
                <div className={styles.modalAlertText}>{pinOk}</div>
              </div>
            ) : null}

            {pinMode === "recover" ? (
              <div className={styles.modalBody}>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Email</label>
                  <input
                    className={styles.modalInput}
                    value={pinEmail || user?.email || ""}
                    onChange={(e) => setPinEmail(e.target.value)}
                    placeholder="your@email.com"
                    disabled={pinLoading}
                  />
                  <div className={styles.modalHint}>Make sure this is your account email.</div>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.modalBtnPrimary}
                    onClick={submitRecoverPin}
                    disabled={pinLoading}
                  >
                    <FiMail />
                    <span>{pinLoading ? "Sending..." : "Send PIN to Email"}</span>
                  </button>

                  <button
                    type="button"
                    className={styles.modalBtnGhost}
                    onClick={() => setPinMode("set")}
                    disabled={pinLoading}
                  >
                    <FiKey />
                    <span>Set / Change PIN</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.modalBody}>
                {hasPin ? (
                  <div className={styles.modalField}>
                    <label className={styles.modalLabel}>Old PIN</label>
                    <input
                      className={styles.modalInput}
                      value={pinOld}
                      onChange={(e) => setPinOld(onlyDigits4(e.target.value))}
                      placeholder="••••"
                      inputMode="numeric"
                      pattern="\d{4}"
                      maxLength={4}
                      type="password"
                      disabled={pinLoading}
                    />
                    <div className={styles.modalHint}>Enter your current 4-digit PIN.</div>
                  </div>
                ) : null}

                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>New PIN</label>
                  <input
                    className={styles.modalInput}
                    value={pinNew}
                    onChange={(e) => setPinNew(onlyDigits4(e.target.value))}
                    placeholder="••••"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    type="password"
                    disabled={pinLoading}
                  />
                  <div className={styles.modalHint}>Use a PIN you can remember.</div>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.modalBtnPrimary}
                    onClick={submitSetPin}
                    disabled={pinLoading}
                  >
                    <FiKey />
                    <span>{pinLoading ? "Saving..." : hasPin ? "Update PIN" : "Set PIN"}</span>
                  </button>

                  <button
                    type="button"
                    className={styles.modalBtnGhost}
                    onClick={() => setPinMode("recover")}
                    disabled={pinLoading}
                  >
                    <FiMail />
                    <span>Recover PIN</span>
                  </button>
                </div>

                <div className={styles.modalFootNote}>
                  <FiShield />
                  <span>Keep your PIN private. Don’t share it with anyone.</span>
                </div>
              </div>
            )}
          </div>

          {/* click-out to close */}
          <button
            type="button"
            className={styles.modalBackdropBtn}
            onClick={closePinModal}
            disabled={pinLoading}
            aria-label="Close modal backdrop"
            title="Close"
          />
        </div>
      ) : null}
    </div>
  );
}
