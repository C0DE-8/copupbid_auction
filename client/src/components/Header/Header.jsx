import React, { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  ChevronDown,
  Gavel,
  HelpCircle,
  Home,
  Menu,
  ShoppingCart,
  Store,
  Trophy,
  UserRound,
  X,
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

function buildShopUrl(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  const base = String(api?.defaults?.baseURL || "").toLowerCase();
  const baseHasShop =
    base.includes("/shop") || base.endsWith("/shop") || base.includes("/shop/");
  return baseHasShop ? clean : `shop/${clean}`;
}

function getAuthToken() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken");
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState(() => getAuthToken());
  const [cartCount, setCartCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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

  useEffect(() => {
    let mounted = true;

    const fetchCategories = async () => {
      try {
        const { data } = await api.get(buildShopUrl("public/categories"));
        if (mounted) setCategories(Array.isArray(data) ? data.slice(0, 12) : []);
      } catch (_) {
        if (mounted) setCategories([]);
      }
    };

    fetchCategories();
    return () => {
      mounted = false;
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

  const goPublic = (path) => {
    setMobileOpen(false);
    setCategoryOpen(false);
    navigate(path);
  };

  const goProtected = (path, label = "continue") => {
    setMobileOpen(false);
    setCategoryOpen(false);
    if (token) {
      navigate(path);
      return;
    }

    localStorage.setItem("copup_auth_redirect", path);
    setLoginModal({
      open: true,
      title: `Login to ${label}`,
      message: "Please login or create an account to continue from where you started.",
      redirectTo: path,
    });
  };

  const goCategory = (category) => {
    const id = category?.id ?? category?.category_id;
    setMobileOpen(false);
    setCategoryOpen(false);
    navigate(id ? `/shop?category=${encodeURIComponent(id)}` : "/shop");
  };

  const categoryLabel = useMemo(() => {
    if (!categories.length) return "Categories";
    return `Categories (${categories.length})`;
  }, [categories.length]);

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

        <nav className={styles.primaryNav} aria-label="Primary navigation">
          <button type="button" className={styles.navLink} onClick={() => goPublic("/")}>
            <Home size={16} />
            Home
          </button>
          <button type="button" className={styles.navLink} onClick={() => goPublic("/shop")}>
            <Store size={16} />
            Shop
          </button>

          <div className={styles.categoryWrap}>
            <button
              type="button"
              className={styles.navLink}
              onClick={() => setCategoryOpen((open) => !open)}
              aria-expanded={categoryOpen}
            >
              <Boxes size={16} />
              {categoryLabel}
              <ChevronDown size={15} />
            </button>

            {categoryOpen ? (
              <div className={styles.categoryMenu}>
                <button type="button" className={styles.categoryItem} onClick={() => goPublic("/shop")}>
                  All categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category?.id ?? category?.category_id ?? category?.name}
                    type="button"
                    className={styles.categoryItem}
                    onClick={() => goCategory(category)}
                  >
                    {category?.name || "Category"}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button type="button" className={styles.navLink} onClick={() => goProtected("/auctions", "view auctions")}>
            <Gavel size={16} />
            Auctions
          </button>
          <button type="button" className={styles.navLink} onClick={() => goProtected("/winners", "view winners")}>
            <Trophy size={16} />
            Winners
          </button>
          <button type="button" className={styles.navLink} onClick={() => goProtected("/how-to-play", "learn how to play")}>
            <HelpCircle size={16} />
            Help
          </button>
        </nav>

        <nav className={styles.actions} aria-label="Header actions">
          <button
            type="button"
            className={`${styles.iconAction} ${styles.menuBtn}`}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            title="Menu"
          >
            <Menu size={20} />
          </button>

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

      <div
        className={`${styles.mobileOverlay} ${mobileOpen ? styles.mobileOverlayOpen : ""}`}
        onClick={() => setMobileOpen(false)}
      />
      <aside className={`${styles.mobileDrawer} ${mobileOpen ? styles.mobileDrawerOpen : ""}`}>
        <div className={styles.drawerTop}>
          <div className={styles.drawerBrand}>
            <img src={coinImg} alt="" />
            <span>CopUpBid Menu</span>
          </div>
          <button type="button" className={styles.drawerClose} onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className={styles.drawerSection}>
          <button type="button" onClick={() => goPublic("/")}>
            <Home size={17} /> Home
          </button>
          <button type="button" onClick={() => goPublic("/shop")}>
            <Store size={17} /> Shop all products
          </button>
          <button type="button" onClick={() => goProtected("/auctions", "view auctions")}>
            <Gavel size={17} /> Auctions
          </button>
          <button type="button" onClick={() => goProtected("/cart", "view your cart")}>
            <ShoppingCart size={17} /> Cart {cartCount ? `(${cartCount})` : ""}
          </button>
          <button type="button" onClick={() => goProtected("/profile", "view your profile")}>
            <UserRound size={17} /> Profile
          </button>
          <button type="button" onClick={() => goProtected("/winners", "view winners")}>
            <Trophy size={17} /> Winners
          </button>
          <button type="button" onClick={() => goProtected("/how-to-play", "learn how to play")}>
            <HelpCircle size={17} /> How it works
          </button>
        </div>

        <div className={styles.drawerCategoryBlock}>
          <div className={styles.drawerLabel}>Categories</div>
          <button type="button" className={styles.drawerCategory} onClick={() => goPublic("/shop")}>
            All categories
          </button>
          {categories.map((category) => (
            <button
              key={category?.id ?? category?.category_id ?? category?.name}
              type="button"
              className={styles.drawerCategory}
              onClick={() => goCategory(category)}
            >
              {category?.name || "Category"}
            </button>
          ))}
        </div>
      </aside>
    </header>
  );
}
