import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import styles from "./Toaster.module.css";

/**
 * Usage:
 * 1) Wrap any page (or App.jsx) with <ToastProvider>
 * 2) Inside, call: const toast = useToast(); toast.success("Saved!");
 */

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message, type = "info", ttl = 1600) => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const t = { id, message: String(message || ""), type };
    setToasts((prev) => [...prev, t]);

    window.setTimeout(() => remove(id), ttl);
    return id;
  }, [remove]);

  const api = useMemo(() => {
    return {
      push,
      info: (m, ttl) => push(m, "info", ttl),
      success: (m, ttl) => push(m, "success", ttl),
      warn: (m, ttl) => push(m, "warn", ttl),
      error: (m, ttl) => push(m, "error", ttl),
      remove,
      clear: () => setToasts([]),
    };
  }, [push, remove]);

  return (
    <ToastCtx.Provider value={api}>
      {children}

      <div className={styles.wrap} aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${styles.toast} ${styles[`t_${t.type}`] || ""}`}
            role="status"
            onClick={() => remove(t.id)}
            title="Click to dismiss"
          >
            <span className={styles.dot} />
            <span className={styles.msg}>{t.message}</span>
            <button className={styles.x} type="button" onClick={() => remove(t.id)} aria-label="Dismiss">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}