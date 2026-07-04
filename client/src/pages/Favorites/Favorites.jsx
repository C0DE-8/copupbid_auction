// src/pages/Favorites/Favorites.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./Favorites.module.css";

import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import SidebarFrame from "../../components/SidebarFrame/SidebarFrame";
import LoginRequiredModal from "../../components/LoginRequiredModal/LoginRequiredModal";
import SkeletonGrid from "../../components/SkeletonGrid/SkeletonGrid";
import ProductCard from "../../components/ProductCard/ProductCard";
import ProductModal from "../../components/ProductModal/ProductModal";

import { api } from "../../lib/api";

import {
  FiHeart,
  FiSearch,
  FiRefreshCw,
  FiAlertTriangle,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiGrid,
} from "react-icons/fi";

/* ---------------- helpers ---------------- */
function getAuthToken() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken");
}

function normalizeString(v) {
  return String(v ?? "").toLowerCase();
}

function toNumberOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function buildUsersUrl(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  return `users/${clean}`;
}

// prevent /shop/shop
function buildShopUrl(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  const base = String(api?.defaults?.baseURL || "").toLowerCase();
  const baseHasShop =
    base.includes("/shop") || base.endsWith("/shop") || base.includes("/shop/");
  return baseHasShop ? clean : `shop/${clean}`;
}

function explainAxiosError(e) {
  if (e?.response) {
    const msg =
      e.response.data?.message || e.response.statusText || "Request failed";
    return `API error (${e.response.status}): ${msg}`;
  }
  if (e?.request)
    return "No response from server. Check API URL / CORS / network.";
  return e?.message || "Unknown error";
}

