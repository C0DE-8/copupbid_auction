import React, { useEffect } from "react";
import styles from "./Modal.module.css";
export default function Modal({
  open,
  title,
  subtitle,
  children,
  footer = null,
  onClose,
  size = "lg", // sm | md | lg | xl
  closeOnOverlay = true,
  disableClose = false,
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape" && !disableClose) onClose?.();
    };

    document.addEventListener("keydown", onKey);
    // lock scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, disableClose]);

  if (!open) return null;

  const sizeClass =
    size === "sm"
      ? styles.sm
      : size === "md"
      ? styles.md
      : size === "xl"
      ? styles.xl
      : styles.lg;

  const handleOverlay = () => {
    if (disableClose) return;
    if (closeOnOverlay) onClose?.();
  };

  return (
    <div className={styles.overlay} onMouseDown={handleOverlay}>
      <div className={`${styles.modal} ${sizeClass}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.headLeft}>
            <div className={styles.title}>{title}</div>
            {subtitle ? <div className={styles.sub}>{subtitle}</div> : null}
          </div>

          <button
            className={styles.iconBtn}
            type="button"
            onClick={() => !disableClose && onClose?.()}
            disabled={disableClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className={styles.body}>{children}</div>

        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  );
}