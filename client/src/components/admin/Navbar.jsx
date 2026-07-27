import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import styles from "./Navbar.module.css";
import { api } from "../../lib/api";

// react-icons
import {
  FaBars,
  FaTimes,
  FaTachometerAlt,
  FaUsers,
  FaGavel,
  FaWallet,
  FaCog,
  FaSignOutAlt,
  FaShoppingBag,
  FaClock,
  FaStar,
} from "react-icons/fa";

function getStoredPermissions() {
  try {
    const raw = localStorage.getItem("admin_permissions");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function AdminNavbar({ admin: adminProp }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [admin, setAdmin] = useState(adminProp || null);
  const [menuOpen, setMenuOpen] = useState(false);

  const adminScope = (admin?.admin_scope || localStorage.getItem("admin_scope") || "").toLowerCase();
  const isSuper = adminScope === "super";
  const permissions = admin?.permissions || getStoredPermissions();

  const navItems = useMemo(() => {
    const allItems = [
      { to: "/admin-dashboard", label: "Dashboard", icon: <FaTachometerAlt />, superOnly: true },
      { to: "/admin/management", label: "Management", icon: <FaCog /> },
      { to: "/admin/users", label: "Users", icon: <FaUsers />, permission: "users" },
      { to: "/admin/products", label: "Products", icon: <FaShoppingBag />, permission: "products" },
      { to: "/admin/auctions", label: "Auctions", icon: <FaGavel />, permission: "auctions" },
      { to: "/admin/orders", label: "Orders", icon: <FaShoppingBag />, permission: "orders" },
      { to: "/admin/payouts", label: "Payouts", icon: <FaWallet />, permission: "payouts" },
      { to: "/admin/waitlist", label: "Waitlist", icon: <FaClock />, permission: "waitlist" },
      { to: "/admin/favorites", label: "Favorites", icon: <FaStar />, permission: "favorites" },
      { to: "/admin/control", label: "Control", icon: <FaCog />, permission: "control" },
    ];

    if (isSuper) return allItems;
    return allItems.filter((item) => {
      if (item.superOnly) return false;
      if (!item.permission) return true;
      return permissions.includes(item.permission);
    });
  }, [isSuper, permissions]);

  // Close menu on route change (fixes “header preview” issue on mobile)
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (adminProp) {
      setAdmin(adminProp);
      return;
    }

    let mounted = true;
    api
      .get("/admin/profile")
      .then((res) => {
        if (mounted) setAdmin(res.data || null);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [adminProp]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("jwt");
    localStorage.removeItem("admin_scope");
    localStorage.removeItem("admin_permissions");
    navigate("/auth/login");
  };

  const homePath = isSuper ? "/admin-dashboard" : "/admin/management";

  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <div className={styles.left}>
          <button
            className={styles.brandBtn}
            onClick={() => navigate(homePath)}
            title="Admin Dashboard"
            type="button"
          >
            <span className={styles.brandDot} />
            <span className={styles.brandText}>CopupBid Admin</span>
          </button>

          {/* Desktop nav */}
          <nav className={styles.nav}>
            {navItems.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.to === "/admin-dashboard"}
                className={({ isActive }) => (isActive ? styles.active : styles.link)}
              >
                {i.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className={styles.right}>
          {admin ? (
            <div className={styles.adminBadge}>
              <div className={styles.avatar}>
                {String(admin.name || "A")
                  .trim()
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
              <div className={styles.adminMeta}>
                <div className={styles.adminName}>{admin.name}</div>
                <div className={styles.adminRole}>{admin.role}</div>
              </div>
            </div>
          ) : null}

          {/* Desktop buttons */}
          <div className={styles.desktopActions}>
            <button
              className={styles.ghostBtn}
              onClick={() => navigate("/admin/settings")}
              type="button"
            >
              Settings
            </button>

            <button className={styles.logoutBtn} onClick={logout} type="button">
              Logout
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className={styles.mobileMenuBtn}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            type="button"
          >
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <div className={`${styles.mobilePanel} ${menuOpen ? styles.mobilePanelOpen : ""}`}>
        <div className={styles.mobilePanelInner}>
          <div className={styles.mobileLinks}>
            {navItems.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.to === "/admin-dashboard"}
                className={({ isActive }) =>
                  isActive ? styles.mobileLinkActive : styles.mobileLink
                }
              >
                <span className={styles.mobileIcon}>{i.icon}</span>
                <span className={styles.mobileLabel}>{i.label}</span>
              </NavLink>
            ))}
          </div>

          <div className={styles.mobileActions}>
            <button
              className={styles.mobileActionBtn}
              onClick={() => navigate("/admin/settings")}
              type="button"
            >
              <FaCog /> <span>Settings</span>
            </button>

            <button className={styles.mobileLogoutBtn} onClick={logout} type="button">
              <FaSignOutAlt /> <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
