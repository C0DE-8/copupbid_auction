import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./AdminDashboard.module.css";
import AdminNavbar from "../../components/admin/Navbar";
import { api } from "../../lib/api";

// react-icons
import {
  FaUsers,
  FaGavel,
  FaFlask,
  FaWallet,
  FaLink,
  FaShoppingBag,
  FaClock,
  FaCoins,
  FaStar,
  FaShieldAlt,
} from "react-icons/fa";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);

  const [admin, setAdmin] = useState(null);

  const [totalUsers, setTotalUsers] = useState(0);
  const [activeAuctions, setActiveAuctions] = useState(0);
  const [activeHeists, setActiveHeists] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState(0);

  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const safeNumber = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        // Load all dashboard needs in parallel
        const [
          profileRes,
          usersCountRes,
          auctionsActiveRes,
          heistsRes,
          payoutsPendingRes,
        ] = await Promise.all([
          api.get("/admin/profile"),
          api.get("/admin/user/count"),
          api.get("/admin/auctions", {
            params: { status: "active", page: 1, limit: 1 },
          }),
          api.get("/admin/heists"), // ✅ FIXED: use main heists route
          api.get("/admin/payouts", { params: { status: "pending" } }),
        ]);

        if (!mounted) return;

        // profile
        setAdmin(profileRes.data || null);

        // total users
        setTotalUsers(safeNumber(usersCountRes.data?.total_users));

        // active auctions (route returns { page, limit, total, data })
        setActiveAuctions(safeNumber(auctionsActiveRes.data?.total));

        // ✅ ACTIVE HEISTS COUNT (from /admin/heists)
        const heists = heistsRes.data?.data || [];

        // Define what "active" means
        // Here: hold OR started
        const activeCount = heists.filter((h) => {
          const st = String(h?.status || "").toLowerCase();
          return st === "hold" || st === "started";
        }).length;

        setActiveHeists(activeCount);

        // pending payouts (route returns array)
        setPendingPayouts(
          Array.isArray(payoutsPendingRes.data)
            ? payoutsPendingRes.data.length
            : 0
        );
      } catch (e) {
        console.error("AdminDashboard load error:", e);
        if (!mounted) return;
        setError(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load dashboard data"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(
    () => [
      { label: "Total Users", value: totalUsers, tone: "green" },
      { label: "Active Auctions", value: activeAuctions, tone: "blue" },
      { label: "Active Heists", value: activeHeists, tone: "purple" },
      { label: "Pending Payouts", value: pendingPayouts, tone: "gold" },
    ],
    [totalUsers, activeAuctions, activeHeists, pendingPayouts]
  );

  const modules = useMemo(
    () => [
      {
        title: "Users Management",
        desc: "Manage user accounts and permissions",
        to: "/admin/users",
        icon: <FaUsers />,
        accent: "green",
        cta: "View & Manage Users",
      },
      {
        title: "Banner Management",
        desc: "Manage banner content and visibility",
        to: "/admin/banner",
        icon: <FaShieldAlt />,
        accent: "red",
        cta: "View & Manage Banner",
      },
      {
        title: "Auction Management",
        desc: "Create and manage auctions",
        to: "/admin/auctions",
        icon: <FaGavel />,
        accent: "blue",
        cta: "Manage Auctions",
      },
      {
        title: "Heist Management",
        desc: "Create and manage heist games",
        to: "/admin/heists",
        icon: <FaFlask />,
        accent: "purple",
        cta: "Manage Heists",
      },
      {
        title: "Affiliate Management",
        desc: "Generate links, track referrals & rewards",
        to: "/admin/affiliates",
        icon: <FaLink />,
        accent: "cyan",
        cta: "Manage Affiliates",
      },
      {
        title: "Payout Management",
        desc: "Process user payouts and withdrawals",
        to: "/admin/payouts",
        icon: <FaWallet />,
        accent: "green",
        cta: "Manage Payouts",
      },
      {
        title: "Pay Account",
        desc: "Manage payment account details",
        to: "/admin/pay-account",
        icon: <FaWallet />,
        accent: "red",
        cta: "Update Account",
      },
            {
        title: "Coin pay Management",
        desc: "Manage pay coin",
        to: "/admin/coin-pay-in",
        icon: <FaCoins />,
        accent: "gold",
        cta: "Manage Coins",
      },
      {
        title: "Product Management",
        desc: "Add, edit and manage products",
        to: "/admin/products",
        icon: <FaShoppingBag />,
        accent: "indigo",
        cta: "Manage Products",
      },
      {
        title: "Waitlist",
        desc: "View and manage users on the wait-list",
        to: "/admin/waitlist",
        icon: <FaClock />,
        accent: "cyan",
        cta: "View Waitlist",
      },
      {
        title: "Orders Management",
        desc: "View and manage orders",
        to: "/admin/orders",
        icon: <FaShoppingBag />,
        accent: "purple",
        cta: "Manage Orders",
      },
      {
        title: "Favorites Summary",
        desc: "View most favorited items and user favorites",
        to: "/admin/favorites",
        icon: <FaStar />,
        accent: "pink",
        cta: "View Favorites",
      },
      {
        title: "Coin Management",
        desc: "Set and update coin exchange rates",
        to: "/admin/coins",
        icon: <FaStar />,
        accent: "gold",
        cta: "Manage Coins",
      },
      {
        title: "Demo & Heist Control",
        desc: "Manage cop users, participants & winners",
        to: "/admin/control",
        icon: <FaShieldAlt />,
        accent: "green",
        cta: "Open Control Panel",
      },
    ],
    []
  );

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />
      <AdminNavbar admin={admin} />

      <main className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Admin Dashboard</h1>

          {admin ? (
            <p className={styles.subtitle}>
              Welcome back, <strong>{admin.name}</strong> (@{admin.username}) •{" "}
              <strong>{admin.role}</strong>
            </p>
          ) : (
            <p className={styles.subtitle}>
              Monitor platform activity and manage everything from one place.
            </p>
          )}
        </header>

        {error ? (
          <div
            style={{
              border: "1px solid rgba(248,113,113,0.25)",
              background: "rgba(248,113,113,0.08)",
              padding: 14,
              borderRadius: 14,
              marginBottom: 14,
              color: "rgba(255,255,255,0.9)",
            }}
          >
            {error}
          </div>
        ) : null}

        <section className={styles.statsGrid}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={styles.statCard}
                  style={{ opacity: 0.65 }}
                >
                  <div className={styles.statValue}>…</div>
                  <div className={styles.statLabel}>Loading</div>
                </div>
              ))
            : stats.map((s) => (
                <div key={s.label} className={styles.statCard}>
                  <div
                    className={`${styles.statValue} ${styles["tone_" + s.tone]}`}
                  >
                    {s.value}
                  </div>
                  <div className={styles.statLabel}>{s.label}</div>
                </div>
              ))}
        </section>

        <section className={styles.modulesGrid}>
          {modules.map((m) => (
            <div key={m.title} className={styles.moduleCard}>
              <div
                className={`${styles.iconWrap} ${styles["accent_" + m.accent]}`}
                style={{ fontSize: 18 }}
              >
                {m.icon}
              </div>

              <div className={styles.moduleBody}>
                <h3 className={styles.moduleTitle}>{m.title}</h3>
                <p className={styles.moduleDesc}>{m.desc}</p>

                <Link
                  to={m.to}
                  className={`${styles.moduleLink} ${
                    styles["accentText_" + m.accent]
                  }`}
                >
                  {m.cta} <span className={styles.arrow}>→</span>
                </Link>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}