import React, { useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  Boxes,
  ChevronDown,
  CircleUserRound,
  Heart,
  HelpCircle,
  Home,
  Cookie,
  Settings,
  ShoppingBag,
  Star,
  Tags,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./ShopSidebar.module.css";
import { api } from "../../lib/api";
import LoginRequiredModal from "../LoginRequiredModal/LoginRequiredModal";

function getAuthToken() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken");
}

function buildShopUrl(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  const base = String(api?.defaults?.baseURL || "").toLowerCase();
  const baseHasShop =
    base.includes("/shop") || base.endsWith("/shop") || base.includes("/shop/");
  return baseHasShop ? clean : `shop/${clean}`;
}

export default function ShopSidebar({
  active = "",
  onHomeClick,
  onCategoriesClick,
  onDealsClick,
  onBrowseClick,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [categories, setCategories] = useState([]);
  const [categoryOpen, setCategoryOpen] = useState(true);
  const [loginModal, setLoginModal] = useState({
    open: false,
    title: "",
    message: "",
    redirectTo: "/",
  });

  useEffect(() => {
    let mounted = true;

    const fetchCategories = async () => {
      try {
        const { data } = await api.get(buildShopUrl("public/categories"));
        if (mounted) setCategories(Array.isArray(data) ? data : []);
      } catch (_) {
        if (mounted) setCategories([]);
      }
    };

    fetchCategories();
    return () => {
      mounted = false;
    };
  }, []);

  const currentActive = useMemo(() => {
    if (active) return active;
    const path = location.pathname;
    if ((path === "/" || path === "/shop" || path === "/app/shop") && location.search.includes("category=")) return "categories";
    if ((path === "/" || path === "/shop" || path === "/app/shop") && location.search.includes("deal=featured")) return "deals";
    if (path === "/" || path === "/shop" || path === "/app/shop") return "home";
    if (path.includes("auction")) return "auctions";
    if (path.includes("winner")) return "winners";
    return path.replace("/", "") || "home";
  }, [active, location.pathname]);

  const goPublic = (path) => {
    navigate(path);
  };

  const goProtected = (path, label = "continue") => {
    if (getAuthToken()) {
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
    navigate(id ? `/shop?category=${encodeURIComponent(id)}` : "/shop");
  };

  const openCookieSettings = () => {
    window.dispatchEvent(new Event("copup-open-cookie-settings"));
  };

  const selectedCategoryId = useMemo(() => {
    const raw = new URLSearchParams(location.search).get("category");
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [location.search]);

  const navItems = [
    {
      key: "deals",
      label: "Deals",
      icon: BadgePercent,
      onClick: onDealsClick || onCategoriesClick || (() => goPublic("/shop?deal=featured#shop-featured")),
    },
    { key: "auctions", label: "Auctions", icon: Tags, onClick: () => goProtected("/auctions", "view auctions") },
    { key: "winners", label: "Winners", icon: Star, onClick: () => goProtected("/winners", "view winners") },
    { key: "help", label: "How it works", icon: HelpCircle, onClick: () => goProtected("/how-to-play", "learn how to play") },
  ];

  const accountItems = [
    { key: "cart", label: "Cart", icon: ShoppingBag, onClick: () => goProtected("/cart", "view your cart") },
    { key: "favorites", label: "Favorites", icon: Heart, onClick: () => goProtected("/favorites", "view favorites") },
    { key: "profile", label: "Profile", icon: CircleUserRound, onClick: () => goProtected("/profile", "view your profile") },
    { key: "account", label: "Account", icon: Settings, onClick: () => goProtected("/account", "manage your account") },
    { key: "cookies", label: "Cookie settings", icon: Cookie, onClick: openCookieSettings },
  ];

  return (
    <>
      <aside className={styles.sidebar} aria-label="Shop navigation">
        <div className={styles.sideBrand}>
          <ShoppingBag size={22} />
          <span>CopUpBid</span>
        </div>

        <nav className={styles.sideNav}>
          <button
            type="button"
            className={`${styles.sideItem} ${currentActive === "home" ? styles.sideItemActive : ""}`}
            onClick={onHomeClick || (() => goPublic("/"))}
          >
            <Home size={17} />
            <span>Home</span>
          </button>

          <div className={styles.categoryGroup}>
            <button
              type="button"
              className={`${styles.sideItem} ${currentActive === "categories" ? styles.sideItemActive : ""}`}
              onClick={() => {
                setCategoryOpen((open) => !open);
                onCategoriesClick?.();
              }}
              aria-expanded={categoryOpen}
            >
              <Boxes size={17} />
              <span>Categories</span>
              <ChevronDown className={`${styles.chevron} ${categoryOpen ? styles.chevronOpen : ""}`} size={16} />
            </button>

            {categoryOpen ? (
              <div className={styles.subcategoryList}>
                <button
                  type="button"
                  className={`${styles.subcategoryItem} ${selectedCategoryId === null ? styles.subcategoryActive : ""}`}
                  onClick={() => goPublic("/shop")}
                >
                  All products
                </button>
                {categories.map((category) => {
                  const id = category?.id ?? category?.category_id;
                  const n = Number(id);
                  const activeCategory = Number.isFinite(n) && selectedCategoryId === n;
                  return (
                    <button
                      key={id ?? category?.name}
                      type="button"
                      className={`${styles.subcategoryItem} ${activeCategory ? styles.subcategoryActive : ""}`}
                      onClick={() => goCategory(category)}
                    >
                      {category?.name || "Category"}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {navItems.map(({ key, label, icon, onClick }) => (
            <button
              key={key}
              type="button"
              className={`${styles.sideItem} ${currentActive === key ? styles.sideItemActive : ""}`}
              onClick={onClick}
            >
              {React.createElement(icon, { size: 17 })}
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.sideDivider} />

        <nav className={styles.sideNav}>
          {accountItems.map(({ key, label, icon, onClick }) => (
            <button
              key={key}
              type="button"
              className={`${styles.sideItem} ${currentActive === key ? styles.sideItemActive : ""}`}
              onClick={onClick}
            >
              {React.createElement(icon, { size: 17 })}
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.offerCard}>
          <span>Special offer</span>
          <strong>Shop featured drops</strong>
          <button type="button" onClick={onBrowseClick || onCategoriesClick || (() => goPublic("/shop"))}>
            Browse
          </button>
        </div>
      </aside>

      <LoginRequiredModal
        open={loginModal.open}
        onClose={() => setLoginModal((prev) => ({ ...prev, open: false }))}
        title={loginModal.title}
        message={loginModal.message}
        redirectTo={loginModal.redirectTo}
      />
    </>
  );
}
