import React from "react";
import AdminNavbar from "../../components/admin/Navbar";
import styles from "./AdminWaitlist.module.css";
import { FaClock, FaGavel } from "react-icons/fa";

export default function AdminWaitlist() {
  return (
    <div className={styles.page}>
      <AdminNavbar />
      <main className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Waitlist</h1>
            <p className={styles.subtitle}>
              Waitlist management is now focused on auction queues.
            </p>
          </div>
        </header>

        <section className={styles.card}>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <FaClock />
            </div>
            <div className={styles.emptyTitle}>Auction waitlist tools</div>
            <div className={styles.emptyDesc}>
              Use the auction management page to create and manage auction
              entries. Legacy mixed-mode waitlist controls have been removed.
            </div>
            <a className={styles.primaryBtn} href="/admin/auctions">
              <FaGavel /> Open Auctions
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