export default function Favorites() {
  const isProd =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.MODE === "production") ||
    process.env.NODE_ENV === "production";

  // login modal
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalMeta, setLoginModalMeta] = useState({ title: "", message: "" });

  const openLoginModal = useCallback((title, message) => {
    setLoginModalMeta({
      title: title || "Login required",
      message:
        message ||
        "You can browse freely, but you must login to manage favorites.",
    });
    setLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);

  // data
  const [favorites, setFavorites] = useState([]);
  const [favIds, setFavIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Loading...");
  const [error, setError] = useState("");

  // filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("recent"); // recent | name_asc | cash_low | cash_high
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  // toggle state
  const [favLoadingId, setFavLoadingId] = useState(null);

  // product modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalProduct, setModalProduct] = useState(null);

  // buy state (optional, reuse your modal props)
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState("");
  const [buyInfo, setBuyInfo] = useState(null);
  const [cashQty, setCashQty] = useState(1);

  const fetchFavorites = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setFavorites([]);
      setFavIds(new Set());
      openLoginModal("Login required", "Login to view your favorites.");
      return [];
    }

    const { data } = await api.get(buildUsersUrl("favorites"));
    const arr = Array.isArray(data) ? data : [];
    setFavorites(arr);
    setFavIds(new Set(arr.map((p) => Number(p.id))));
    return arr;
  }, [openLoginModal]);

  const init = useCallback(async () => {
    setLoading(true);
    setError("");
    setStatus("Loading favorites...");

    try {
      await fetchFavorites();
      setStatus("Ready");
    } catch (e) {
      setError(explainAxiosError(e));
      setStatus("Failed to load favorites");
    } finally {
      setLoading(false);
    }
  }, [fetchFavorites]);

  useEffect(() => {
    init();
  }, [init]);

  const onRefresh = useCallback(async () => {
    setPage(1);
    await init();
  }, [init]);

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setSortMode("recent");
    setPageSize(9);
    setPage(1);
  }, []);

  // toggle favorite (remove/add)
  const toggleFavorite = useCallback(
    async (productId) => {
      const token = getAuthToken();
      if (!token) {
        openLoginModal("Login required", "You must login to manage favorites.");
        return;
      }

      setFavLoadingId(productId);
      try {
        const { data } = await api.post(buildUsersUrl(`favorites/${productId}/toggle`));

        // update local state immediately
        setFavorites((prev) => {
          const exists = prev.some((x) => Number(x.id) === Number(productId));
          if (data?.toggled === "removed") {
            return prev.filter((x) => Number(x.id) !== Number(productId));
          }
          // if "added" but we don’t have full product object here,
          // we re-fetch favorites to sync cleanly.
          if (data?.toggled === "added" && !exists) return prev;
          return prev;
        });

        setFavIds((prev) => {
          const next = new Set(prev);
          if (data?.toggled === "added") next.add(Number(productId));
          if (data?.toggled === "removed") next.delete(Number(productId));
          return next;
        });

        if (data?.toggled === "added") {
          // safest sync
          await fetchFavorites();
        }
      } catch (e) {
        console.log("toggle favorite failed:", e?.response?.data || e?.message);
      } finally {
        setFavLoadingId(null);
      }
    },
    [openLoginModal, fetchFavorites]
  );

  // open product modal (reuse shop public product detail)
  const handleOpenProduct = useCallback(async (productId, cardProduct) => {
    if (!productId) return;

    setIsModalOpen(true);
    setModalError("");
    setModalLoading(true);

    setBuyLoading(false);
    setBuyError("");
    setBuyInfo(null);
    setCashQty(1);

    if (cardProduct) setModalProduct(cardProduct);

    try {
      const { data } = await api.get(buildShopUrl(`public/products/${productId}`));
      setModalProduct(data);
    } catch (_) {
      setModalError("Failed to load product details.");
    } finally {
      setModalLoading(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalLoading(false);
    setModalError("");
    setModalProduct(null);

    setBuyLoading(false);
    setBuyError("");
    setBuyInfo(null);
    setCashQty(1);
  }, []);

  // filter/sort
  const applyFilterSort = useCallback(
    (list) => {
      let items = [...(Array.isArray(list) ? list : [])];

      const q = searchQuery.trim().toLowerCase();
      if (q) {
        items = items.filter((p) => {
          const name = normalizeString(p.name);
          return name.includes(q);
        });
      }

      const num = (v) => {
        const x = Number(v);
        return Number.isFinite(x) ? x : Infinity;
      };

      if (sortMode === "recent") {
        items.sort((a, b) => {
          const ta = new Date(a.favorited_at || a.created_at || 0).getTime();
          const tb = new Date(b.favorited_at || b.created_at || 0).getTime();
          return tb - ta;
        });
      }
      if (sortMode === "name_asc") {
        items.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      }
      if (sortMode === "cash_low") items.sort((a, b) => num(a.cash_price) - num(b.cash_price));
      if (sortMode === "cash_high") items.sort((a, b) => num(b.cash_price) - num(a.cash_price));

      return items;
    },
    [searchQuery, sortMode]
  );

  const filtered = useMemo(() => applyFilterSort(favorites), [favorites, applyFilterSort]);

  const nothingFound = !loading && filtered.length === 0;

  // pagination
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const paged = filtered.slice(start, end);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

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

      <SidebarFrame active="favorites">
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroCard}>
            <div className={styles.heroTop}>
              <div className={styles.heroIcon}>
                <FiHeart />
              </div>

              <div className={styles.heroMain}>
                <div className={styles.heroTitle}>Favorites</div>
                <div className={styles.heroSub}>
                  Your saved items — quick access to what you love.
                </div>

                <div className={styles.pills}>
                  <div className={styles.pill}>
                    <FiGrid />
                    <span>
                      Total: <b>{totalItems}</b>
                    </span>
                  </div>
                  <div className={styles.pillAlt}>
                    <FiSearch />
                    <span>Search & sort</span>
                  </div>
                </div>
              </div>

              <div className={styles.heroActions}>
                <button type="button" className={styles.btnPrimary} onClick={onRefresh}>
                  <FiRefreshCw style={{ marginRight: 8 }} />
                  Refresh
                </button>
                <button type="button" className={styles.btnGhost} onClick={resetFilters}>
                  Reset filters
                </button>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => (window.location.href = "/dashboard")}
                >
                  Back
                </button>
              </div>
            </div>

            <div className={styles.filters}>
              <div className={styles.searchWrap}>
                <FiSearch className={styles.searchIcon} />
                <input
                  className={styles.searchInput}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search favorites..."
                />
              </div>

              <div className={styles.selectWrap}>
                <select
                  className={styles.select}
                  value={sortMode}
                  onChange={(e) => {
                    setSortMode(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="recent">Recently favorited</option>
                  <option value="name_asc">Name (A–Z)</option>
                  <option value="cash_low">Cash price (low)</option>
                  <option value="cash_high">Cash price (high)</option>
                </select>

                <select
                  className={styles.select}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(toNumberOrNull(e.target.value) || 9);
                    setPage(1);
                  }}
                >
                  <option value={6}>6 / page</option>
                  <option value={9}>9 / page</option>
                  <option value={12}>12 / page</option>
                  <option value={18}>18 / page</option>
                </select>
              </div>
            </div>

            {!isProd && error ? (
              <div className={styles.devHint}>
                <span>Dev:</span> {String(error).slice(0, 220)}
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
                  <div className={styles.stateTitle}>We couldn’t load your favorites</div>
                  <div className={styles.stateSub}>Please try again.</div>
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
            <SkeletonGrid count={9} />
          ) : nothingFound ? (
            <div className={styles.stateCard}>
              <div className={styles.stateTop}>
                <div className={styles.stateIcon}>
                  <FiHeart />
                </div>
                <div>
                  <div className={styles.stateTitle}>No favorites yet</div>
                  <div className={styles.stateSub}>
                    Favorite items in the shop and they will show here.
                  </div>
                </div>
              </div>

              <div className={styles.stateActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => (window.location.href = "/shop")}
                >
                  Go to shop
                </button>
                <button type="button" className={styles.btnGhost} onClick={onRefresh}>
                  Refresh
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>Your favorites</div>
                <div className={styles.sectionSub}>
                  Showing {paged.length} of {totalItems}
                </div>
              </div>

              <div className={styles.grid}>
                {paged.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={{
                      ...p,
                      image_url: p.image_url, // already returned by API
                    }}
                    onOpen={handleOpenProduct}
                    isFav={favIds.has(Number(p.id))}
                    onToggleFav={toggleFavorite}
                    favLoadingId={favLoadingId}
                    // no buy handler here (favorites page is for viewing)
                  />
                ))}
              </div>

              {totalItems > 0 ? (
                <div className={styles.pagination}>
                  <div className={styles.pageLeft}>
                    <button
                      type="button"
                      className={styles.pageBtn}
                      onClick={() => setPage(1)}
                      disabled={safePage <= 1}
                      title="First"
                    >
                      <FiChevronsLeft />
                    </button>

                    <button
                      type="button"
                      className={styles.pageBtn}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      title="Prev"
                    >
                      <FiChevronLeft />
                    </button>

                    <div className={styles.pageInfo}>
                      Page <b>{safePage}</b> / {totalPages}
                    </div>

                    <button
                      type="button"
                      className={styles.pageBtn}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                      title="Next"
                    >
                      <FiChevronRight />
                    </button>

                    <button
                      type="button"
                      className={styles.pageBtn}
                      onClick={() => setPage(totalPages)}
                      disabled={safePage >= totalPages}
                      title="Last"
                    >
                      <FiChevronsRight />
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
      </SidebarFrame>

      <Footer />

      <ProductModal
        isOpen={isModalOpen}
        onClose={closeModal}
        loading={modalLoading}
        error={modalError}
        product={modalProduct}
        onBuy={() => {}}               /* Favorites page: no buy */
        buyLoading={buyLoading}
        buyError={buyError}
        buyInfo={buyInfo}
        cashQty={cashQty}
        onCashQtyChange={setCashQty}
      />

      <LoginRequiredModal
        open={loginModalOpen}
        onClose={closeLoginModal}
        title={loginModalMeta.title}
        message={loginModalMeta.message}
      />
    </div>
  );
}
