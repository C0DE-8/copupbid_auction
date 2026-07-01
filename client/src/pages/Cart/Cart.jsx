// src/pages/Cart/Cart.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./Cart.module.css";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import LoginRequiredModal from "../../components/LoginRequiredModal/LoginRequiredModal";
import SkeletonGrid from "../../components/SkeletonGrid/SkeletonGrid";
import { api } from "../../lib/api";

import {
  FiAlertTriangle,
  FiRefreshCw,
  FiRotateCcw,
  FiShoppingCart,
  FiPackage,
  FiCreditCard,
  FiMapPin,
  FiPhone,
  FiUser,
  FiFileText,
  FiTrendingUp,
} from "react-icons/fi";

/* ---------------- helpers (same style as shop page) ---------------- */
function getAuthToken() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken");
}
function buildUsersUrl(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  return `users/${clean}`;
}
function explainAxiosError(e) {
  if (e?.response) {
    const msg =
      e.response.data?.message || e.response.statusText || "Request failed";
    return `API error (${e.response.status}): ${msg}`;
  }
  if (e?.request) return "No response from server. Check API URL / CORS / network.";
  return e?.message || "Unknown error";
}
function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0.00";
  return v.toFixed(2);
}

/**
 * Rate model: unit coins = price currency
 * coins -> currency = (coins / unit) * price
 */
function coinsToFiat(coins, rate) {
  const c = safeNum(coins, 0);
  const unit = safeNum(rate?.unit, 0);
  const price = safeNum(rate?.price, 0);
  if (unit <= 0 || price <= 0) return null;
  return (c / unit) * price;
}

