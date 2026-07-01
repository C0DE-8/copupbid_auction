// src/pages/CopUpBidShop/CopUpBidShopD.jsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./CopUpBidShopD.module.css";

import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import LoginRequiredModal from "../../components/LoginRequiredModal/LoginRequiredModal";

import SkeletonGrid from "../../components/SkeletonGrid/SkeletonGrid";
import { useToast } from "../../components/Toast/ToastContext";

import { api } from "../../lib/api";
import { emitBalanceUpdated } from "../../lib/copupEvents";

import coinGif from "../../assets/copup.gif";
import coinImg from "../../assets/copupcoin.png";

import {
  FiArrowLeft,
  FiAlertTriangle,
  FiRefreshCw,
  FiShoppingCart,
  FiHeart,
} from "react-icons/fi";

/* --------------------------- Helpers (same style) --------------------------- */

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

function buildUsersUrl(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  return `users/${clean}`;
}

function parseQty(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

function authConfig(token) {
  if (!token) return undefined;
  return { headers: { Authorization: `Bearer ${token}` } };
}

export default function CopUpBidShopD() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();

  const productId = useMemo(() => Number(id), [id]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [product, setProduct] = useState(null);

  // qty + buy
  const [cashQty, setCashQty] = useState(1);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState("");
  const [buyInfo, setBuyInfo] = useState(null);

  // favorites
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // image loader (same vibe as ProductCard)
  const [imgReady, setImgReady] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const imageSrc = useMemo(() => {
    return (
      product?.image_url ||
      product?.image ||
      product?.photo_url ||
      ""
    );
  }, [product]);

  const showFallback = !imageSrc || imgFailed;

  // login required modal
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalMeta, setLoginModalMeta] = useState({ title: "", message: "" });

  const openLoginModal = useCallback((title, message) => {
    setLoginModalMeta({
      title: title || "Login required",
      message:
        message ||
        "You can browse freely, but you must login to favorite or buy items.",
    });
    setLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);

  const explainAxiosError = (e) => {
    if (e?.response) {
      const msg =
        e.response.data?.message || e.response.statusText || "Request failed";
      return `API error (${e.response.status}): ${msg}`;
    }
    if (e?.request)
      return "No response from server. Check API URL / CORS / network.";
    return e?.message || "Unknown error";
  };

  /* ------------------------------ Fetch product ----------------------------- */

  const fetchProduct = useCallback(async () => {
    if (!productId || !Number.isFinite(productId)) {
      setError("Invalid product id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setBuyError("");
    setBuyInfo(null);

    // reset image loader each fetch
    setImgReady(false);
    setImgFailed(false);

    try {
      const { data } = await api.get(buildShopUrl(`public/products/${productId}`));
      setProduct(data || null);
    } catch (e) {
      setError(explainAxiosError(e));
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  /* ------------------------------ Fetch favorite ---------------------------- */

  const fetchFavState = useCallback(async () => {
    const token = getAuthToken();
    if (!token || !productId) {
      setIsFav(false);
      return;
    }

    try {
      const { data } = await api.get(buildUsersUrl("favorites"), authConfig(token));
      const ids = new Set((Array.isArray(data) ? data : []).map((x) => Number(x.id)));
      setIsFav(ids.has(Number(productId)));
    } catch (_) {
      setIsFav(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
    fetchFavState();
  }, [fetchProduct, fetchFavState]);

  /* --------------------------------- Actions -------------------------------- */

  const toggleFavorite = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      openLoginModal("Login required", "You must login to favorite items.");
      return;
    }

    if (!productId) return;

    setFavLoading(true);
    try {
      const { data } = await api.post(
        buildUsersUrl(`favorites/${productId}/toggle`),
        {},
        authConfig(token)
      );

      if (data?.toggled === "added") {
        setIsFav(true);
        toast.success("Added to favorites");
      }
      if (data?.toggled === "removed") {
        setIsFav(false);
        toast.info("Removed from favorites");
      }
    } catch (_) {
      toast.error("Favorite action failed");
    } finally {
      setFavLoading(false);
    }
  }, [productId, openLoginModal, toast]);

  const buyProduct = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setBuyError("Please login to continue.");
      openLoginModal("Login required", "You must login to buy items.");
      return;
    }

    if (!productId) return;

    setBuyLoading(true);
    setBuyError("");
    setBuyInfo(null);

    try {
      const payload = {
        product_id: Number(productId),
        qty: parseQty(cashQty),
      };

      // ✅ force auth header so buy ALWAYS works
      const { data } = await api.post(buildUsersUrl("buy"), payload, authConfig(token));
      setBuyInfo(data);

      emitBalanceUpdated({ source: "buy", payload: data });

      toast.success("✅ Purchase successful");
    } catch (e) {
      const server = e?.response?.data || {};
      const msg = server?.message || e?.message || "Buy failed";
      setBuyError(msg);
      toast.error(msg);
    } finally {
      setBuyLoading(false);
    }
  }, [productId, cashQty, openLoginModal, toast]);

  /* -------------------------------- Render UI -------------------------------- */

  return (
    <div className={styles.page}>
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

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.topBar}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => navigate(-1)}
            >
              <FiArrowLeft style={{ marginRight: 8 }} />
              Back
            </button>

            <button
              type="button"
              className={styles.favBtn}
              onClick={toggleFavorite}
              disabled={favLoading}
              title={isFav ? "Remove from favorites" : "Add to favorites"}
            >
              <FiHeart style={{ marginRight: 8 }} />
              {isFav ? "Favorited" : "Favorite"}
            </button>
          </div>

          {error ? (
            <div className={styles.stateCard}>
              <div className={styles.stateTop}>
                <div className={styles.stateIcon}>
                  <FiAlertTriangle />
                </div>
                <div>
                  <div className={styles.stateTitle}>We couldn’t load this product</div>
                  <div className={styles.stateSub}>
                    Please check your connection and try again.
                  </div>
                </div>
              </div>

              <div className={styles.stateDetails}>
                <div className={styles.devHint}>
                  {String(error).slice(0, 220)}
                </div>
              </div>

              <div className={styles.stateActions}>
                <button type="button" className={styles.btnPrimary} onClick={fetchProduct}>
                  <FiRefreshCw style={{ marginRight: 8 }} />
                  Try again
                </button>
                <button type="button" className={styles.btnGhost} onClick={() => navigate("/shop")}>
                  <FiShoppingCart style={{ marginRight: 8 }} />
                  Back to shop
                </button>
              </div>
            </div>
          ) : loading ? (
            <SkeletonGrid count={1} />
          ) : !product ? (
            <div className={styles.loadingCard}>Product not found.</div>
          ) : (
            <div className={styles.detailCard}>
              <div className={styles.media}>
                {!imgReady && !showFallback ? (
                  <div className={styles.imgLoader}>
                    <img src={coinGif} alt="Loading..." />
                  </div>
                ) : null}

                {imageSrc ? (
                  <img
                    className={`${styles.image} ${imgReady ? styles.imgReady : ""}`}
                    src={imageSrc}
                    alt={product?.name || "Product"}
                    loading="lazy"
                    onLoad={() => setImgReady(true)}
                    onError={() => setImgFailed(true)}
                  />
                ) : null}

                {showFallback ? (
                  <div className={styles.imgFallback}>
                    <div className={styles.fallbackInner}>
                      <div className={styles.fallbackIcon}>
                        <img src={coinImg} alt="coin" />
                      </div>
                      <div className={styles.fallbackName}>{product?.name}</div>
                      <div className={styles.fallbackSub}>No image available</div>
                    </div>
                  </div>
                ) : null}

                <div className={styles.imgOverlay} />
              </div>

              <div className={styles.info}>
                <div className={styles.titleRow}>
                  <h1 className={styles.title}>{product.name}</h1>
                  {product.category_name ? (
                    <span className={styles.badge}>{product.category_name}</span>
                  ) : null}
                </div>

                <div className={styles.price}>
                  ₦{Number(product.cash_price || 0).toLocaleString()}
                </div>

                <div className={styles.desc}>
                  {product.description ||
                    "This item is available in limited stock. Buy now to secure yours."}
                </div>

                <div className={styles.buyBox}>
                  <div className={styles.qtyRow}>
                    <span className={styles.qtyLabel}>Quantity</span>
                    <div className={styles.qtyControls}>
                      <button
                        type="button"
                        className={styles.qtyBtn}
                        onClick={() => setCashQty((q) => Math.max(1, q - 1))}
                      >
                        −
                      </button>

                      <input
                        className={styles.qtyInput}
                        value={cashQty}
                        onChange={(e) => setCashQty(parseQty(e.target.value))}
                        inputMode="numeric"
                      />

                      <button
                        type="button"
                        className={styles.qtyBtn}
                        onClick={() => setCashQty((q) => q + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.buyBtn}
                    onClick={buyProduct}
                    disabled={buyLoading}
                  >
                    {buyLoading ? "Processing..." : "Buy Now"}
                  </button>

                  {buyError ? <div className={styles.buyError}>{buyError}</div> : null}

                  {buyInfo ? (
                    <div className={styles.buySuccess}>
                      ✅ Purchase successful.
                      {buyInfo?.new_balance !== undefined ? (
                        <div className={styles.buySuccessMini}>
                          New balance: {String(buyInfo.new_balance)}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
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