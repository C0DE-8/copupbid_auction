import React from "react";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import SidebarFrame from "../../components/SidebarFrame/SidebarFrame";
import styles from "./HowItWork.module.css";
import { FiCreditCard, FiShield, FiShoppingBag, FiTrendingUp, FiUsers } from "react-icons/fi";

export default function HowItWork() {
  const sections = [
    {
      title: "Buy CopUp Coins",
      sub: "Top up your wallet and use coins across CopUpBid.",
      icon: <FiCreditCard />,
      steps: [
        "Create or login to your account.",
        "Open your wallet and choose a top-up amount.",
        "Use your coin balance for shopping and auctions.",
      ],
    },
    {
      title: "Join Auctions",
      sub: "Bid with coins and track live auction activity.",
      icon: <FiTrendingUp />,
      steps: [
        "Open the Auctions page.",
        "Review the item, starting price, and current highest bid.",
        "Place your bid and follow the countdown until it closes.",
      ],
    },
    {
      title: "Shop Products",
      sub: "Browse products and buy directly with your balance.",
      icon: <FiShoppingBag />,
      steps: [
        "Search or filter products from the shop.",
        "Open a product to review details.",
        "Buy from the product modal and confirm your order.",
      ],
    },
    {
      title: "Win and Checkout",
      sub: "Completed wins move into your auction cart for delivery.",
      icon: <FiShield />,
      steps: [
        "Wait for the auction timer to close.",
        "If you are the winner, review the item in your cart.",
        "Submit delivery details so the CopUpBid team can process your prize.",
      ],
    },
  ];

  return (
    <div className={styles.page}>
      <Header />

      <main>
        <SidebarFrame active="help">
        <div className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.heroCard}>
            <div className={styles.heroTop}>
              <div className={styles.heroIcon}>
                <FiShoppingBag />
              </div>
              <div className={styles.heroMain}>
                <h1 className={styles.heroTitle}>How CopUpBid Works</h1>
                <p className={styles.heroSub}>
                  A quick guide to coins, auctions, and shopping on CopUpBid.
                </p>
                <div className={styles.pills}>
                  <span className={styles.pill}><FiCreditCard /> Fund wallet</span>
                  <span className={styles.pill}><FiTrendingUp /> Join auctions</span>
                  <span className={styles.pillAlt}><FiUsers /> Win and checkout</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.highlightRow}>
          <div className={styles.highlight}>
            <span className={styles.highlightLabel}>Marketplace flow</span>
            <strong className={styles.highlightValue}>Browse, fund, bid, buy, and track everything from one account.</strong>
          </div>
          <button type="button" className={styles.btnPrimary} onClick={() => (window.location.href = "/shop")}>
            Open shop
          </button>
        </section>

        <section className={styles.grid}>
          {sections.map((section) => (
            <article className={styles.card} key={section.title}>
              <div className={styles.cardHeader}>
                <div className={styles.heroIcon}>{section.icon}</div>
                <div>
                  <div className={styles.cardTitle}>{section.title}</div>
                  <div className={styles.cardSub}>{section.sub}</div>
                </div>
              </div>

              <div className={styles.steps}>
                {section.steps.map((step, index) => (
                  <div className={styles.step} key={step}>
                    <div className={styles.stepNo}>{index + 1}</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Step {index + 1}</div>
                      <div className={styles.stepText}>{step}</div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
        </div>
        </SidebarFrame>
      </main>

      <Footer />
    </div>
  );
}
