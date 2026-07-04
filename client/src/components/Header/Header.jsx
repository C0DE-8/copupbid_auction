import React, { useEffect, useState } from "react";
import {
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./Header.module.css";
import coinImg from "../../assets/copupcoin.png";
import UserToolbar from "../UserToolbar/UserToolbar";
import LoginRequiredModal from "../LoginRequiredModal/LoginRequiredModal";
import { COPUP_EVENTS } from "../../lib/copupEvents";
import { api } from "../../lib/api";

function buildUsersUrl(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  return `users/${clean}`;
}

function getAuthToken() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken");
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState(() => getAuthToken());
  const [cartCount, setCartCount] = useState(0);
  const [loginModal, setLoginModal] = useState({
    open: false,
    title: "",
    message: "",
    redirectTo: "/",
  });

  useEffect(() => {
    const syncToken = () => setToken(getAuthToken());

    // ✅ When other tabs change storage
    const onStorage = (e) => {
      if (e.key === "token" || e.key === "accessToken") syncToken();
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

  useEffect(() => {
    let mounted = true;

    const fetchCartCount = async () => {
      const activeToken = getAuthToken();
      if (!activeToken) {
        if (mounted) setCartCount(0);
        return;
      }

      try {
        const [shopRes, auctionRes] = await Promise.allSettled([
          api.get(buildUsersUrl("shop/cart")),
          api.get(buildUsersUrl("cart")),
        ]);

        const shopRows =
          shopRes.status === "fulfilled"
            ? Array.isArray(shopRes.value.data)
              ? shopRes.value.data
              : Array.isArray(shopRes.value.data?.items)
              ? shopRes.value.data.items
              : []
            : [];
        const auctionRows =
          auctionRes.status === "fulfilled" && Array.isArray(auctionRes.value.data)
            ? auctionRes.value.data
            : [];

        const shopCount = shopRows.reduce((sum, item) => sum + (Number(item?.qty) || 1), 0);
        if (mounted) setCartCount(shopCount + auctionRows.length);
      } catch (_) {
        if (mounted) setCartCount(0);
      }
    };

    fetchCartCount();

    window.addEventListener(COPUP_EVENTS.AUTH_CHANGED, fetchCartCount);
    window.addEventListener(COPUP_EVENTS.CART_UPDATED, fetchCartCount);
    window.addEventListener(COPUP_EVENTS.BALANCE_UPDATED, fetchCartCount);
    window.addEventListener("storage", fetchCartCount);

    return () => {
      mounted = false;
      window.removeEventListener(COPUP_EVENTS.AUTH_CHANGED, fetchCartCount);
      window.removeEventListener(COPUP_EVENTS.CART_UPDATED, fetchCartCount);
      window.removeEventListener(COPUP_EVENTS.BALANCE_UPDATED, fetchCartCount);
      window.removeEventListener("storage", fetchCartCount);
    };
  }, [token]);

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
            {cartCount > 0 ? <span className={styles.cartBadge}>{cartCount > 99 ? "99+" : cartCount}</span> : null}
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
