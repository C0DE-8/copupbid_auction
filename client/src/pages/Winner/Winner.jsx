import React from "react";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import styles from "./Winner.module.css";
import { Trophy } from "lucide-react";

export default function Winner() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.heroCard}>
            <div className={styles.heroTop}>
              <div className={styles.heroIcon}>
                <Trophy size={22} />
              </div>
              <div className={styles.heroMain}>
                <div className={styles.heroTitle}>Winners</div>
                <div className={styles.heroSub}>
                  Auction winner history will appear here as new events close.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
