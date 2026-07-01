// src/pages/CopUpBidShop/CopUpBidShop.jsx

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./CopUpBidShop.module.css";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { api } from "../../lib/api";
import CategoryChips from "../../components/CategoryChips/CategoryChips";
import SkeletonGrid from "../../components/SkeletonGrid/SkeletonGrid";
import ProductCard from "../../components/ProductCard/ProductCard";
import ProductModal from "../../components/ProductModal/ProductModal";
import LoginRequiredModal from "../../components/LoginRequiredModal/LoginRequiredModal";
import { emitBalanceUpdated } from "../../lib/copupEvents";
import BannerCarousel from "./components/BannerCarousel/BannerCarousel";

import {
  FiAlertTriangle,
  FiRefreshCw,
  FiRotateCcw,
  FiShoppingCart,
  FiGrid,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
} from "react-icons/fi";
import {
  BadgePercent,
  Boxes,
  CircleUserRound,
  CreditCard,
  Gift,
  Headphones,
  Heart,
  Home,
  MapPin,
  PackageCheck,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tags,
  Truck,
  Zap,
} from "lucide-react";

const normalizeString = (v) => String(v ?? "").toLowerCase();

function getAuthToken() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken");
}

function toNumberOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ✅ Prevent /shop/shop
function buildShopUrl(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  const base = String(api?.defaults?.baseURL || "").toLowerCase();
  const baseHasShop =
    base.includes("/shop") || base.endsWith("/shop") || base.includes("/shop/");
  return baseHasShop ? clean : `shop/${clean}`;
}

// ✅ /api/users/...
function buildUsersUrl(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  return `users/${clean}`;
}

