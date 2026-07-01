import React from "react";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import styles from "./Affiliate.module.css";

export default function Affiliate() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.container}>
        <section className={styles.heroCard}>
          <div className={styles.heroTitle}>Affiliate Program</div>
          <p className={styles.heroSub}>
            Affiliate rewards are being updated. Check back soon for the new
            CopUpBid referral tools.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
