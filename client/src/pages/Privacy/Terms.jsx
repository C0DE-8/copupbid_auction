import React from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import styles from "./Legal.module.css";

const updated = "July 2, 2026";

export default function Terms() {
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Legal</p>
          <h1>Terms of Use</h1>
          <p className={styles.updated}>Last updated: {updated}</p>
          <p className={styles.lead}>
            CopUpBid is an auction e-commerce platform established in 2023. These Terms govern your
            access to CopUpBid, including product browsing, purchases, auctions, waitlists, CopUpCoin,
            bid points, orders, affiliate features, and support.
          </p>
          <div className={styles.heroActions}>
            <Link to="/privacy" className={styles.secondaryLink}>
              Privacy Policy
            </Link>
          </div>
        </section>

        <section className={styles.notice}>
          These Terms are a working platform policy and should be reviewed by counsel for your final
          operating jurisdiction, dispute venue, refund rules, and consumer-law requirements.
        </section>

        <div className={styles.content}>
          <section className={styles.section}>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By using CopUpBid, you agree to these Terms and our <Link to="/privacy">Privacy Policy</Link>.
              If you do not agree, do not use the platform.
            </p>
          </section>

          <section className={styles.section}>
            <h2>2. Eligibility</h2>
            <ul>
              <li>You must be at least 18 years old or the age of majority where you live.</li>
              <li>You must provide accurate account, payment, and delivery information.</li>
              <li>You may use CopUpBid only for lawful personal or business shopping purposes.</li>
              <li>We may refuse, suspend, or close accounts where required for safety or compliance.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>3. Accounts and Security</h2>
            <p>
              You are responsible for activity under your account, including bids, purchases, wallet
              activity, and communications. Keep your login details secure and notify us immediately
              if you suspect unauthorized access.
            </p>
          </section>

          <section className={styles.section}>
            <h2>4. Products, Listings, and Pricing</h2>
            <ul>
              <li>Product descriptions, photos, prices, stock, shipping costs, and delivery estimates may change.</li>
              <li>We may correct listing errors, cancel affected orders, or issue refunds where appropriate.</li>
              <li>Some products may be available only by direct purchase, auction, promotion, or waitlist.</li>
              <li>Taxes, shipping, customs, duties, and local fees may apply depending on your location.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>5. Auctions and Bidding</h2>
            <p>When you participate in an auction, you agree that:</p>
            <ul>
              <li>Bids are binding commitments if you are declared the winner.</li>
              <li>You must have enough eligible bid points, CopUpCoin, or payment method access to participate.</li>
              <li>The highest valid bid at close may win, subject to verification and platform rules.</li>
              <li>We may extend, pause, cancel, restart, or void auctions affected by bugs, fraud, abuse, or outages.</li>
              <li>Bid manipulation, collusion, fake accounts, bots, scripts, and abusive bidding are prohibited.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>6. CopUpCoin, Bid Points, and Platform Credits</h2>
            <p>
              CopUpCoin, bid points, and similar credits are platform-use credits unless we state otherwise.
              They are not bank deposits, securities, or stored-value accounts. They generally cannot be
              exchanged for cash, transferred outside CopUpBid, or resold.
            </p>
            <ul>
              <li>Credit purchases are final unless a refund is required by law or approved by CopUpBid.</li>
              <li>We may reverse credits obtained through fraud, payment reversal, abuse, or technical error.</li>
              <li>We may set purchase limits, usage limits, expiration rules, or verification requirements.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>7. Orders, Shipping, and Delivery</h2>
            <ul>
              <li>You authorize charges for orders, winning bids, shipping, taxes, and applicable fees.</li>
              <li>Delivery estimates are not guarantees. Delays may happen due to inventory, carriers, customs, or verification.</li>
              <li>Risk of loss generally passes when the order is delivered to the address you provide.</li>
              <li>You are responsible for correct delivery details and any local import restrictions.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>8. Refunds, Returns, and Disputes</h2>
            <p>
              Cash purchases may be eligible for return or refund under the policy shown at purchase or
              required by law. Auction wins, bid-point usage, CopUpCoin usage, and promotional credits
              may be final unless we approve a correction or applicable law requires otherwise.
            </p>
            <p>
              Contact support promptly for unauthorized transactions, damaged items, missing deliveries,
              or listing errors.
            </p>
          </section>

          <section className={styles.section}>
            <h2>9. Affiliate and Promotional Features</h2>
            <p>
              Affiliate rewards, referrals, campaigns, and promotions may have separate rules, eligibility
              requirements, fraud checks, and payout thresholds. We may deny or reverse rewards connected
              to fake accounts, self-referrals, chargebacks, abuse, or policy violations.
            </p>
          </section>

          <section className={styles.section}>
            <h2>10. Prohibited Activity</h2>
            <ul>
              <li>Illegal, fraudulent, deceptive, harmful, or abusive use of CopUpBid.</li>
              <li>Bid manipulation, fake accounts, automated abuse, scraping, or unauthorized API use.</li>
              <li>Attempting to bypass security, payment controls, geographic limits, or eligibility rules.</li>
              <li>Harassing users or staff, uploading malware, or disrupting platform availability.</li>
              <li>Using another person’s account, payment method, identity, or delivery details without permission.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>11. Intellectual Property</h2>
            <p>
              CopUpBid names, logos, designs, text, images, code, and platform features are owned by
              CopUpBid or its licensors. You may not copy, modify, sell, scrape, or redistribute platform
              content except as allowed by these Terms or written permission.
            </p>
          </section>

          <section className={styles.section}>
            <h2>12. Third-Party Services</h2>
            <p>
              Payment processors, shipping providers, analytics tools, authentication providers, and other
              third-party services may have their own terms and privacy policies. We are not responsible
              for their services beyond what applicable law requires.
            </p>
          </section>

          <section className={styles.section}>
            <h2>13. Suspension and Termination</h2>
            <p>
              We may suspend or terminate access, cancel orders, void bids, restrict wallet activity, or
              remove content if we believe there is fraud, abuse, risk, legal exposure, or violation of
              these Terms.
            </p>
          </section>

          <section className={styles.section}>
            <h2>14. Disclaimers and Limitation of Liability</h2>
            <p>
              CopUpBid is provided as available. We do not guarantee uninterrupted access, error-free
              auctions, exact product availability, or that every issue will be detected before it affects
              users. To the fullest extent allowed by law, CopUpBid is not liable for indirect, incidental,
              special, consequential, punitive, lost-profit, or lost-data damages.
            </p>
          </section>

          <section className={styles.section}>
            <h2>15. Changes to the Platform or Terms</h2>
            <p>
              We may update features, prices, auction rules, policies, or these Terms as CopUpBid evolves.
              Continued use after an update means you accept the updated Terms.
            </p>
          </section>

          <section className={styles.section}>
            <h2>16. Contact</h2>
            <p>
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
