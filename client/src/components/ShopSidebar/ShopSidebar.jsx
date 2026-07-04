import React, { useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  Boxes,
  CircleUserRound,
  Heart,
  HelpCircle,
  Home,
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
        if (mounted) setCategories(Array.isArray(data) ? data.slice(0, 8) : []);
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
    if (path === "/" || path === "/shop") return "home";
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

  const navItems = [
    { key: "home", label: "Home", icon: Home, onClick: onHomeClick || (() => goPublic("/shop")) },
    {
      key: "categories",
      label: "Categories",
      icon: Boxes,
      onClick: onCategoriesClick || (() => goPublic("/shop")),
    },
    {
      key: "deals",
      label: "Deals",
      icon: BadgePercent,
      onClick: onDealsClick || onCategoriesClick || (() => goPublic("/shop")),
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
  ];

  return (
    <>
      <aside className={styles.sidebar} aria-label="Shop navigation">
        <div className={styles.sideBrand}>
          <ShoppingBag size={22} />
          <span>CopUpBid</span>
        </div>

        <nav className={styles.sideNav}>
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

        <div className={styles.categoryBlock}>
          <div className={styles.sideLabel}>Shop Categories</div>
          <button type="button" className={styles.categoryItem} onClick={() => goPublic("/shop")}>
            All products
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
