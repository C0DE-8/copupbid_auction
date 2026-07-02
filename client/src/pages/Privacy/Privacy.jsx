import React from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import styles from "./Legal.module.css";

const updated = "July 2, 2026";

export default function Privacy() {
  const openCookieSettings = () => {
    window.dispatchEvent(new CustomEvent("copup-open-cookie-settings"));
  };

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Legal</p>
          <h1>Privacy Policy</h1>
          <p className={styles.updated}>Last updated: {updated}</p>
          <p className={styles.lead}>
            CopUpBid is an auction e-commerce platform established in 2023. This Privacy Policy
            explains how we collect, use, store, protect, and share information when you browse
            products, create an account, shop, place bids, join waitlists, use CopUpCoin, or contact
            support.
          </p>
          <div className={styles.heroActions}>
            <Link to="/terms" className={styles.secondaryLink}>
              Terms of Use
            </Link>
            <button type="button" className={styles.primaryBtn} onClick={openCookieSettings}>
              Manage cookie settings
            </button>
          </div>
        </section>

        <section className={styles.notice}>
          This page is a platform policy, not legal advice. If you need jurisdiction-specific terms
          for your operating country or state, have counsel review it before publishing.
        </section>

        <div className={styles.content}>
          <section className={styles.section}>
            <h2>1. Information We Collect</h2>
            <p>We collect information you provide directly, including:</p>
            <ul>
              <li>Account details such as name, username, email, password, phone, and profile data.</li>
              <li>Shipping, billing, order, checkout, return, refund, and support information.</li>
              <li>Auction activity such as entries, bids, waitlist activity, wins, and order status.</li>
              <li>CopUpCoin and bid-point purchase records, balances, and transaction history.</li>
              <li>Messages, reviews, feedback, dispute details, and customer support communications.</li>
            </ul>
            <p>We also collect technical information automatically when you use CopUpBid:</p>
            <ul>
              <li>IP address, approximate location, browser, device type, operating system, and identifiers.</li>
              <li>Pages viewed, products opened, search activity, buttons clicked, and time spent.</li>
              <li>Security logs used to prevent fraud, abuse, bot activity, and unauthorized access.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>2. Cookies and Similar Technologies</h2>
            <p>
              We use essential cookies and local storage to keep login, cart, checkout, auctions,
              payment results, security, and cookie preferences working. Optional cookies may support
              analytics and personalized shopping if you allow them.
            </p>
            <ul>
              <li>Essential cookies are required for core shopping, account, and security features.</li>
              <li>Analytics helps us understand product browsing, auction flows, and checkout issues.</li>
              <li>Personalized shopping helps us remember product interests and improve relevant offers.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>3. How We Use Information</h2>
            <ul>
              <li>Operate the store, auctions, cart, checkout, account, wallet, and support features.</li>
              <li>Process purchases, winning bids, payments, deliveries, refunds, and service notices.</li>
              <li>Protect users, detect fraud, enforce limits, investigate abuse, and secure accounts.</li>
              <li>Improve product listings, auction performance, customer support, and site reliability.</li>
              <li>Send transactional messages and, where allowed, promotional updates or offers.</li>
              <li>Comply with tax, accounting, dispute, legal, regulatory, and law-enforcement obligations.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>4. How We Share Information</h2>
            <p>We may share information with trusted parties when needed to run the platform:</p>
            <ul>
              <li>Payment processors, wallet providers, banks, and fraud-prevention vendors.</li>
              <li>Shipping, delivery, return, warehouse, and logistics partners.</li>
              <li>Hosting, analytics, email, SMS, customer support, and security service providers.</li>
              <li>Merchants, campaign partners, or affiliates when needed for a specific order or promotion.</li>
              <li>Authorities, courts, regulators, or advisers where required by law or to protect rights.</li>
            </ul>
            <p>
              We do not sell personal information as a standalone product. If a future practice is
              treated as a sale or targeted advertising under applicable privacy law, we will provide
              the required disclosures and choices.
            </p>
          </section>

          <section className={styles.section}>
            <h2>5. Payments, Auctions, and Fraud Prevention</h2>
            <p>
              Auction e-commerce requires additional verification and fraud controls. We may review
              payment signals, bidding patterns, account history, delivery data, device information,
              and support reports to detect suspicious activity, fake accounts, collusion, chargeback
              abuse, or attempts to manipulate auction outcomes.
            </p>
          </section>

          <section className={styles.section}>
            <h2>6. Data Retention</h2>
            <p>
              We keep information for as long as needed to provide CopUpBid, support accounts and
              orders, resolve disputes, prevent fraud, and meet legal, tax, accounting, and regulatory
              obligations. When data is no longer needed, we delete, anonymize, or securely archive it.
            </p>
          </section>

          <section className={styles.section}>
            <h2>7. Your Choices and Rights</h2>
            <p>Depending on where you live, you may have rights to:</p>
            <ul>
              <li>Access, correct, update, delete, or receive a copy of certain personal information.</li>
              <li>Object to or restrict certain processing.</li>
              <li>Withdraw consent for optional cookies or marketing communications.</li>
              <li>Appeal or complain if you believe your request was not handled properly.</li>
            </ul>
            <p>
              You can update account details in your profile where available. For privacy requests,
              contact us using the details below.
            </p>
          </section>

          <section className={styles.section}>
            <h2>8. Security</h2>
            <p>
              We use reasonable administrative, technical, and organizational safeguards, including
              access controls, HTTPS, monitoring, and fraud checks. No online service can be completely
              secure, so you are responsible for protecting your password and logging out of shared
              devices.
            </p>
          </section>

          <section className={styles.section}>
            <h2>9. Children</h2>
            <p>
              CopUpBid is intended for adults. You must be at least 18 years old, or the age of
              majority in your jurisdiction, to create an account, buy products, or participate in auctions.
            </p>
          </section>

          <section className={styles.section}>
            <h2>10. International Use</h2>
            <p>
              Your information may be processed in countries other than where you live. When required,
              we use appropriate safeguards for cross-border transfers.
            </p>
          </section>

          <section className={styles.section}>
            <h2>11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy as CopUpBid grows. If we make material changes, we
              will update this page and may provide an in-app or email notice.
            </p>
          </section>

          <section className={styles.section}>
            <h2>12. Contact</h2>
            <p>
              Privacy: <a href="mailto:privacy@copupbid.com">privacy@copupbid.com</a>
              <br />
              Support: <a href="mailto:support@copupbid.com">support@copupbid.com</a>
              <br />
              Website: <a href="https://copupbid.com">https://copupbid.com</a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
