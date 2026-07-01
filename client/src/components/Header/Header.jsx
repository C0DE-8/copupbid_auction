import React, { useEffect, useState } from "react";
import styles from "./Header.module.css";
import coinImg from "../../assets/copupcoin.png";
import UserToolbar from "../UserToolbar/UserToolbar";
import { COPUP_EVENTS } from "../../lib/copupEvents";

export default function Header() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  useEffect(() => {
    const syncToken = () => setToken(localStorage.getItem("token"));

    // ✅ When other tabs change storage
    const onStorage = (e) => {
      if (e.key === "token") syncToken();
    };

    // ✅ When our app changes auth (login/logout)
    const onAuthChanged = () => syncToken();

    window.addEventListener("storage", onStorage);
    window.addEventListener(COPUP_EVENTS.AUTH_CHANGED, onAuthChanged);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(COPUP_EVENTS.AUTH_CHANGED, onAuthChanged);
    };
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="/" className={styles.brand} aria-label="CopUpBid Home">
          <img src={coinImg} alt="CopUpCoin" className={styles.logo} />
          <div className={styles.brandText}>
            <div className={styles.title}>CopUpBid</div>
            <div className={styles.sub}>Auction Shop • Buy with CopUpCoin</div>
          </div>
        </a>

        <nav className={styles.actions} aria-label="Header actions">
          {token ? (
            <UserToolbar />
          ) : (
            <>
              <a className={styles.loginBtn} href="/auth/login">
                Login
              </a>
              <a className={styles.joinBtn} href="/auth/register">
                Join
              </a>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}