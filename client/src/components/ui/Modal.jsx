import { useId } from "react";
import DialogFrame from "./DialogFrame";
import styles from "./Modal.module.css";

export default function Modal({ open, title, subtitle, children, footer = null, onClose, size = "lg", closeOnOverlay = false, disableClose = false }) {
  const titleId = useId();
  const subtitleId = useId();
  if (!open) return null;
  return (
    <DialogFrame className={styles.overlay} onClose={onClose} disableClose={disableClose} closeOnOverlay={closeOnOverlay} labelledBy={titleId} describedBy={subtitle ? subtitleId : undefined}>
      <div className={`${styles.modal} ${styles[size] || styles.lg}`}>
        <div className={styles.head}>
          <div className={styles.headLeft}>
            <h2 id={titleId} className={styles.title}>{title}</h2>
            {subtitle ? <div id={subtitleId} className={styles.sub}>{subtitle}</div> : null}
          </div>
          <button className={styles.iconBtn} type="button" onClick={onClose} disabled={disableClose} aria-label="Close dialog">✕</button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </DialogFrame>
  );
}
