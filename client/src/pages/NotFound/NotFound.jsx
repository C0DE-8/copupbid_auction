// src/pages/NotFound/NotFound.jsx
import React from "react";
import { Link } from "react-router-dom";
import styles from "./NotFound.module.css";
import coinImg from "../../assets/copupcoin.png";

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.glow}></div>

      <div className={styles.card}>
        <img src={coinImg} alt="CopUpCoin" className={styles.logo} />

        <h1 className={styles.title}>404</h1>
        <p className={styles.subtitle}>Oops... This page doesn’t exist.</p>

        <p className={styles.text}>
          Looks like you tried to heist a page that isn’t here.
        </p>

        <Link to="/" className={styles.btn}>
          Return to Home
        </Link>
      </div>
    </div>
  );
}
