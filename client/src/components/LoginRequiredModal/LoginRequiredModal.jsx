import React from "react";
import { Link } from "react-router-dom";
import authStyles from "../../pages/Auth/Auth.module.css";
import styles from "./LoginRequiredModal.module.css";

export default function LoginRequiredModal({ open, onClose, title, message }) {
  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={authStyles.card}>
          <div className={authStyles.cardHead}>
            <div className={authStyles.brandRow}>
              <div className={styles.lockIcon}>🔒</div>
              <div className={authStyles.brandText}>
                <h1 className={authStyles.brandTitle}>
                  {title || "Please login to continue"}
                </h1>
                <div className={authStyles.brandSub}>
                  {message ||
                    "You can browse freely, but you must login to buy, bid, heist, or favorite items."}
                </div>
              </div>
            </div>
          </div>

          <div className={authStyles.cardBody}>
            <div className={authStyles.actions}>
              <Link to="/auth/login" className={authStyles.btnPrimary}>
                Login
              </Link>

              <Link to="/auth/register" className={authStyles.btnGhost}>
                Create account
              </Link>

              <button
                type="button"
                className={authStyles.btnGhost}
                onClick={onClose}
              >
                Close
              </button>
            </div>

            <div className={authStyles.hr} />
            <div className={authStyles.miniRow}>
              <span className={authStyles.helper}>
                You’ll return to the shop after you login.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* click outside closes */}
      <button className={styles.backdropBtn} onClick={onClose} aria-label="Close" />
    </div>
  );
}