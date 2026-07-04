import React from "react";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import SidebarFrame from "../../components/SidebarFrame/SidebarFrame";
import styles from "./Affiliate.module.css";
import { FiGift, FiLink, FiShoppingBag, FiTrendingUp, FiUsers } from "react-icons/fi";

export default function Affiliate() {
  const cards = [
    {
      icon: <FiLink />,
      title: "Referral tools",
      text: "Your sharing links and auction referral tools will appear here when the new program opens.",
    },
    {
      icon: <FiUsers />,
      title: "Invite bidders",
      text: "Share CopUpBid with friends, buyers, and auction communities once referrals are active.",
    },
    {
      icon: <FiGift />,
      title: "Earn rewards",
      text: "Track eligible referrals, completed activities, and rewards from this page.",
    },
  ];

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <SidebarFrame active="account">
        <div className={styles.container}>
          <section className={styles.heroCard}>
            <div className={styles.heroTop}>
              <div className={styles.heroIcon}>
                <FiTrendingUp />
              </div>
              <div className={styles.heroMain}>
                <div className={styles.heroTitle}>Affiliate Program</div>
                <p className={styles.heroSub}>
                  CopUpBid referral rewards are being upgraded for shoppers, auction bidders, and community promoters.
                </p>
                <div className={styles.pills}>
                  <span className={styles.pill}><FiUsers /> Invite users</span>
                  <span className={styles.pillAlt}><FiShoppingBag /> Promote auctions</span>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.programGrid}>
            {cards.map((card) => (
              <article className={styles.programCard} key={card.title}>
                <div className={styles.programIcon}>{card.icon}</div>
                <div className={styles.cardTitle}>{card.title}</div>
                <div className={styles.cardSub}>{card.text}</div>
              </article>
            ))}
          </section>

          <section className={styles.stateCard}>
            <div className={styles.stateTop}>
              <div className={styles.stateIcon}>
                <FiGift />
              </div>
              <div>
                <div className={styles.stateTitle}>Referral dashboard coming soon</div>
                <div className={styles.stateSub}>
                  The page is ready for referral links, progress, and payouts when the affiliate program is enabled.
                </div>
              </div>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.btnPrimary} onClick={() => (window.location.href = "/shop")}>
                Browse shop
              </button>
              <button type="button" className={styles.btnGhost} onClick={() => (window.location.href = "/auctions")}>
                View auctions
              </button>
            </div>
          </section>
        </div>
        </SidebarFrame>
      </main>
      <Footer />
    </div>
  );
}
