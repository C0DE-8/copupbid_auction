import React, { useEffect, useState } from "react";
import { ShoppingCart, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./Header.module.css";
import coinImg from "../../assets/copupcoin.png";
import UserToolbar from "../UserToolbar/UserToolbar";
import LoginRequiredModal from "../LoginRequiredModal/LoginRequiredModal";
import { COPUP_EVENTS } from "../../lib/copupEvents";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loginModal, setLoginModal] = useState({
    open: false,
    title: "",
    message: "",
    redirectTo: "/",
  });

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

  const goAuthed = (path) => {
    if (token) {
      navigate(path);
      return;
    }

    const from = path || `${location.pathname}${location.search || ""}`;
    localStorage.setItem("copup_auth_redirect", from);
    setLoginModal({
      open: true,
      title: path === "/cart" ? "Login to view your cart" : "Login to view your profile",
      message:
        path === "/cart"
          ? "Please login or create an account to open your cart and continue checkout."
          : "Please login or create an account to open your profile and account tools.",
      redirectTo: from,
    });
  };

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
          <button
            type="button"
            className={styles.iconAction}
            onClick={() => goAuthed("/cart")}
            aria-label="Cart"
            title="Cart"
          >
            <ShoppingCart size={19} />
          </button>

          <button
            type="button"
            className={styles.iconAction}
            onClick={() => goAuthed("/profile")}
            aria-label="Profile"
            title="Profile"
          >
            <UserRound size={19} />
          </button>

          {token ? <UserToolbar /> : null}
        </nav>
      </div>
      <LoginRequiredModal
        open={loginModal.open}
        onClose={() => setLoginModal((prev) => ({ ...prev, open: false }))}
        title={loginModal.title}
        message={loginModal.message}
        redirectTo={loginModal.redirectTo}
      />
    </header>
  );
}
