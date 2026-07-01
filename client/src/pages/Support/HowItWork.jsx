import React from "react";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import styles from "./HowItWork.module.css";
import { FiCreditCard, FiShoppingBag, FiTrendingUp } from "react-icons/fi";

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
  ];

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.container}>
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
              </div>
            </div>
          </div>
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
      </main>

      <Footer />
    </div>
  );
}
