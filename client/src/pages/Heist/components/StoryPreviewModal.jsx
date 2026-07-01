// StoryPreviewModal.jsx
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./StoryPreviewModal.module.css";

export default function StoryPreviewModal({ open, title, story, onClose }) {
  const closeBtnRef = useRef(null);

  // ✅ Body scroll lock while modal open
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow || "";
    };
  }, [open]);

  // ✅ ESC closes
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKey);
    setTimeout(() => closeBtnRef.current?.focus?.(), 0);

    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const full = String(story || "").trim();

  const node = (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Story preview"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <div className={styles.headLeft}>
            <div className={styles.kicker}>STORY PREVIEW</div>
            <div className={styles.title}>{title || "Heist Story"}</div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close story preview"
          >
            ✕
          </button>
        </div>

        {/* ✅ Full story (single panel, scrolls) */}
        <div className={styles.fullWrap}>
          <div className={styles.fullStory}>
            {full || "—"}
          </div>
          <div className={styles.fade} aria-hidden="true" />
        </div>

        <div className={styles.foot}>
          <button type="button" className={styles.done} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}