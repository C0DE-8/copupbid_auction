// src/pages/NotFound/NotFound.jsx
import React from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiHelpCircle, FiHome, FiSearch, FiShoppingBag } from "react-icons/fi";
import styles from "./NotFound.module.css";
import coinImg from "../../assets/copupcoin.png";

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.glow} />

      <main className={styles.card} aria-labelledby="not-found-title">
        <div className={styles.brand}>
          <img src={coinImg} alt="CopUpBid" className={styles.logo} />
          <div>
            <span>CopUpBid</span>
            <small>Auction Shop • Buy with CopUpCoin</small>
          </div>
        </div>

        <div className={styles.iconWrap}>
          <FiSearch />
        </div>

        <p className={styles.kicker}>Page not found</p>
        <h1 id="not-found-title" className={styles.title}>We could not find that page.</h1>
        <p className={styles.text}>
          The link may be old, moved, or typed incorrectly. You can return to the marketplace and continue shopping or check active auction rooms.
        </p>

        <div className={styles.actions}>
          <Link to="/app/shop" className={styles.btnPrimary}>
            <FiShoppingBag />
            Shop
          </Link>
          <Link to="/auctions" className={styles.btnGhost}>
            <FiHome />
            Auctions
          </Link>
          <button type="button" className={styles.btnGhost} onClick={() => window.history.back()}>
            <FiArrowLeft />
            Back
          </button>
        </div>

        <Link to="/how-to-play" className={styles.helpLink}>
          <FiHelpCircle />
          Help and how it works
        </Link>
      </main>
    </div>
  );
}
