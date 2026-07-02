// src/components/UserToolbar/UserToolbar.jsx

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Store,
  Gavel,
  ShoppingCart,
  TrendingUp,
  Heart,
  Users,
  Trophy,
  HelpCircle,
  LogOut,
  UserRound,
  Coins,
  Target,
} from "lucide-react";
import styles from "./UserToolbar.module.css";
import { api, imgUrl } from "../../lib/api";
import { COPUP_EVENTS, emitAuthChanged } from "../../lib/copupEvents";

export default function UserToolbar() {
  const nav = useNavigate();

  // ✅ token must be reactive (not useMemo), so UI updates instantly without refresh
  const [token, setToken] = useState(() => localStorage.getItem("token") || localStorage.getItem("accessToken"));

  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const displayName = profile?.full_name || profile?.username || "User";

  // ✅ IMPORTANT: convert "uploads/xxx.jpg" -> "http://host/uploads/xxx.jpg"
  const profileImageSrc = useMemo(() => {
    const p = profile?.profile;
    return p ? imgUrl(p) : "";
  }, [profile?.profile]);

  const go = (path) => {
    setOpen(false);
    nav(path);
  };

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setProfile(null);
    setOpen(false);

    // ✅ update token state instantly
    setToken(null);

    // ✅ notify app that auth changed (Header + other listeners)
    emitAuthChanged();

    nav("/", { replace: true });
  }, [nav]);

  // ✅ 1) keep token in sync (login/logout in same tab and other tabs)
  useEffect(() => {
    const syncToken = () =>
      setToken(localStorage.getItem("token") || localStorage.getItem("accessToken"));

    const onStorage = (e) => {
      if (e.key === "token" || e.key === "accessToken") syncToken();
    };

    const onAuthChanged = () => syncToken();

    window.addEventListener("storage", onStorage);
    window.addEventListener(COPUP_EVENTS.AUTH_CHANGED, onAuthChanged);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(COPUP_EVENTS.AUTH_CHANGED, onAuthChanged);
    };
  }, []);

  // ✅ 2) fetch profile (and reuse it for balance refresh)
  const fetchProfile = useCallback(async () => {
    const t = localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!t) {
      setProfile(null);
      return;
    }

    setLoading(true);
    try {
      // your axios instance already adds Bearer token via interceptor,
      // but we keep this safe explicit header too.
      const { data } = await api.get("/users/profile", {
        headers: { Authorization: `Bearer ${t}` },
      });

      setProfile(data);

      // ✅ optional cache for instant UI usage
      if (data?.bid_points !== undefined && data?.bid_points !== null) {
        localStorage.setItem("copup_bid_points", String(data.bid_points));
      }
      if (data?.task_coin !== undefined && data?.task_coin !== null) {
        localStorage.setItem("copup_task_coin", String(data.task_coin));
      }
    } catch (err) {
      const code = err?.response?.status;
      if (code === 401 || code === 403) logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  // ✅ initial load + when token changes
  useEffect(() => {
    if (!token) return;
    fetchProfile();
  }, [token, fetchProfile]);

  // ✅ 3) listen for balance updates (buy/bid) and refetch immediately
  useEffect(() => {
    const onBalance = () => {
      // quick instant update from cached values (optional)
      const bidCached = localStorage.getItem("copup_bid_points");
      const taskCached = localStorage.getItem("copup_task_coin");

      if (bidCached !== null || taskCached !== null) {
        setProfile((prev) => ({
          ...(prev || {}),
          bid_points: bidCached !== null ? Number(bidCached) || 0 : prev?.bid_points,
          task_coin: taskCached !== null ? Number(taskCached) || 0 : prev?.task_coin,
        }));
      }

      // real update from server (source of truth)
      fetchProfile();
    };

    window.addEventListener(COPUP_EVENTS.BALANCE_UPDATED, onBalance);
    return () => window.removeEventListener(COPUP_EVENTS.BALANCE_UPDATED, onBalance);
  }, [fetchProfile]);

  if (!token) return null;

  return (
    <>
      {/* Trigger Button */}
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        <div className={styles.coins}>
          <div className={styles.coinBadge}>
            <Coins size={14} />
            {profile?.bid_points ?? 0}
          </div>

          <div className={styles.taskBadge}>
            <Target size={14} />
            {profile?.task_coin ?? 0}
          </div>
        </div>

        <div className={styles.avatar}>
          {profileImageSrc ? (
            <img src={profileImageSrc} alt="Profile" className={styles.avatarImg} />
          ) : (
            <UserRound size={18} />
          )}
        </div>
      </button>

      {/* Overlay */}
      <div
        className={`${styles.overlay} ${open ? styles.overlayOpen : ""}`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <aside className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`}>
        <div className={styles.drawerTop}>
          <div className={styles.drawerTitle}>Copupbid</div>
          <button type="button" className={styles.iconBtn} onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Profile */}
        <div className={styles.profileBlock}>
          <div className={styles.profileAvatar}>
            {profileImageSrc ? (
              <img
                src={profileImageSrc}
                alt="Profile"
                className={styles.profileAvatarImg}
              />
            ) : (
              <UserRound size={18} />
            )}
          </div>

          <div className={styles.profileText}>
            <div className={styles.profileName}>{loading ? "Loading..." : displayName}</div>

            <button className={styles.profileLink} onClick={() => go("/profile")}>
              View profile
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <button className={styles.item} onClick={() => go("/shop")}>
            <Store size={16} /> Shop
          </button>

          <button className={styles.item} onClick={() => go("/auctions")}>
            <Gavel size={16} /> Auctions
          </button>

          <button className={styles.item} onClick={() => go("/cart")}>
            <ShoppingCart size={16} /> Cart
          </button>

          <button className={styles.item} onClick={() => go("/trade")}>
            <TrendingUp size={16} /> Trade
          </button>

          <button className={styles.item} onClick={() => go("/favorites")}>
            <Heart size={16} /> Favorites
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.section}>
          <button className={styles.item} onClick={() => go("/affiliate")}>
            <Users size={16} /> Affiliate
          </button>

          <button className={styles.item} onClick={() => go("/winners")}>
            <Trophy size={16} /> Winners
          </button>

          <button className={styles.item} onClick={() => go("/how-to-play")}>
            <HelpCircle size={16} /> How to play
          </button>
        </div>

        <div className={styles.drawerBottom}>
          <button className={styles.logoutBtn} onClick={logout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
