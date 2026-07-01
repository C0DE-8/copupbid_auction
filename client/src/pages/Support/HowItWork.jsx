import React, { useCallback, useMemo, useState } from "react";
import styles from "./HowItWork.module.css";

import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";

import {
  FiInfo,
  FiGrid,
  FiDollarSign,
  FiTool,
  FiTarget,
  FiShoppingBag,
  FiCheckCircle,
  FiChevronRight,
  FiCopy,
} from "react-icons/fi";

/* ---------------- helpers ---------------- */
function copyToClipboard(setInfo) {
  return async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(String(text));
      setInfo("Copied.");
      setTimeout(() => setInfo(""), 1200);
    } catch {
      // ignore
    }
  };
}

export default function HowItWork() {
  const [activeTab, setActiveTab] = useState("overview");
  const [info, setInfo] = useState("");

  const onCopy = useMemo(() => copyToClipboard(setInfo), []);

  const tabs = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: <FiInfo /> },
      { id: "coins", label: "CopUp Coins", icon: <FiDollarSign /> },
      { id: "auctions", label: "Auctions", icon: <FiTool /> },
      { id: "heist", label: "Copup Heist", icon: <FiTarget /> },
      { id: "shop", label: "Shopping", icon: <FiShoppingBag /> },
      { id: "why", label: "Why Copupbid?", icon: <FiCheckCircle /> },
    ],
    []
  );

  const active = useMemo(() => tabs.find((t) => t.id === activeTab) || tabs[0], [tabs, activeTab]);

  const goBack = useCallback(() => {
    window.location.href = "/";
  }, []);

  return (
    <div className={styles.page}>
      {/* background glow like Winner */}
      <div className={styles.bgGlow} aria-hidden="true">
        <svg className={styles.bgSvg} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="glow2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="glow3" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="20%" cy="30%" r="320" fill="url(#glow1)" className={styles.pulse1} />
          <circle cx="80%" cy="70%" r="260" fill="url(#glow2)" className={styles.pulse2} />
          <circle cx="60%" cy="20%" r="210" fill="url(#glow3)" className={styles.pulse3} />
        </svg>
      </div>

      <Header />

      {/* hero */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroCard}>
            <div className={styles.heroTop}>
              <div className={styles.heroIcon}>
                <FiGrid />
              </div>

              <div className={styles.heroMain}>
                <div className={styles.heroTitle}>How Copupbid Works</div>
                <div className={styles.heroSub}>
                  Bid, play, and shop using <b>CopUp Coins</b> — fast, fun, and reward-based.
                </div>

                <div className={styles.pills}>
                  <div className={styles.pill}>
                    <FiDollarSign />
                    <span>
                      1 Coin = <b>₦100</b>
                    </span>
                  </div>

                  {info ? (
                    <div className={styles.pillAlt}>
                      <FiCheckCircle />
                      <span>{info}</span>
                    </div>
                  ) : (
                    <div className={styles.pillAlt}>
                      <FiInfo />
                      <span>Tabs + step-by-step guide</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.heroActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => onCopy("🚀 Copupbid: 1 CopUp Coin = ₦100. Bid, play (Heist), and shop with coins.")}
                >
                  <FiCopy style={{ marginRight: 8 }} />
                  Copy Summary
                </button>

                <button type="button" className={styles.btnGhost} onClick={goBack}>
                  Back
                </button>
              </div>
            </div>

            {/* tabs */}
            <div className={styles.tabsWrap}>
              {tabs.map((t) => {
                const isActive = t.id === activeTab;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={isActive ? styles.tabActive : styles.tab}
                    onClick={() => setActiveTab(t.id)}
                  >
                    <span className={styles.tabIcon}>{t.icon}</span>
                    <span className={styles.tabLabel}>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* active tab title */}
            <div className={styles.selectorRow}>
              <div className={styles.selectorMid}>
                <div className={styles.selectorTitle}>{active?.label || "—"}</div>
                <div className={styles.selectorSub}>
                  Switch tabs to learn each part clearly — coins, auctions, heist, and shopping.
                </div>
              </div>
              <div className={styles.badgeSoft}>
                <FiChevronRight style={{ marginRight: 6 }} />
                Step Guide
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* body */}
      <section className={styles.body}>
        <div className={styles.container}>
          {/* content card */}
          <div className={styles.card}>
            {activeTab === "overview" ? (
              <>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>🚀 Welcome to Copupbid</div>
                  <div className={styles.cardSub}>Where fun meets rewards — everything runs on CopUp Coins.</div>
                </div>

                <div className={styles.steps}>
                  <div className={styles.step}>
                    <div className={styles.stepNo}>1</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Get CopUp Coins</div>
                      <div className={styles.stepText}>Create an account, fund your wallet, convert to coins.</div>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNo}>2</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Choose Your Activity</div>
                      <div className={styles.stepText}>Auctions, Copup Heist (game), or normal shopping.</div>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNo}>3</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Win Rewards / Buy Items</div>
                      <div className={styles.stepText}>
                        Win auctions and games, or purchase products directly with coins.
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.softNote}>
                  Tip: If you’re new, open <b>CopUp Coins</b> tab first.
                </div>
              </>
            ) : null}

            {activeTab === "coins" ? (
              <>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>🪙 Step 1: Get CopUp Coins</div>
                  <div className={styles.cardSub}>Everything on Copupbid uses CopUp Coins.</div>
                </div>

                <div className={styles.highlightRow}>
                  <div className={styles.highlight}>
                    <div className={styles.highlightLabel}>Rate</div>
                    <div className={styles.highlightValue}>1 CopUp Coin = ₦100</div>
                  </div>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => onCopy("1 CopUp Coin = ₦100")}
                    title="Copy rate"
                  >
                    <FiCopy style={{ marginRight: 8 }} />
                    Copy Rate
                  </button>
                </div>

                <div className={styles.steps}>
                  <div className={styles.step}>
                    <div className={styles.stepNo}>1</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Create an account</div>
                      <div className={styles.stepText}>Sign up and verify your profile.</div>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNo}>2</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Fund your wallet</div>
                      <div className={styles.stepText}>Add money to your wallet securely.</div>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNo}>3</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Convert to CopUp Coins</div>
                      <div className={styles.stepText}>Convert cash into coins and start using immediately.</div>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNo}>4</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Coins appear in your balance</div>
                      <div className={styles.stepText}>Your wallet balance updates and you can spend instantly.</div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {activeTab === "auctions" ? (
              <>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>🔨 How Auctions Work</div>
                  <div className={styles.cardSub}>Competitive, exciting, and transparent in real-time.</div>
                </div>

                <div className={styles.steps}>
                  <div className={styles.step}>
                    <div className={styles.stepNo}>1</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Choose an Auction Tier</div>
                      <div className={styles.stepText}>
                        Each tier has an entry cost in coins, a product, and a time limit.
                        <div className={styles.miniList}>
                          • Bronze Entry → 1 Coin<br />
                          • Silver Entry → 5 Coins<br />
                          • Gold Entry → 10 Coins
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNo}>2</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Place Bids</div>
                      <div className={styles.stepText}>
                        Every bid costs coins, slightly increases the timer, and raises the price gradually.
                      </div>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNo}>3</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Win the Auction</div>
                      <div className={styles.stepText}>
                        When the timer hits zero, the last bidder wins the item — usually at a massive discount.
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.softNote}>
                  Auctions are fair: everyone sees the countdown and bidding activity live.
                </div>
              </>
            ) : null}

            {activeTab === "heist" ? (
              <>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>🕵🏽‍♂️ How Copup Heist Works</div>
                  <div className={styles.cardSub}>Story-based competitive game — not luck, intelligence.</div>
                </div>

                <div className={styles.steps}>
                  <div className={styles.step}>
                    <div className={styles.stepNo}>1</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Buy a Ticket</div>
                      <div className={styles.stepText}>Join the heist using CopUp Coins.</div>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNo}>2</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Read the Story</div>
                      <div className={styles.stepText}>You get a mystery story with hidden clues inside it.</div>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNo}>3</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Analyze the Clues</div>
                      <div className={styles.stepText}>
                        Watch for timestamps, names, objects, and tiny details — everything matters.
                      </div>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNo}>4</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Answer the Final Question</div>
                      <div className={styles.stepText}>The first correct answer wins the heist.</div>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNo}>5</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Win the Prize</div>
                      <div className={styles.stepText}>
                        Prizes can be coins, phones, gadgets, game rewards, or special bonuses — added to balance.
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {activeTab === "shop" ? (
              <>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>🛍 Normal Shopping with CopUp Coins</div>
                  <div className={styles.cardSub}>Buy products directly using your wallet coin balance.</div>
                </div>

                <div className={styles.steps}>
                  <div className={styles.step}>
                    <div className={styles.stepNo}>1</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Browse the Shop</div>
                      <div className={styles.stepText}>Phones, electronics, accessories, and special deals.</div>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNo}>2</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Pay with CopUp Coins</div>
                      <div className={styles.stepText}>Checkout instantly using wallet balance — no cash needed.</div>
                    </div>
                  </div>

                  <div className={styles.step}>
                    <div className={styles.stepNo}>3</div>
                    <div className={styles.stepMain}>
                      <div className={styles.stepTitle}>Delivery + Tracking</div>
                      <div className={styles.stepText}>Order confirmed, delivery begins, track your item.</div>
                    </div>
                  </div>
                </div>

                <div className={styles.softNote}>Shopping is simple and secure.</div>
              </>
            ) : null}

            {activeTab === "why" ? (
              <>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>🎯 Why Use Copupbid?</div>
                  <div className={styles.cardSub}>More than a marketplace — it’s a reward economy.</div>
                </div>

                <div className={styles.bullets}>
                  <div className={styles.bullet}>• Fun & competitive platform</div>
                  <div className={styles.bullet}>• Real rewards</div>
                  <div className={styles.bullet}>• Transparent system</div>
                  <div className={styles.bullet}>• Digital coin economy</div>
                  <div className={styles.bullet}>• Multiple ways to win</div>
                </div>

                <div className={styles.softNote}>
                  Want the fastest start? Get coins → join an auction → try a heist.
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}