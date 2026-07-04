import React from "react";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import SidebarFrame from "../../components/SidebarFrame/SidebarFrame";
import styles from "./Affiliate.module.css";

export default function Affiliate() {
  return (
    <div className={styles.page}>
      <Header />
      <main>
        <SidebarFrame active="account">
        <div className={styles.container}>
        <section className={styles.heroCard}>
          <div className={styles.heroTitle}>Affiliate Program</div>
          <p className={styles.heroSub}>
            Affiliate rewards are being updated. Check back soon for the new
            CopUpBid referral tools.
          </p>
        </section>
        </div>
        </SidebarFrame>
      </main>
      <Footer />
    </div>
  );
}
