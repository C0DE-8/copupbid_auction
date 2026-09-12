import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminNavbar from "../../../components/admin/Navbar";
import { api } from "../../../lib/api";
import { ArrowUpRight, Search, ShieldCheck, LayoutGrid } from "lucide-react";
import styles from "./AdminManagement.module.css";

const moduleInfo = {
  products: ["Catalog", "Create products, manage stock, and organize categories."],
  auctions: ["Catalog", "Schedule auctions and manage live bidding."],
  banners: ["Catalog", "Update the promotions shoppers see on the storefront."],
  orders: ["Operations", "Review purchases and keep fulfillment moving."],
  waitlist: ["Operations", "Review customers waiting for upcoming products."],
  favorites: ["Operations", "See the products customers are saving."],
  users: ["People", "Manage customer accounts and assigned admin access."],
  affiliates: ["People", "Review referrals and affiliate activity."],
  payouts: ["Payments", "Review withdrawal requests and payment status."],
  coins: ["Payments", "Manage CopUpCoin pricing and conversion rates."],
  coin_payments: ["Payments", "Check payment proofs and approve coin purchases."],
  pay_account: ["Payments", "Manage the accounts used to receive payments."],
  control: ["Settings", "Manage platform controls and configuration."],
};

export default function AdminManagement() {
  const [admin, setAdmin] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const [profileRes, modulesRes] = await Promise.all([
          api.get("/admin/profile"),
          api.get("/admin/management/modules"),
        ]);
        if (!mounted) return;
        setAdmin(profileRes.data || null);
        setModules(Array.isArray(modulesRes.data?.modules) ? modulesRes.data.modules : []);
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || err?.message || "Failed to load management modules");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [attempt]);

  const allowedModules = useMemo(() => modules.filter((module) => module.allowed), [modules]);

  const visibleModules = allowedModules.filter(module =>
    `${module.title} ${(moduleInfo[module.key] || []).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className={styles.page}>
      <AdminNavbar admin={admin} />

      <main className={styles.container}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>COPUPBID WORKSPACE</div>
            <h1 className={styles.title}>Let’s get to work.</h1>
            <p className={styles.sub}>
              {admin?.admin_scope === "super"
                ? "Manage your catalog, customers, and daily operations in one place."
                : "Your assigned tools, together in one place. Choose a module to get started."}
            </p>
          </div>
          <div className={styles.accessBadge}><ShieldCheck size={18} /> {loading ? "Loading workspace…" : admin?.admin_scope === "super" ? "Super admin" : "Sub-admin workspace"}</div>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.moduleCount}><LayoutGrid size={18} /> Your tools {!loading && <span>{allowedModules.length}</span>}</div>
          <label className={styles.search}><Search size={18} /><input type="search" aria-label="Find a management tool" placeholder="Find a tool…" value={query} onChange={event => setQuery(event.target.value)} /></label>
        </div>

        {error ? <div className={styles.alert} role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button></div> : null}

        <section className={styles.grid} aria-label="Management tools" aria-busy={loading}>
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={styles.card}>
                <div className={styles.skeletonTitle}>Loading</div>
                <div className={styles.skeletonLine} />
              </div>
            ))
          ) : error ? null : visibleModules.length ? (
            visibleModules.map((module) => (
              <Link key={module.key} className={styles.card} to={module.path}>
                <div className={styles.cardTop}>
                  <span className={styles.dot} />
                  <span className={styles.key}>{moduleInfo[module.key]?.[0] || "Management"}</span>
                  <ArrowUpRight size={18} className={styles.cardArrow} />
                </div>
                <h2>{module.title}</h2>
                <p>{moduleInfo[module.key]?.[1] || `Open ${module.title.toLowerCase()}.`}</p>
                <span className={styles.openTool}>Open tool <span aria-hidden="true">→</span></span>
              </Link>
            ))
          ) : (
            <div className={styles.empty}>{query ? "No tools match your search. Try another name." : "No tools have been assigned yet. Ask your super admin to update your access."}</div>
          )}
        </section>
      </main>
    </div>
  );
}
