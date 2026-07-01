import React from "react";
import AdminNavbar from "../../components/admin/Navbar";
import styles from "./AdminControl.module.css";

export default function AdminControl() {
  return (
    <div className={styles.page}>
      <AdminNavbar />
      <main className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Admin Control</h1>
            <p className={styles.sub}>Platform control tools are being updated.</p>
          </div>
        </div>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2>Control Panel</h2>
              <p className={styles.sub}>
                Demo controls and advanced admin tools will appear here when available.
              </p>
            </div>
          </div>
          <div className={styles.emptyBox}>No control actions are available right now.</div>
        </section>
      </main>
    </div>
  );
}
