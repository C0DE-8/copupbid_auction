import React from "react";
import styles from "./Footer.module.css";
import coinImg from "../../assets/copupcoin.png";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <img src={coinImg} alt="CopUpCoin" className={styles.logo} />
          <div>
            <div className={styles.title}>CopUpBid</div>
            <div className={styles.sub}>Where Deals Meet Dreams</div>
          </div>
        </div>

        <div className={styles.links}>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/how-to-play">Support</a>
        </div>
      </div>

      <div className={styles.copy}>© CopUpBid • Auction shop powered by CopUpCoin</div>
    </footer>
  );
}