export default function Cart() {
  const isProd =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.MODE === "production") ||
    process.env.NODE_ENV === "production";

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Coin rate
  const [rate, setRate] = useState({ unit: 0, price: 0, currency: "USD", updated_at: null });
  const [rateLoading, setRateLoading] = useState(true);

  // Cart data
  const [shopCart, setShopCart] = useState([]);       // optional endpoint: GET /users/shop/cart
  const [auctionCart, setAuctionCart] = useState([]); // confirmed: GET /users/cart

  // Checkout forms
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // submit state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState("");
  const [checkoutErr, setCheckoutErr] = useState("");

  // login required modal
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalMeta, setLoginModalMeta] = useState({ title: "", message: "" });

  const openLoginModal = useCallback((title, message) => {
    setLoginModalMeta({
      title: title || "Login required",
      message: message || "Please login to view your cart and checkout.",
    });
    setLoginModalOpen(true);
  }, []);
  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);

  /* ---------------- fetchers ---------------- */

  // ✅ coin rate (required for conversions)
  const fetchCoinRate = useCallback(async () => {
    setRateLoading(true);
    try {
      const { data } = await api.get(buildUsersUrl("coin-rate"));
      setRate({
        unit: safeNum(data?.unit, 0),
        price: safeNum(data?.price, 0),
        currency: String(data?.currency || "USD"),
        updated_at: data?.updated_at || null,
      });
    } catch (_) {
      // keep previous rate; don't hard-fail cart
    } finally {
      setRateLoading(false);
    }
  }, []);

  // Optional: if you created GET /api/users/shop/cart
  const fetchShopCart = useCallback(async () => {
    try {
      const { data } = await api.get(buildUsersUrl("shop/cart"));
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];
      setShopCart(arr);
      return arr;
    } catch (e) {
      const code = e?.response?.status;
      // if endpoint doesn't exist yet, don't break cart
      if (code === 404 || code === 405) {
        setShopCart([]);
        return [];
      }
      throw e;
    }
  }, []);

  // Confirmed: GET /api/users/cart (auction cart)
  const fetchAuctionCart = useCallback(async () => {
    const { data } = await api.get(buildUsersUrl("cart"));
    const arr = Array.isArray(data) ? data : [];
    setAuctionCart(arr);
    return arr;
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    setError("");
    setCheckoutErr("");
    setCheckoutMsg("");

    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      openLoginModal("Login required", "Please login to view your cart and checkout.");
      return;
    }

    try {
      await Promise.all([
        fetchCoinRate(),
        fetchShopCart(),
        fetchAuctionCart(),
      ]);
    } catch (e) {
      setError(explainAxiosError(e));
    } finally {
      setLoading(false);
    }
  }, [fetchCoinRate, fetchShopCart, fetchAuctionCart, openLoginModal]);

  useEffect(() => {
    init();
  }, [init]);

  const onRefresh = useCallback(async () => {
    await init();
  }, [init]);

  const resetForm = useCallback(() => {
    setCustomerName("");
    setPhoneNumber("");
    setAddress("");
    setNotes("");
    setCheckoutErr("");
    setCheckoutMsg("");
  }, []);

  /* ---------------- normalization (coins) ---------------- */

  // Shop: treat ci.price and ci.subtotal as "coins" (per your instruction)
  const normalizedShop = useMemo(() => {
    const arr = Array.isArray(shopCart) ? shopCart : [];
    return arr.map((it) => {
      const qty = safeNum(it.qty, 1);
      const unitCoins = safeNum(it.price, 0);
      const subtotalCoins =
        safeNum(it.subtotal, 0) || unitCoins * qty;

      return {
        ...it,
        _qty: qty,
        _unitCoins: unitCoins,
        _subtotalCoins: subtotalCoins,
        _name: it.product_name || it.name || "Product",
      };
    });
  }, [shopCart]);

  // Auction: use pointsSpent first; else cart_price; else displayPricePoints
  const normalizedAuction = useMemo(() => {
    const arr = Array.isArray(auctionCart) ? auctionCart : [];
    return arr.map((it) => {
      const coins =
        safeNum(it.pointsSpent, 0) ||
        safeNum(it.cart_price, 0) ||
        safeNum(it.displayPricePoints, 0) ||
        0;

      return {
        ...it,
        _coins: coins,
        _name: it.name || "Auction item",
        _status: it.auctionStatus || it.cartStatus || "—",
        _category: it.category || "—",
      };
    });
  }, [auctionCart]);

  /* ---------------- totals ---------------- */
  const shopTotals = useMemo(() => {
    let coins = 0;
    let items = 0;
    for (const r of normalizedShop) {
      coins += safeNum(r._subtotalCoins, 0);
      items += safeNum(r._qty, 0);
    }
    return { coins, items };
  }, [normalizedShop]);

  const auctionTotals = useMemo(() => {
    let coins = 0;
    let items = 0;
    for (const r of normalizedAuction) {
      coins += safeNum(r._coins, 0);
      items += 1;
    }
    return { coins, items };
  }, [normalizedAuction]);

  const grandTotals = useMemo(() => {
    const coins = shopTotals.coins + auctionTotals.coins;
    return { coins };
  }, [shopTotals, auctionTotals]);

  const fiatShop = useMemo(() => coinsToFiat(shopTotals.coins, rate), [shopTotals, rate]);
  const fiatAuction = useMemo(() => coinsToFiat(auctionTotals.coins, rate), [auctionTotals, rate]);
  const fiatGrand = useMemo(() => coinsToFiat(grandTotals.coins, rate), [grandTotals, rate]);

  const nothingInCarts = normalizedShop.length === 0 && normalizedAuction.length === 0;

  /* ---------------- checkouts ---------------- */

  // POST /api/users/shop/cart/checkout
  const checkoutShop = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      openLoginModal("Login required", "You must login to checkout your cart.");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutErr("");
    setCheckoutMsg("");

    try {
      const payload = {
        customer_name: String(customerName || "").trim(),
        phone_number: String(phoneNumber || "").trim(),
        address: String(address || "").trim(),
        notes: String(notes || "").trim(),
      };

      const { data } = await api.post(buildUsersUrl("shop/cart/checkout"), payload);
      setCheckoutMsg(data?.message || "Checkout successful.");
      await Promise.all([fetchCoinRate(), fetchShopCart(), fetchAuctionCart()]);
    } catch (e) {
      const server = e?.response?.data || {};
      setCheckoutErr(server?.message || e?.message || "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  }, [
    customerName,
    phoneNumber,
    address,
    notes,
    fetchCoinRate,
    fetchShopCart,
    fetchAuctionCart,
    openLoginModal,
  ]);

  // POST /api/users/auction/checkout
  const checkoutAuction = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      openLoginModal("Login required", "You must login to checkout auction prizes.");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutErr("");
    setCheckoutMsg("");

    try {
      const payload = {
        address: String(address || "").trim(),
        phone: String(phoneNumber || "").trim(),
      };

      const { data } = await api.post(buildUsersUrl("auction/checkout"), payload);
      setCheckoutMsg(data?.message || "Auction checkout successful.");
      await Promise.all([fetchCoinRate(), fetchShopCart(), fetchAuctionCart()]);
    } catch (e) {
      const server = e?.response?.data || {};
      setCheckoutErr(server?.message || e?.message || "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  }, [address, phoneNumber, fetchCoinRate, fetchShopCart, fetchAuctionCart, openLoginModal]);

  /* ---------------- rate label ---------------- */
  const rateLabel = useMemo(() => {
    const u = safeNum(rate?.unit, 0);
    const p = safeNum(rate?.price, 0);
    const c = String(rate?.currency || "USD");
    if (u <= 0 || p <= 0) return "Rate unavailable";
    return `${u} CopUp Coins = ${money(p)} ${c}`;
  }, [rate]);

  return (
    <div className={styles.page}>
      {/* glow bg (same vibe as shop) */}
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

      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroCard}>
            <div className={styles.heroTop}>
              <div className={styles.heroIcon}>
                <FiShoppingCart />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.heroTitle}>Your Cart</div>
                <div className={styles.heroSub}>
                  Review items, then checkout with delivery details.
                </div>

                <div className={styles.ratePillRow}>
                  <div className={styles.ratePill}>
                    <FiTrendingUp />
                    <span>{rateLoading ? "Loading coin rate..." : rateLabel}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.heroActions}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => (window.location.href = "/shop")}
              >
                <FiPackage style={{ marginRight: 8 }} />
                Back to Shop
              </button>

              <button
                type="button"
                className={styles.btnPrimary}
                onClick={onRefresh}
                disabled={loading}
              >
                <FiRefreshCw style={{ marginRight: 8 }} />
                Refresh
              </button>

              <button type="button" className={styles.btnGhost} onClick={resetForm}>
                <FiRotateCcw style={{ marginRight: 8 }} />
                Clear form
              </button>
            </div>

            {!isProd && error ? (
              <div className={styles.devHint}>
                <span>Dev:</span> {String(error).slice(0, 240)}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className={styles.body}>
        <div className={styles.container}>
          {error ? (
            <div className={styles.stateCard}>
              <div className={styles.stateTop}>
                <div className={styles.stateIcon}>
                  <FiAlertTriangle />
                </div>
                <div>
                  <div className={styles.stateTitle}>We couldn’t load your cart</div>
                  <div className={styles.stateSub}>
                    Please check your connection and try again.
                  </div>
                </div>
              </div>

              <div className={styles.stateActions}>
                <button type="button" className={styles.btnPrimary} onClick={init}>
                  <FiRefreshCw style={{ marginRight: 8 }} />
                  Try again
                </button>
              </div>
            </div>
          ) : loading ? (
            <SkeletonGrid count={6} />
          ) : nothingInCarts ? (
            <div className={styles.stateCard}>
              <div className={styles.stateTop}>
                <div className={styles.stateIcon}>
                  <FiShoppingCart />
                </div>
                <div>
                  <div className={styles.stateTitle}>Your cart is empty</div>
                  <div className={styles.stateSub}>
                    Add items from the shop or win prizes from auctions.
                  </div>
                </div>
              </div>

              <div className={styles.stateActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => (window.location.href = "/app/shop")}
                >
                  <FiPackage style={{ marginRight: 8 }} />
                  Browse shop
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.gridTwo}>
              {/* LEFT: Cart Items */}
              <div className={styles.col}>
                {/* Shop Cart */}
                <div className={styles.block}>
                  <div className={styles.blockHeader}>
                    <div>
                      <div className={styles.blockTitle}>Shop Cart</div>
                      <div className={styles.blockSub}>
                        {normalizedShop.length ? (
                          <>
                            {shopTotals.items} items •{" "}
                            <b>{money(shopTotals.coins)}</b> coins
                            {fiatShop !== null ? (
                              <>
                                {" "}• ~ <b>{money(fiatShop)}</b> {rate.currency}
                              </>
                            ) : null}
                          </>
                        ) : (
                          "No shop items found"
                        )}
                      </div>
                    </div>
                  </div>

                  {normalizedShop.length ? (
                    <div className={styles.items}>
                      {normalizedShop.map((it) => {
                        const fiat = coinsToFiat(it._subtotalCoins, rate);
                        return (
                          <div className={styles.itemRow} key={`shop-${it.id}`}>
                            <div className={styles.itemMain}>
                              <div className={styles.itemName}>{it._name}</div>
                              <div className={styles.itemMeta}>
                                Qty: <b>{it._qty}</b> • Unit:{" "}
                                <b>{money(it._unitCoins)}</b> coins
                              </div>
                            </div>

                            <div className={styles.itemRight}>
                              <div className={styles.itemPrice}>
                                {money(it._subtotalCoins)} coins
                              </div>
                              {fiat !== null ? (
                                <div className={styles.itemFiat}>
                                  ~ {money(fiat)} {rate.currency}
                                </div>
                              ) : null}
                              <div className={styles.badge}>shop</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.emptyMini}>
                      No shop cart items.
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => (window.location.href = "/app/shop")}
                      >
                        Go to shop
                      </button>
                    </div>
                  )}
                </div>

                {/* Auction Cart */}
                <div className={styles.block}>
                  <div className={styles.blockHeader}>
                    <div>
                      <div className={styles.blockTitle}>Auction Cart</div>
                      <div className={styles.blockSub}>
                        {normalizedAuction.length ? (
                          <>
                            {auctionTotals.items} items •{" "}
                            <b>{money(auctionTotals.coins)}</b> coins
                            {fiatAuction !== null ? (
                              <>
                                {" "}• ~ <b>{money(fiatAuction)}</b> {rate.currency}
                              </>
                            ) : null}
                          </>
                        ) : (
                          "No auction prizes found"
                        )}
                      </div>
                    </div>
                  </div>

                  {normalizedAuction.length ? (
                    <div className={styles.items}>
                      {normalizedAuction.map((it) => {
                        const fiat = coinsToFiat(it._coins, rate);
                        return (
                          <div className={styles.itemRow} key={`auc-${it.id}`}>
                            <div className={styles.itemMain}>
                              <div className={styles.itemName}>{it._name}</div>
                              <div className={styles.itemMeta}>
                                Category: <b>{it._category}</b> • Status:{" "}
                                <b>{it._status}</b>
                              </div>
                              <div className={styles.itemMeta}>
                                Coins spent: <b>{money(it._coins)}</b>
                                {fiat !== null ? (
                                  <>
                                    {" "}• ~ <b>{money(fiat)}</b> {rate.currency}
                                  </>
                                ) : null}
                              </div>
                            </div>

                            <div className={styles.itemRight}>
                              <div className={styles.badgeAlt}>auction</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.emptyMini}>No auction cart items.</div>
                  )}
                </div>
              </div>

              {/* RIGHT: Checkout Form */}
              <div className={styles.col}>
                <div className={styles.checkoutCard}>
                  <div className={styles.checkoutHeader}>
                    <div className={styles.checkoutIcon}>
                      <FiCreditCard />
                    </div>
                    <div>
                      <div className={styles.checkoutTitle}>Checkout</div>
                      <div className={styles.checkoutSub}>
                        Provide delivery details for shop items or auction prizes.
                      </div>
                    </div>
                  </div>

                  {/* ✅ quick summary */}
                  <div className={styles.summaryBar}>
                    <div className={styles.summaryLine}>
                      <span>Shop total</span>
                      <b>
                        {money(shopTotals.coins)} coins
                        {fiatShop !== null ? ` • ~ ${money(fiatShop)} ${rate.currency}` : ""}
                      </b>
                    </div>
                    <div className={styles.summaryLine}>
                      <span>Auction total</span>
                      <b>
                        {money(auctionTotals.coins)} coins
                        {fiatAuction !== null ? ` • ~ ${money(fiatAuction)} ${rate.currency}` : ""}
                      </b>
                    </div>
                    <div className={styles.summaryDivider} />
                    <div className={styles.summaryLineBig}>
                      <span>Grand total</span>
                      <b>
                        {money(grandTotals.coins)} coins
                        {fiatGrand !== null ? ` • ~ ${money(fiatGrand)} ${rate.currency}` : ""}
                      </b>
                    </div>
                  </div>

                  <div className={styles.form}>
                    <label className={styles.field}>
                      <span className={styles.label}>
                        <FiUser /> Customer name (Shop)
                      </span>
                      <input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g., Samuel O."
                        className={styles.input}
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.label}>
                        <FiPhone /> Phone (Shop + Auction)
                      </span>
                      <input
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g., +234 801 234 5678"
                        className={styles.input}
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.label}>
                        <FiMapPin /> Address (Shop + Auction)
                      </span>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Full delivery address"
                        className={styles.textarea}
                        rows={3}
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.label}>
                        <FiFileText /> Notes (Shop optional)
                      </span>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any extra delivery notes (optional)"
                        className={styles.textarea}
                        rows={2}
                      />
                    </label>

                    {checkoutErr ? <div className={styles.alertErr}>{checkoutErr}</div> : null}
                    {checkoutMsg ? <div className={styles.alertOk}>{checkoutMsg}</div> : null}

                    <div className={styles.checkoutActions}>
                      <button
                        type="button"
                        className={styles.btnPrimary}
                        onClick={checkoutShop}
                        disabled={checkoutLoading || !normalizedShop.length}
                        title={!normalizedShop.length ? "No shop items to checkout" : "Checkout shop cart"}
                      >
                        <FiPackage style={{ marginRight: 8 }} />
                        {checkoutLoading ? "Processing..." : "Checkout Shop Cart"}
                      </button>

                      <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={checkoutAuction}
                        disabled={checkoutLoading || !normalizedAuction.length}
                        title={!normalizedAuction.length ? "No auction items to checkout" : "Checkout auction prizes"}
                      >
                        <FiShoppingCart style={{ marginRight: 8 }} />
                        {checkoutLoading ? "Processing..." : "Checkout Auction Prizes"}
                      </button>
                    </div>

                   
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />

      <LoginRequiredModal
        open={loginModalOpen}
        onClose={closeLoginModal}
        title={loginModalMeta.title}
        message={loginModalMeta.message}
      />
    </div>
  );
}