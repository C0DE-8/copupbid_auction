import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminNavbar from "../../../components/admin/Navbar";
import { api } from "../../../lib/api";
import styles from "./AdminManagement.module.css";

export default function AdminManagement() {
  const [admin, setAdmin] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  }, []);

  const allowedModules = useMemo(() => modules.filter((module) => module.allowed), [modules]);

  return (
    <div className={styles.page}>
      <AdminNavbar admin={admin} />

      <main className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Management</h1>
            <p className={styles.sub}>
              {admin?.admin_scope === "super"
                ? "Super admin access"
                : "Assigned admin tools for this account"}
            </p>
          </div>
        </header>

        {error ? <div className={styles.alert}>{error}</div> : null}

        <section className={styles.grid}>
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={styles.card}>
                <div className={styles.skeletonTitle}>Loading</div>
                <div className={styles.skeletonLine} />
              </div>
            ))
          ) : allowedModules.length ? (
            allowedModules.map((module) => (
              <Link key={module.key} className={styles.card} to={module.path}>
                <div className={styles.cardTop}>
                  <span className={styles.dot} />
                  <span className={styles.key}>{module.key}</span>
                </div>
                <h2>{module.title}</h2>
                <p>Open {module.title.toLowerCase()}.</p>
              </Link>
            ))
          ) : (
            <div className={styles.empty}>No management modules are assigned to this admin account.</div>
          )}
        </section>
      </main>
    </div>
  );
}
