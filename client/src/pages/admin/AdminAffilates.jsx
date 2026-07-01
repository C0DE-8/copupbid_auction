import React from "react";
import AdminNavbar from "../../components/admin/Navbar";
import styles from "./AdminAffiliates.module.css";

export default function AdminAffilates() {
  return (
    <div className={styles.page}>
      <AdminNavbar />
      <main className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleWrap}>
            <h1 className={styles.title}>Affiliate Management</h1>
            <p className={styles.subtitle}>
              Affiliate tools are being updated for the current CopUpBid flow.
            </p>
          </div>
        </div>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div className={styles.cardTitle}>No active affiliate rules</div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.centerMuted}>
              Create new auction or shop referral rules when the updated affiliate
              program is ready.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
