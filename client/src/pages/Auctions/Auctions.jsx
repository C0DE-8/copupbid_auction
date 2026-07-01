import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import styles from "./Auctions.module.css";
import coinImg from "../../assets/copupcoin.png";

export default function Auctions() {

  const prizeTiers = useMemo(
    () => [
      {
        tier: "Starter Rewards",
        perks: [
          "Airtime (₦500 – ₦5,000)",
          "Mobile Data Bundles",
          "Bonus CopUp Coins",
        ],
      },
      {
        tier: "Mid-Level Prizes",
        perks: [
          "Smart Watches",
          "Bluetooth Speakers",
          "Power Banks",
          "Headphones",
        ],
      },
      {
        tier: "Top Tier Prizes",
        perks: [
          "Smartphones (Samsung, iPhone, etc.)",
          "Gaming Consoles",
          "Laptops",
          "Large Cash Rewards",
        ],
      },
    ],
    []
  );

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.card}>
        <img src={coinImg} alt="CopUpCoin" className={styles.logo} />

        <div className={styles.badge}>COPUPBID • LIVE AUCTIONS</div>

        <h1 className={styles.title}>Win Real Prizes With CopUp Coins</h1>

        <p className={styles.subtitle}>
          Copupbid Auctions allow users to compete using <b>CopUp Coins</b> to win
          real prizes — from airtime and gadgets to premium smartphones and cash.
          Enter an auction room, bid live, and the highest bidder when the timer
          ends wins instantly.
        </p>

        {/* HOW IT WORKS */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>How Copupbid Auctions Work</div>

          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <div className={styles.stepText}>
                <b>Choose a Prize</b>
                <span>
                  Select from active auctions — phones, airtime, gadgets,
                  electronics, and limited cash rewards.
                </span>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <div className={styles.stepText}>
                <b>Pay Entry Fee</b>
                <span>
                  Each auction has an entry requirement (1 / 5 / 10+ coins)
                  depending on the prize value.
                </span>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <div className={styles.stepText}>
                <b>Live Bidding Begins</b>
                <span>
                  Place bids in real-time. Every new bid must beat the
                  current highest bid and slightly resets the countdown timer.
                </span>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNum}>4</div>
              <div className={styles.stepText}>
                <b>Highest Bidder Wins</b>
                <span>
                  When the timer reaches zero, the last highest bidder wins
                  the prize automatically.
                </span>
              </div>
            </div>
          </div>

          <div className={styles.note}>
            <b>Important:</b> Entry fees grant access to the auction room.
            Bids are separate and are paid using CopUp Coins.
          </div>
        </div>

        {/* WHAT CAN BE WON */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>What Can Be Won</div>

          <div className={styles.tiers}>
            {prizeTiers.map((tier) => (
              <div className={styles.tierCard} key={tier.tier}>
                <div className={styles.tierTop}>
                  <div className={styles.tierName}>{tier.tier}</div>
                </div>

                <ul className={styles.perks}>
                  {tier.perks.map((perk, index) => (
                    <li key={index}>{perk}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* EXAMPLE SCENARIO */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Example Auction Scenario</div>

          <div className={styles.exampleBox}>
            <div className={styles.exampleTitle}>Smartphone Auction Example</div>
            <p className={styles.exampleText}>
              An iPhone auction opens with a 10-coin entry fee.
              Starting bid begins at 50 coins.
              Bidders compete: 55 → 60 → 75 → 90 coins.
              Each bid resets the countdown slightly.
              If the timer hits zero while your 90-coin bid is highest,
              you win the phone.
            </p>
          </div>

          <div className={styles.note}>
            <b>Note:</b> CopUp Coins can be purchased and used for auctions,
            shopping, and other Copupbid competitions.
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className={styles.actions}>
          <Link to="/" className={styles.ghostBtn}>
            Back to Home
          </Link>
          <Link to="/dashboard" className={styles.ghostBtn}>
            Go to Account
          </Link>
        </div>

        <p className={styles.small}>
          Auctions are optimized for speed, fairness, anti-spam protection,
          and real-time competition. 🛡️
        </p>
      </div>
    </div>
  );
}
