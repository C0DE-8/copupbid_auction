// src/components/Toast/ToastContext.jsx

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import styles from "./Toast.module.css";
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from "react-icons/fi";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((type, message, duration = 3500) => {
    const id = ++idCounter;

    const toast = { id, type, message };

    setToasts((prev) => [...prev, toast]);

    if (duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const api = useMemo(() => ({
    success: (msg, duration) => pushToast("success", msg, duration),
    error: (msg, duration) => pushToast("error", msg, duration),
    info: (msg, duration) => pushToast("info", msg, duration),
  }), [pushToast]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Toast UI */}
      <div className={styles.toastContainer}>
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
            <div className={styles.icon}>
              {t.type === "success" && <FiCheckCircle />}
              {t.type === "error" && <FiAlertCircle />}
              {t.type === "info" && <FiInfo />}
            </div>

            <div className={styles.message}>{t.message}</div>

            <button
              className={styles.close}
              onClick={() => removeToast(t.id)}
            >
              <FiX />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
}