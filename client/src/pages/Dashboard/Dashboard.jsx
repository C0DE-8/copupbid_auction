// src/pages/Dashboard/Dashboard.jsx

import React, { useEffect, useMemo, useState, useCallback } from "react";
import styles from "./Dashboard.module.css";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import SidebarFrame from "../../components/SidebarFrame/SidebarFrame";
import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom";

import coinImg from "../../assets/copupcoin.png";
import m1 from "../../assets/m1.png";
import m3 from "../../assets/m3.png";
import m4 from "../../assets/m4.png";

import {
  FiGrid,
  FiShoppingBag,
  FiShoppingCart,
  FiZap,
  FiUser,
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiPlus,
  FiMinus,
  FiX,
} from "react-icons/fi";

function getAuthToken() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken");
}

function formatNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

export default function Dashboard() {
  const navigate = useNavigate();

  const token = useMemo(() => getAuthToken(), []);
  const isLoggedIn = !!token;

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // "deposit" | "withdraw" | "choose"

  const openModal = useCallback((type) => {
    setModalType(type);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalType(null);
  }, []);

  const goAccountTab = useCallback(
    (tab) => {
      // tab: "deposit" | "withdraw"
      closeModal();
      navigate(`/account?tab=${encodeURIComponent(tab)}`);
    },
    [navigate, closeModal]
  );

  const fetchProfile = useCallback(async () => {
    if (!isLoggedIn) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    try {
      const { data } = await api.get("/users/profile");
      setProfile(data);

      // optional caching (helps toolbar instantly)
      if (data?.bid_points !== undefined) {
        localStorage.setItem("copup_bid_points", String(data.bid_points ?? 0));
      }
      if (data?.task_coin !== undefined) {
        localStorage.setItem("copup_task_coin", String(data.task_coin ?? 0));
      }
    } catch (e) {
      console.error("Dashboard profile error:", e);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const displayName =
    profile?.full_name || profile?.username || (isLoggedIn ? "User" : "Guest");

  const cards = useMemo(
    () => [
      {
        key: "profile",
        title: "Profile",
        subtitle: "Manage identity & avatar.",
        badge: "Account",
        stars: 4,
        icon: FiUser,
        img: m1,
        tone: "blue",
        href: "/profile", // kept for reference, but we won't use href click anymore
      },
      {
        key: "cart",
        title: "Cart",
        subtitle: "View your cart.",
        badge: "Checkout",
        stars: 4,
        icon: FiShoppingCart,
        img: m3,
        tone: "green",
        href: "/cart",
      },
      {
        key: "auctions",
        title: "Auctions",
        subtitle: "Browse & place bids.",
        badge: "Bids",
        stars: 3,
        icon: FiZap,
        img: m4,
        tone: "slate",
        href: "/auctions",
        wide: true,
      },
    ],
    []
  );

  const bidPoints = Number(profile?.bid_points ?? 0);
  const taskCoin = Number(profile?.task_coin ?? 0);

  return (
    <div className={styles.page}>
      {/* background glow */}
      <div className={styles.bgGlow} aria-hidden="true">
        <svg className={styles.bgSvg} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="dglow1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="dglow2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="dglow3" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle
            cx="18%"
            cy="26%"
            r="330"
            fill="url(#dglow1)"
            className={styles.pulse1}
          />
          <circle
            cx="82%"
            cy="72%"
            r="270"
            fill="url(#dglow2)"
            className={styles.pulse2}
          />
          <circle
            cx="60%"
            cy="18%"
            r="220"
            fill="url(#dglow3)"
            className={styles.pulse3}
          />
        </svg>
      </div>

      <Header />

      <main className={styles.main}>
        <SidebarFrame active="home">
        <div className={styles.container}>
          {/* HERO */}
          <div className={styles.hero}>
            <div className={styles.heroLeft}>
              <div className={styles.kicker}>
                <FiGrid />
                <span>CopUp Dashboard</span>
              </div>

              <h1 className={styles.h1}>
                Choose <br />
                your quests
              </h1>

              <div className={styles.sub}>
                {loadingProfile ? (
                  <>Loading your account…</>
                ) : (
                  <>
                    Welcome back,{" "}
                    <span className={styles.subStrong}>{displayName}</span>.
                   
                    
                  </>
                )}
              </div>
            </div>

          
          </div>

          {/* GRID CARDS */}
          <div className={styles.grid}>
            {cards.map((c) => {
              const Icon = c.icon;

              const toneClass =
                c.tone === "blue"
                  ? styles.toneBlue
                  : c.tone === "pink"
                  ? styles.tonePink
                  : c.tone === "green"
                  ? styles.toneGreen
                  : styles.toneSlate;

              // ✅ Profile card becomes a button that opens the choose modal
              const CardWrap = ({ children }) => {
                if (c.key === "profile") {
                  return (
                    <button
                      type="button"
                      className={`${styles.card} ${toneClass} ${
                        c.wide ? styles.wide : ""
                      } ${styles.cardBtn}`}
                      onClick={() => openModal("choose")}
                      disabled={!isLoggedIn}
                      title={
                        isLoggedIn
                          ? "Open Deposit / Withdraw"
                          : "Login to access account actions"
                      }
                    >
                      {children}
                    </button>
                  );
                }

                return (
                  <a
                    href={c.href}
                    className={`${styles.card} ${toneClass} ${
                      c.wide ? styles.wide : ""
                    }`}
                  >
                    {children}
                  </a>
                );
              };

              return (
                <CardWrap key={c.key}>
                  <div className={styles.cardTop}>
                    <div className={styles.stars} aria-label={`${c.stars} stars`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`${styles.star} ${
                            i < c.stars ? styles.starOn : ""
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>

                    <div className={styles.badge}>
                      <Icon />
                      <span>{c.badge}</span>
                    </div>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardText}>
                      <div className={styles.cardTitle}>{c.title}</div>
                      <div className={styles.cardSub}>{c.subtitle}</div>

                      {/* ✅ Profile card shows balances + eye */}
                      {c.key === "profile" && (
                        <div className={styles.profileWallet}>
                          <div className={styles.profileWalletTop}>
                            <span className={styles.profileWalletTitle}>
                              Wallet Snapshot
                            </span>

                            <button
                              type="button"
                              className={styles.eyeMini}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setHideBalance((v) => !v);
                              }}
                              title={hideBalance ? "Show balances" : "Hide balances"}
                            >
                              {hideBalance ? <FiEye /> : <FiEyeOff />}
                            </button>
                          </div>

                          <div className={styles.profileWalletGrid}>
                            <div className={styles.profileWalletBox}>
                              <div className={styles.profileWalletLabel}>
                                Task Coin
                              </div>
                              <div className={styles.profileWalletValue}>
                                <img
                                  src={coinImg}
                                  alt="coin"
                                  className={styles.coinIconMini}
                                />
                                {hideBalance ? "••••" : formatNum(taskCoin)}
                              </div>
                            </div>

                            <div className={styles.profileWalletBox}>
                              <div className={styles.profileWalletLabel}>
                                Bid Points
                              </div>
                              <div className={styles.profileWalletValue}>
                                {hideBalance ? "••••" : formatNum(bidPoints)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={styles.cardArt}>
                      <img src={c.img} alt={c.title} className={styles.artImg} />
                    </div>
                  </div>

                  <div className={styles.cardBottom}>
                    <span className={styles.cardAction}>
                      {c.key === "profile" ? "Deposit / Withdraw" : "Open"}
                    </span>
                    <FiArrowRight className={styles.arrow} />
                  </div>
                </CardWrap>
              );
            })}
          </div>
        </div>
        </SidebarFrame>
      </main>

      <Footer />

      {/* MODAL */}
      <div
        className={`${styles.modalOverlay} ${modalOpen ? styles.modalOpen : ""}`}
        onClick={closeModal}
      >
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalTop}>
            <div className={styles.modalTitle}>
              {modalType === "choose"
                ? "Account"
                : modalType === "withdraw"
                ? "Withdraw"
                : "Deposit"}
            </div>

            <button
              type="button"
              className={styles.modalClose}
              onClick={closeModal}
            >
              <FiX />
            </button>
          </div>

          <div className={styles.modalBody}>
            <div className={styles.modalHint}>
              {modalType === "choose"
                ? "Choose what you want to do. We’ll open your Account page in the correct tab."
                : modalType === "withdraw"
                ? "Withdraw to your preferred method."
                : "Choose a deposit method to fund your wallet."}
            </div>

            {/* ✅ Choose modal has 2 actions */}
            {modalType === "choose" ? (
              <div className={styles.modalActionsRow}>
                <button
                  type="button"
                  className={styles.modalPrimary}
                  onClick={() => goAccountTab("deposit")}
                >
                  <FiPlus />
                  Deposit
                </button>
                <button
                  type="button"
                  className={styles.modalAlt}
                  onClick={() => goAccountTab("withdraw")}
                >
                  <FiMinus />
                  Withdraw
                </button>
              </div>
            ) : (
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalPrimary}
                  onClick={() =>
                    goAccountTab(modalType === "withdraw" ? "withdraw" : "deposit")
                  }
                >
                  Continue
                </button>
                <button
                  type="button"
                  className={styles.modalGhost}
                  onClick={closeModal}
                >
                  Cancel
                </button>
              </div>
            )}

          
          </div>
        </div>
      </div>
    </div>
  );
}
