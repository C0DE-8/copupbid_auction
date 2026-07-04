import React, { useEffect, useState } from "react";
import { Check, Cookie, Settings, ShieldCheck, X } from "lucide-react";
import styles from "./CookieConsent.module.css";

const STORAGE_KEY = "copup_cookie_consent";
const VERSION = 1;

const defaultPrefs = {
  essential: true,
  analytics: false,
  marketing: false,
};

function readConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== VERSION || !parsed?.preferences) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveConsent(choice, preferences) {
  const payload = {
    version: VERSION,
    choice,
    preferences: { ...defaultPrefs, ...preferences, essential: true },
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("copup-cookie-consent", { detail: payload }));
  return payload;
}

export default function CookieConsent() {
  const [consent, setConsent] = useState(() => readConsent());
  const [panelOpen, setPanelOpen] = useState(false);
  const [prefs, setPrefs] = useState(() => readConsent()?.preferences || defaultPrefs);

  const hasConsent = Boolean(consent);

  useEffect(() => {
    const sync = () => {
      const next = readConsent();
      setConsent(next);
      setPrefs(next?.preferences || defaultPrefs);
    };
    const openSettings = () => setPanelOpen(true);

    window.addEventListener("storage", sync);
    window.addEventListener("copup-cookie-consent", sync);
    window.addEventListener("copup-open-cookie-settings", openSettings);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("copup-cookie-consent", sync);
      window.removeEventListener("copup-open-cookie-settings", openSettings);
    };
  }, []);

  const closeWith = (choice, nextPrefs) => {
    const saved = saveConsent(choice, nextPrefs);
    setConsent(saved);
    setPrefs(saved.preferences);
    setPanelOpen(false);
  };

  const rejectOptional = () => closeWith("rejected_optional", defaultPrefs);
  const acceptAll = () =>
    closeWith("accepted_all", {
      essential: true,
      analytics: true,
      marketing: true,
    });
  const saveSelected = () => closeWith("customized", prefs);

  const updatePref = (key) => {
    setPrefs((current) => ({ ...current, [key]: !current[key], essential: true }));
  };

  return (
    <>
      {!hasConsent ? (
        <section className={styles.banner} aria-label="Privacy and cookie notice">
          <div className={styles.bannerIcon} aria-hidden="true">
            <Cookie size={22} />
          </div>

          <div className={styles.bannerCopy}>
            <div className={styles.eyebrow}>Privacy choices</div>
            <h2>We use cookies to run CopUpBid smoothly.</h2>
            <p>
              Essential cookies keep login, cart, checkout, bids, and security working.
              You can also allow analytics and shopping personalization, or reject optional cookies.
            </p>
            <a href="/privacy" className={styles.privacyLink}>
              Privacy Policy
            </a>
          </div>

          <div className={styles.bannerActions}>
            <button type="button" className={styles.secondaryBtn} onClick={() => setPanelOpen(true)}>
              <Settings size={17} />
              Manage cookies
            </button>
            <button type="button" className={styles.ghostBtn} onClick={rejectOptional}>
              <X size={17} />
              Reject optional
            </button>
            <button type="button" className={styles.primaryBtn} onClick={acceptAll}>
              <Check size={18} />
              Accept all
            </button>
          </div>
        </section>
      ) : null}

      {panelOpen ? (
        <div className={styles.overlay} role="presentation">
          <button
            type="button"
            className={styles.backdrop}
            onClick={() => setPanelOpen(false)}
            aria-label="Close cookie settings"
          />

          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="cookie-title">
            <div className={styles.modalHead}>
              <div className={styles.modalIcon} aria-hidden="true">
                <ShieldCheck size={22} />
              </div>
              <div>
                <div className={styles.eyebrow}>Cookie preferences</div>
                <h2 id="cookie-title">Manage your privacy settings</h2>
              </div>
              <button type="button" className={styles.closeBtn} onClick={() => setPanelOpen(false)} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <p className={styles.modalIntro}>
              Choose how CopUpBid can use cookies beyond the essentials needed for account access,
              cart, checkout, auction participation, fraud prevention, and site security.
            </p>

            <div className={styles.prefList}>
              <label className={`${styles.prefRow} ${styles.prefRequired}`}>
                <span>
                  <strong>Essential shopping cookies</strong>
                  <small>Required for login, cart, checkout, bids, orders, and security.</small>
                </span>
                <input type="checkbox" checked readOnly aria-label="Essential cookies are always on" />
              </label>

              <label className={styles.prefRow}>
                <span>
                  <strong>Analytics</strong>
                  <small>Helps us understand product browsing, auction performance, and checkout issues.</small>
                </span>
                <input
                  type="checkbox"
                  checked={prefs.analytics}
                  onChange={() => updatePref("analytics")}
                  aria-label="Allow analytics cookies"
                />
              </label>

              <label className={styles.prefRow}>
                <span>
                  <strong>Personalized shopping</strong>
                  <small>Lets us remember product interests and improve relevant offers.</small>
                </span>
                <input
                  type="checkbox"
                  checked={prefs.marketing}
                  onChange={() => updatePref("marketing")}
                  aria-label="Allow personalized shopping cookies"
                />
              </label>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostBtn} onClick={rejectOptional}>
                Reject optional
              </button>
              <button type="button" className={styles.secondaryBtn} onClick={saveSelected}>
                Save choices
              </button>
              <button type="button" className={styles.primaryBtn} onClick={acceptAll}>
                Accept all
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