// ✅ safe qty
function parseQty(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

function formatCoin(n) {
  const val = Number(n);
  if (!Number.isFinite(val)) return "0";
  return val.toLocaleString();
}

// ✅ ALWAYS send Bearer token when you have it (so buy/fav works even without interceptors)
function authConfig(token) {
  if (!token) return undefined;
  return { headers: { Authorization: `Bearer ${token}` } };
}

export default function CopUpBidShop() {
  const navigate = useNavigate();

  const isProd =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.MODE === "production") ||
    process.env.NODE_ENV === "production";

  // ✅ banner state
  const [banners, setBanners] = useState([]);
  const [bannerLoading, setBannerLoading] = useState(true);

  // data
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);

  // favorites
  const [favIds, setFavIds] = useState(() => new Set());
  const [favLoadingId, setFavLoadingId] = useState(null);

  // ui
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("name_asc");

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  // ✅ ProductModal (BUY ONLY)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalProduct, setModalProduct] = useState(null);

  // BUY state
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState("");
  const [buyInfo, setBuyInfo] = useState(null);
  const [cashQty, setCashQty] = useState(1);

  // ✅ login required modal state
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

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return "All Products";
    const found = (Array.isArray(categories) ? categories : []).find(
      (c) => Number(c?.id) === Number(selectedCategoryId)
    );
    return found?.name || "Category";
  }, [categories, selectedCategoryId]);

  // fetches
  const fetchCategories = useCallback(async () => {
    const { data } = await api.get(buildShopUrl("public/categories"));
    setCategories(Array.isArray(data) ? data : []);
  }, []);

  const fetchAllProducts = useCallback(async () => {
    const { data } = await api.get(buildShopUrl("public/products"));
    const arr = Array.isArray(data) ? data : [];
    setAllProducts(arr);
    return arr;
  }, []);

  const fetchCategoryProducts = useCallback(async (catId) => {
    const { data } = await api.get(buildShopUrl(`public/categories/${catId}/products`));
    return Array.isArray(data) ? data : [];
  }, []);

  // ✅ fetch banners
  const fetchBanners = useCallback(async () => {
    setBannerLoading(true);
    try {
      const { data } = await api.get(buildShopUrl("banner"));
      const arr = Array.isArray(data?.banners) ? data.banners : [];
      setBanners(arr);
    } catch (_) {
      setBanners([]);
    } finally {
      setBannerLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(
    async (forcedCategoryId = undefined) => {
      setError("");
      setLoadingProducts(true);
      setStatus("Loading products...");

      try {
        const raw =
          forcedCategoryId !== undefined ? forcedCategoryId : selectedCategoryId;
        const catId = toNumberOrNull(raw);

        if (catId) {
          const catProducts = await fetchCategoryProducts(catId);
          setProducts(catProducts);
          setStatus(`Category: ${selectedCategoryName}`);
        } else {
          const all = await fetchAllProducts();
          setProducts(all);
          setStatus("All products");
        }
      } catch (e) {
        setError(explainAxiosError(e));
        setStatus("Failed to load products");
      } finally {
        setLoadingProducts(false);
      }
    },
    [selectedCategoryId, selectedCategoryName, fetchAllProducts, fetchCategoryProducts]
  );

  const fetchFeatured = useCallback(async () => {
    try {
      const { data } = await api.get(buildShopUrl("public/featured/products"));
      setFeaturedProducts(Array.isArray(data) ? data : []);
    } catch (_) {
      setFeaturedProducts([]);
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setFavIds(new Set());
      return;
    }
    try {
      // ✅ force auth header so it works even without axios interceptors
      const { data } = await api.get(buildUsersUrl("favorites"), authConfig(token));
      const ids = new Set((Array.isArray(data) ? data : []).map((x) => Number(x.id)));
      setFavIds(ids);
    } catch (_) {
      setFavIds(new Set());
    }
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    setError("");
    setStatus("Loading...");

    try {
      await fetchCategories();
      const [all] = await Promise.all([
        fetchAllProducts(),
        fetchFeatured(),
        fetchFavorites(),
        fetchBanners(),
      ]);
      setProducts(all || []);
      setSelectedCategoryId(null);
      setStatus("Ready");
    } catch (e) {
      setError(explainAxiosError(e));
      setStatus("Failed to initialize");
    } finally {
      setLoading(false);
      setLoadingProducts(false);
    }
  }, [fetchCategories, fetchAllProducts, fetchFeatured, fetchFavorites, fetchBanners]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (loading) return;
    setPage(1);
    fetchProducts(selectedCategoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

  const onRefresh = async () => {
    setPage(1);
    await Promise.all([
      fetchAllProducts(),
      fetchProducts(selectedCategoryId),
      fetchFeatured(),
      fetchFavorites(),
      fetchBanners(),
    ]);
  };

  const resetFilters = useCallback(async () => {
    setSelectedCategoryId(null);
    setSearchQuery("");
    setSortMode("name_asc");
    setPageSize(9);
    setPage(1);

    await Promise.all([
      fetchAllProducts(),
      fetchProducts(null),
      fetchFeatured(),
      fetchFavorites(),
      fetchBanners(),
    ]);
  }, [fetchAllProducts, fetchProducts, fetchFeatured, fetchFavorites, fetchBanners]);

  // ✅ favorites toggle (opens login modal if logged out)
  const toggleFavorite = useCallback(
    async (productId) => {
      const token = getAuthToken();
      if (!token) {
        openLoginModal("Login required", "You must login to favorite items.");
        return;
      }

      setFavLoadingId(productId);
      try {
        // ✅ force auth header so it works always
        const { data } = await api.post(
          buildUsersUrl(`favorites/${productId}/toggle`),
          {},
          authConfig(token)
        );
        setFavIds((prev) => {
          const next = new Set(prev);
          if (data?.toggled === "added") next.add(Number(productId));
          if (data?.toggled === "removed") next.delete(Number(productId));
          return next;
        });
      } catch (err) {
        console.log("favorite toggle failed", err?.response?.data || err?.message);
      } finally {
        setFavLoadingId(null);
      }
    },
    [openLoginModal]
  );

  // ✅ VIEW: card click still goes to detail page
  const handleOpenProduct = useCallback(
    (productId /*, productObj */) => {
      if (!productId) return;
      navigate(`/shop/product/${productId}`);
    },
    [navigate]
  );

  // ✅ modal open/close (BUY ONLY)
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

  // ✅ Buy button opens modal (and loads product details)
  const openBuyModal = useCallback(async (productId, productObj = null) => {
    if (!productId) return;

    setIsModalOpen(true);
    setModalError("");
    setModalLoading(true);

    setBuyLoading(false);
    setBuyError("");
    setBuyInfo(null);
    setCashQty(1);

    if (productObj) setModalProduct(productObj);

    try {
      const { data } = await api.get(buildShopUrl(`public/products/${productId}`));
      setModalProduct(data);
    } catch (_) {
      setModalError("Failed to load product details.");
    } finally {
      setModalLoading(false);
    }
  }, []);

  // ✅ BUY ONLY: POST /api/users/buy
  const buyProduct = useCallback(
    async ({ productId, qty = 1 }) => {
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
        const payload = { product_id: Number(productId), qty: parseQty(qty) };

        // ✅ force auth header so buy works always
        const { data } = await api.post(buildUsersUrl("buy"), payload, authConfig(token));

        setBuyInfo(data);

        // ✅ notify header/toolbar to refresh balance immediately
        emitBalanceUpdated({ source: "buy", payload: data });
      } catch (e) {
        const server = e?.response?.data || {};
        const msg = server?.message || e?.message || "Buy failed";
        setBuyError(msg);
      } finally {
        setBuyLoading(false);
      }
    },
    [openLoginModal]
  );

  // Card action: Buy -> open modal (NOT buy immediately)
  const onBuyPay = useCallback(
    async (productId, productObj) => {
      await openBuyModal(productId, productObj);
    },
    [openBuyModal]
  );

  // Modal action: Buy uses qty
  const onBuy = useCallback(async () => {
    if (!modalProduct?.id) return;
    await buyProduct({ productId: modalProduct.id, qty: cashQty });
  }, [modalProduct, cashQty, buyProduct]);

  // filter/sort
  const applyFilterSort = useCallback(
    (list) => {
      let items = [...(Array.isArray(list) ? list : [])];

      const q = searchQuery.trim().toLowerCase();
      if (q) {
        items = items.filter((p) => {
          const name = normalizeString(p.name);
          const cats = normalizeString(p.categories || p.category_name || "");
          return name.includes(q) || cats.includes(q);
        });
      }

      const num = (v) => {
        const x = Number(v);
        return Number.isFinite(x) ? x : Infinity;
      };

      if (sortMode === "name_asc") {
        items.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      }
      if (sortMode === "cash_low") items.sort((a, b) => num(a.cash_price) - num(b.cash_price));
      if (sortMode === "cash_high") items.sort((a, b) => num(b.cash_price) - num(a.cash_price));

      return items;
    },
    [searchQuery, sortMode]
  );

  const showFeatured = selectedCategoryId === null;

  const filteredFeatured = useMemo(() => {
    if (!showFeatured) return [];
    return applyFilterSort(featuredProducts);
  }, [featuredProducts, applyFilterSort, showFeatured]);

  const filteredCategoryProducts = useMemo(() => {
    if (selectedCategoryId === null) return [];
    return applyFilterSort(products);
  }, [products, applyFilterSort, selectedCategoryId]);

  const categoryIsEmpty = selectedCategoryId !== null && filteredCategoryProducts.length === 0;

  const filteredAllProducts = useMemo(() => {
    const featuredIds = new Set((showFeatured ? filteredFeatured : []).map((x) => String(x.id)));
    const base = (Array.isArray(allProducts) ? allProducts : []).filter(
      (p) => !featuredIds.has(String(p.id))
    );
    return applyFilterSort(base);
  }, [allProducts, applyFilterSort, showFeatured, filteredFeatured]);

  const effectiveList = useMemo(() => {
    if (selectedCategoryId === null) return filteredAllProducts;
    if (!categoryIsEmpty) return filteredCategoryProducts;
    return filteredAllProducts;
  }, [selectedCategoryId, filteredAllProducts, filteredCategoryProducts, categoryIsEmpty]);

  const nothingFound = showFeatured
    ? filteredFeatured.length === 0 && filteredAllProducts.length === 0
    : selectedCategoryId === null
    ? filteredAllProducts.length === 0
    : !categoryIsEmpty
    ? filteredCategoryProducts.length === 0
    : filteredAllProducts.length === 0;

  // pagination
  const totalItems = effectiveList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const pagedProducts = effectiveList.slice(start, end);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  const visibleCount =
    (showFeatured ? filteredFeatured.length : 0) +
    (selectedCategoryId === null
      ? filteredAllProducts.length
      : categoryIsEmpty
      ? filteredAllProducts.length
      : filteredCategoryProducts.length);

  const scrollToCategories = useCallback(() => {
    const el = document.getElementById("shop-categories");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const primaryCategoryCards = useMemo(() => {
    const source = Array.isArray(categories) ? categories.slice(0, 6) : [];
    const fallback = ["Auctions", "Fashion", "Electronics", "Home", "Collectibles", "Gaming"];
    const labels = source.length ? source.map((c) => c?.name || "Category") : fallback;
    const icons = [ShoppingBag, Sparkles, Headphones, PackageCheck, Boxes, Gift];
    return labels.slice(0, 6).map((label, index) => ({
      label,
      icon: icons[index] || Boxes,
      id: source[index]?.id ?? source[index]?.category_id ?? null,
    }));
  }, [categories]);

  const cartPreviewItems = useMemo(() => {
    const seen = new Set();
    return [...filteredFeatured, ...effectiveList]
      .filter((item) => {
        if (!item?.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .slice(0, 4);
  }, [filteredFeatured, effectiveList]);

  const previewTotal = cartPreviewItems.reduce(
    (sum, item) => sum + (Number(item?.cash_price) || 0),
    0
  );

  const recentProducts = useMemo(
    () => [...(Array.isArray(allProducts) ? allProducts : [])].slice(0, 4),
    [allProducts]
  );

  const navItems = [
    { label: "Home", icon: Home, active: true, onClick: resetFilters },
    { label: "Categories", icon: Boxes, onClick: scrollToCategories },
    { label: "Deals", icon: BadgePercent, onClick: scrollToCategories },
    { label: "Auctions", icon: Tags, onClick: () => navigate("/auctions") },
    { label: "Winners", icon: Star, onClick: () => navigate("/winners") },
  ];

  const accountItems = [
    { label: "Cart", icon: ShoppingBag, onClick: () => navigate("/cart") },
    { label: "Favorites", icon: Heart, onClick: () => navigate("/favorites") },
    { label: "Profile", icon: CircleUserRound, onClick: () => navigate("/profile") },
    { label: "Account", icon: Settings, onClick: () => navigate("/account") },
  ];

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.shell}>
        <aside className={styles.sidebar} aria-label="Shop navigation">
          <div className={styles.sideBrand}>
            <ShoppingBag size={22} />
            <span>CopUpBid</span>
          </div>

          <nav className={styles.sideNav}>
            {navItems.map(({ label, icon, active, onClick }) => (
              <button
                key={label}
                type="button"
                className={`${styles.sideItem} ${active ? styles.sideItemActive : ""}`}
                onClick={onClick}
              >
                {React.createElement(icon, { size: 17 })}
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className={styles.sideDivider} />

          <nav className={styles.sideNav}>
            {accountItems.map(({ label, icon, onClick }) => (
              <button key={label} type="button" className={styles.sideItem} onClick={onClick}>
                {React.createElement(icon, { size: 17 })}
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className={styles.offerCard}>
            <span>Special offer</span>
            <strong>Shop featured drops</strong>
            <button type="button" onClick={scrollToCategories}>Browse</button>
          </div>
        </aside>

        <main className={styles.main}>
          <section className={styles.mobileNav} aria-label="Quick navigation">
            {navItems.slice(0, 4).map(({ label, icon, active, onClick }) => (
              <button
                key={label}
                type="button"
                className={`${styles.mobileNavItem} ${active ? styles.mobileNavActive : ""}`}
                onClick={onClick}
              >
                {React.createElement(icon, { size: 16 })}
                <span>{label}</span>
              </button>
            ))}
          </section>

          <section className={styles.searchPanel} id="shop-categories">
            <CategoryChips
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelect={(val) => setSelectedCategoryId(toNumberOrNull(val))}
              mode="select"
              status={status}
              loading={loading || loadingProducts}
              searchQuery={searchQuery}
              onSearchChange={(v) => {
                setSearchQuery(v);
                setPage(1);
              }}
              sortMode={sortMode}
              onSortChange={(v) => {
                setSortMode(v);
                setPage(1);
              }}
            />
          </section>

          <section className={styles.bannerSection}>
            <BannerCarousel
              banners={banners}
              loading={bannerLoading}
              brand="New Drop"
              subtitle="Discover featured drops, limited stock, and premium deals."
              autoPlay
              intervalMs={5500}
              onBrowse={scrollToCategories}
              showSubtitle
            />
          </section>

          <section className={styles.categoryTiles} aria-label="Featured categories">
            {primaryCategoryCards.map(({ label, icon, id }) => (
              <button
                key={`${label}-${id ?? "fallback"}`}
                type="button"
                className={styles.categoryTile}
                onClick={() => {
                  setSelectedCategoryId(toNumberOrNull(id));
                  setPage(1);
                }}
              >
                <span>{React.createElement(icon, { size: 20 })}</span>
                <strong>{label}</strong>
              </button>
            ))}
          </section>

          <section className={styles.promoGrid}>
            <button type="button" className={styles.promoCard} onClick={scrollToCategories}>
              <span>Flash deals</span>
              <strong>{visibleCount} live products</strong>
              <small>Shop now</small>
            </button>
            <button type="button" className={styles.promoCard} onClick={() => navigate("/how-to-play")}>
              <span>Easy bidding</span>
              <strong>Learn the rules</strong>
              <small>How it works</small>
            </button>
            <button type="button" className={styles.promoCard} onClick={() => navigate("/affiliate")}>
              <span>Rewards</span>
              <strong>Invite and earn</strong>
              <small>Join program</small>
            </button>
          </section>

          <section className={styles.products}>
          {error ? (
            /* ... keep your error UI exactly as-is ... */
            <div className={styles.stateCard}>
              <div className={styles.stateTop}>
                <div className={styles.stateIcon}>
                  <FiAlertTriangle />
                </div>
                <div>
                  <div className={styles.stateTitle}>We couldn’t load the shop</div>
                  <div className={styles.stateSub}>Please check your connection and try again.</div>
                </div>
              </div>

              <div className={styles.stateDetails}>
                <div className={styles.stateMiniTitle}>What you can do</div>
                <ul className={styles.stateList}>
                  <li>
                    Tap <b>Try again</b>
                  </li>
                  <li>Switch network (Wi-Fi / Data)</li>
                  <li>If it keeps happening, it might be the server</li>
                </ul>

                {!isProd ? (
                  <div className={styles.devHint}>
                    <span>Dev:</span> {String(error).slice(0, 220)}
                  </div>
                ) : null}
              </div>

              <div className={styles.stateActions}>
                <button type="button" className={styles.btnPrimary} onClick={init}>
                  <FiRefreshCw style={{ marginRight: 8 }} />
                  Try again
                </button>
                <button type="button" className={styles.btnGhost} onClick={resetFilters}>
                  <FiRotateCcw style={{ marginRight: 8 }} />
                  Reset filters
                </button>
                <button type="button" className={styles.btnGhost} onClick={onRefresh}>
                  <FiRefreshCw style={{ marginRight: 8 }} />
                  Refresh
                </button>
              </div>
            </div>
          ) : loading || loadingProducts ? (
            <SkeletonGrid count={9} />
          ) : nothingFound ? (
            /* ... keep your empty UI exactly as-is ... */
            <div className={styles.stateCard}>
              <div className={styles.stateTop}>
                <div className={styles.stateIcon}>
                  <FiShoppingCart />
                </div>
                <div>
                  <div className={styles.stateTitle}>No products found</div>
                  <div className={styles.stateSub}>Nothing matches your current filters.</div>
                </div>
              </div>

              <div className={styles.stateDetails}>
                <div className={styles.stateMiniTitle}>Try this</div>
                <ul className={styles.stateList}>
                  <li>Clear your search</li>
                  <li>
                    Select <b>All Categories</b>
                  </li>
                  <li>Refresh the shop</li>
                </ul>
              </div>

              <div className={styles.stateActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                >
                  <FiRotateCcw style={{ marginRight: 8 }} />
                  Clear search
                </button>
                <button type="button" className={styles.btnGhost} onClick={resetFilters}>
                  <FiRotateCcw style={{ marginRight: 8 }} />
                  Show all categories
                </button>
                <button type="button" className={styles.btnGhost} onClick={onRefresh}>
                  <FiRefreshCw style={{ marginRight: 8 }} />
                  Refresh
                </button>
              </div>
            </div>
          ) : (
            <>
              {showFeatured && filteredFeatured.length > 0 ? (
                <div className={styles.featuredWrap}>
                  <div className={styles.featuredHeader}>
                    <div>
                  <div className={styles.featuredTitle}>Featured</div>
                      <div className={styles.featuredSub}>Top picks</div>
                    </div>
                  </div>

                  <div className={styles.grid}>
                    {filteredFeatured.map((p) => (
                      <ProductCard
                        key={`feat-${p.id}`}
                        product={p}
                        onOpen={handleOpenProduct} // ✅ View -> /shop/product/:id
                        isFav={favIds.has(Number(p.id))}
                        onToggleFav={toggleFavorite}
                        favLoadingId={favLoadingId}
                        onBuyPay={onBuyPay} // ✅ Buy -> opens ProductModal
                        variant="home"
                      />
                    ))}
                  </div>

                  <div className={styles.divider} />
                </div>
              ) : null}

              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                  {selectedCategoryId ? selectedCategoryName : "All Products"}
                </div>
                <div className={styles.sectionSub}>
                  Showing {pagedProducts.length} of {totalItems}
                </div>
              </div>

              <div className={styles.grid}>
                {pagedProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onOpen={handleOpenProduct} // ✅ View -> /shop/product/:id
                    isFav={favIds.has(Number(p.id))}
                    onToggleFav={toggleFavorite}
                    favLoadingId={favLoadingId}
                    onBuyPay={onBuyPay} // ✅ Buy -> opens ProductModal
                    variant="home"
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

                  <div className={styles.pageRight}>
                    <span className={styles.pageLabel}>Per page</span>
                    <select
                      className={styles.pageSelect}
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value) || 9);
                        setPage(1);
                      }}
                    >
                      <option value={6}>6</option>
                      <option value={9}>9</option>
                      <option value={12}>12</option>
                      <option value={18}>18</option>
                    </select>
                  </div>
                </div>
              ) : null}
            </>
          )}
          </section>
        </main>

        <aside className={styles.cartRail} aria-label="Shop summary">
          <div className={styles.railCard}>
            <div className={styles.railHeader}>
              <strong>My Cart</strong>
              <span>{cartPreviewItems.length}</span>
            </div>

            <div className={styles.cartList}>
              {cartPreviewItems.map((item) => (
                <button
                  key={`cart-${item.id}`}
                  type="button"
                  className={styles.cartItem}
                  onClick={() => handleOpenProduct(item.id, item)}
                >
                  <img src={item.image_url || "/copupcoin.png"} alt="" />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{formatCoin(item.cash_price)} COIN</small>
                  </span>
                </button>
              ))}
            </div>

            <div className={styles.checkoutBox}>
              <div><span>Subtotal</span><strong>{formatCoin(previewTotal)} COIN</strong></div>
              <div><span>Shipping</span><strong>Free</strong></div>
              <div className={styles.totalLine}><span>Total</span><strong>{formatCoin(previewTotal)} COIN</strong></div>
              <button type="button" onClick={() => navigate("/cart")}>
                <CreditCard size={16} />
                Checkout
              </button>
            </div>
          </div>

          <div className={styles.railCard}>
            <div className={styles.railHeader}>
              <strong>Recently Viewed</strong>
            </div>
            <div className={styles.recentStrip}>
              {recentProducts.map((item) => (
                <button
                  key={`recent-${item.id}`}
                  type="button"
                  onClick={() => handleOpenProduct(item.id, item)}
                >
                  <img src={item.image_url || "/copupcoin.png"} alt="" />
                </button>
              ))}
            </div>
          </div>

          <div className={styles.serviceGrid}>
            <div><ShieldCheck size={18} /><span>Secure payment</span></div>
            <div><Truck size={18} /><span>Fast updates</span></div>
            <div><Headphones size={18} /><span>24/7 support</span></div>
            <div><MapPin size={18} /><span>Tracked orders</span></div>
          </div>

          <div className={styles.joinCard}>
            <Zap size={20} />
            <strong>Join CopUpBid Club</strong>
            <span>Get exclusive drops and member rewards.</span>
            <button type="button" onClick={() => navigate("/auth/register")}>Join now</button>
          </div>
        </aside>
      </div>

      <Footer />

      {/* ✅ BUY MODAL (Buy button opens this) */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={closeModal}
        loading={modalLoading}
        error={modalError}
        product={modalProduct}
        onBuy={onBuy}
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
