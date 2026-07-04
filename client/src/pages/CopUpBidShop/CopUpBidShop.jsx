// src/pages/CopUpBidShop/CopUpBidShop.jsx

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./CopUpBidShop.module.css";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { api } from "../../lib/api";
import CategoryChips from "../../components/CategoryChips/CategoryChips";
import SkeletonGrid from "../../components/SkeletonGrid/SkeletonGrid";
import ProductCard from "../../components/ProductCard/ProductCard";
import ProductModal from "../../components/ProductModal/ProductModal";
import LoginRequiredModal from "../../components/LoginRequiredModal/LoginRequiredModal";
import ShopSidebar from "../../components/ShopSidebar/ShopSidebar";
import { COPUP_EVENTS, emitBalanceUpdated, emitCartUpdated } from "../../lib/copupEvents";
import BannerCarousel from "./components/BannerCarousel/BannerCarousel";

import {
  FiAlertTriangle,
  FiRefreshCw,
  FiRotateCcw,
  FiShoppingCart,
} from "react-icons/fi";
import {
  CreditCard,
  Headphones,
  MapPin,
  ShieldCheck,
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
  const location = useLocation();

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
  const [shopCart, setShopCart] = useState([]);
  const [auctionCart, setAuctionCart] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);

  // ui
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("name_asc");
  const [seoExpanded, setSeoExpanded] = useState(false);

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
  const [loginModalMeta, setLoginModalMeta] = useState({
    title: "",
    message: "",
    redirectTo: "/",
  });

  const openLoginModal = useCallback((title, message, redirectTo = "/") => {
    setLoginModalMeta({
      title: title || "Login required",
      message:
        message ||
        "You can browse freely, but you must login to favorite or buy items.",
      redirectTo,
    });
    setLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);

  const goProtected = useCallback(
    (path, title = "Login required", message = "Please login to continue.") => {
      const token = getAuthToken();
      if (!token) {
        openLoginModal(title, message, path);
        return;
      }
      navigate(path);
    },
    [navigate, openLoginModal]
  );

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

  const fetchUserCart = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setShopCart([]);
      setAuctionCart([]);
      return;
    }

    setCartLoading(true);
    try {
      const [shopRes, auctionRes] = await Promise.allSettled([
        api.get(buildUsersUrl("shop/cart")),
        api.get(buildUsersUrl("cart")),
      ]);

      const shopRows =
        shopRes.status === "fulfilled"
          ? Array.isArray(shopRes.value.data)
            ? shopRes.value.data
            : Array.isArray(shopRes.value.data?.items)
            ? shopRes.value.data.items
            : []
          : [];
      const auctionRows =
        auctionRes.status === "fulfilled" && Array.isArray(auctionRes.value.data)
          ? auctionRes.value.data
          : [];

      setShopCart(shopRows);
      setAuctionCart(auctionRows);
    } finally {
      setCartLoading(false);
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
        fetchUserCart(),
      ]);
      setProducts(all || []);
      const categoryFromUrl = toNumberOrNull(new URLSearchParams(window.location.search).get("category"));
      setSelectedCategoryId(categoryFromUrl || null);
      setStatus("Ready");
    } catch (e) {
      setError(explainAxiosError(e));
      setStatus("Failed to initialize");
    } finally {
      setLoading(false);
      setLoadingProducts(false);
    }
  }, [fetchCategories, fetchAllProducts, fetchFeatured, fetchFavorites, fetchBanners, fetchUserCart]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryFromUrl = toNumberOrNull(params.get("category"));
    if (categoryFromUrl) {
      setSelectedCategoryId(categoryFromUrl);
      setPage(1);
    }
  }, [location.search]);

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
      fetchUserCart(),
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
      fetchUserCart(),
    ]);
  }, [fetchAllProducts, fetchProducts, fetchFeatured, fetchFavorites, fetchBanners, fetchUserCart]);

  useEffect(() => {
    const refreshCart = () => fetchUserCart();
    window.addEventListener(COPUP_EVENTS.AUTH_CHANGED, refreshCart);
    window.addEventListener(COPUP_EVENTS.CART_UPDATED, refreshCart);
    window.addEventListener(COPUP_EVENTS.BALANCE_UPDATED, refreshCart);
    window.addEventListener("storage", refreshCart);
    return () => {
      window.removeEventListener(COPUP_EVENTS.AUTH_CHANGED, refreshCart);
      window.removeEventListener(COPUP_EVENTS.CART_UPDATED, refreshCart);
      window.removeEventListener(COPUP_EVENTS.BALANCE_UPDATED, refreshCart);
      window.removeEventListener("storage", refreshCart);
    };
  }, [fetchUserCart]);

  // ✅ favorites toggle (opens login modal if logged out)
  const toggleFavorite = useCallback(
    async (productId) => {
      const token = getAuthToken();
      if (!token) {
        openLoginModal("Login required", "You must login to favorite items.", "/favorites");
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
        openLoginModal("Login required", "You must login to buy items.", "/cart");
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
        emitCartUpdated({ source: "buy", payload: data });
        fetchUserCart();
      } catch (e) {
        const server = e?.response?.data || {};
        const msg = server?.message || e?.message || "Buy failed";
        setBuyError(msg);
      } finally {
        setBuyLoading(false);
      }
    },
    [openLoginModal, fetchUserCart]
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

  const filteredAllProducts = useMemo(() => {
    const featuredIds = new Set((showFeatured ? filteredFeatured : []).map((x) => String(x.id)));
    const base = (Array.isArray(allProducts) ? allProducts : []).filter(
      (p) => !featuredIds.has(String(p.id))
    );
    return applyFilterSort(base);
  }, [allProducts, applyFilterSort, showFeatured, filteredFeatured]);

  const effectiveList = useMemo(() => {
    if (selectedCategoryId === null) return filteredAllProducts;
    return filteredCategoryProducts;
  }, [selectedCategoryId, filteredAllProducts, filteredCategoryProducts]);

  const nothingFound = showFeatured
    ? filteredFeatured.length === 0 && filteredAllProducts.length === 0
    : selectedCategoryId === null
    ? filteredAllProducts.length === 0
    : filteredCategoryProducts.length === 0;

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
      : filteredCategoryProducts.length);

  const scrollToCategories = useCallback(() => {
    const el = document.getElementById("shop-categories");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToFeatured = useCallback(() => {
    setSelectedCategoryId(null);
    setSearchQuery("");
    setPage(1);

    window.setTimeout(() => {
      const el = document.getElementById("shop-featured");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }, []);

  const realCartItems = useMemo(() => {
    const shop = (Array.isArray(shopCart) ? shopCart : []).map((item) => ({
      id: `shop-${item.id}`,
      productId: item.product_id,
      name: item.product_name || item.name || "Shop item",
      image: item.image_url || item.image || "",
      qty: Number(item.qty) || 1,
      total: Number(item.subtotal) || (Number(item.price) || 0) * (Number(item.qty) || 1),
      type: "Shop",
    }));

    const auctions = (Array.isArray(auctionCart) ? auctionCart : []).map((item) => ({
      id: `auction-${item.id}`,
      productId: null,
      name: item.name || "Auction item",
      image: item.image || "",
      qty: 1,
      total: Number(item.displayPricePoints) || Number(item.pointsSpent) || Number(item.price) || 0,
      type: "Auction",
    }));

    return [...shop, ...auctions];
  }, [shopCart, auctionCart]);

  const cartPreviewItems = realCartItems.slice(0, 4);
  const previewTotal = realCartItems.reduce((sum, item) => sum + (Number(item?.total) || 0), 0);
  const realCartCount = realCartItems.reduce((sum, item) => sum + (Number(item?.qty) || 1), 0);

  const recentProducts = useMemo(
    () => [...(Array.isArray(allProducts) ? allProducts : [])].slice(0, 4),
    [allProducts]
  );

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.shell}>
        <ShopSidebar
          active="home"
          onHomeClick={resetFilters}
          onCategoriesClick={scrollToCategories}
          onDealsClick={scrollToFeatured}
          onBrowseClick={scrollToCategories}
        />

        <main className={styles.main}>
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
              onBrowse={scrollToFeatured}
              showSubtitle
            />
          </section>

          <section className={styles.promoGrid}>
            <button type="button" className={styles.promoCard} onClick={scrollToFeatured}>
              <span>Flash deals</span>
              <strong>{visibleCount} live products</strong>
              <small>Shop now</small>
            </button>
            <button type="button" className={styles.promoCard} onClick={() => goProtected("/how-to-play")}>
              <span>Easy bidding</span>
              <strong>Learn the rules</strong>
              <small>How it works</small>
            </button>
            <button type="button" className={styles.promoCard} onClick={() => goProtected("/affiliate")}>
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
                  <div className={styles.stateTitle}>
                    {selectedCategoryId ? `${selectedCategoryName} is empty` : "No products found"}
                  </div>
                  <div className={styles.stateSub}>
                    {selectedCategoryId
                      ? "There are no products listed in this category yet."
                      : "Nothing matches your current filters."}
                  </div>
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
              <div id="shop-featured" className={styles.scrollAnchor} />

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
                      className={styles.pageTextBtn}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                    >
                      Previous
                    </button>

                    <div className={styles.pageInfo}>
                      Page <b>{safePage}</b> / {totalPages}
                    </div>

                    <button
                      type="button"
                      className={styles.pageTextBtn}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                    >
                      Next
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

          <section
            className={`${styles.aboutSeo} ${seoExpanded ? styles.aboutSeoExpanded : ""}`}
            aria-labelledby="about-copupbid"
          >
            <div className={styles.aboutSeoHeader}>
              <span>Nigeria's auction marketplace</span>
              <h1 id="about-copupbid">CopUpBid - bid, shop, and win with CopUpCoin</h1>
              <p>
                CopUpBid is an online auction e-commerce website for Nigerian shoppers who want a
                smarter way to discover products, join live auctions, and shop from one trusted
                digital marketplace.
              </p>
            </div>

            <div className={styles.aboutSeoBody}>
              <article>
                <h2>Shop for products and auction deals on CopUpBid Nigeria</h2>
                <p>
                  CopUpBid brings shopping and auction bidding together in one platform. Customers
                  can browse product drops, view item details, save favorites, add items to cart,
                  check auction winners, and return to their account dashboard after login. Whether
                  you are searching for electronics, mobile phones, computer accessories, fashion,
                  beauty products, home items, gifts, gadgets, or seasonal deals, CopUpBid is built
                  to help you find useful products and compete for better prices through auctions.
                </p>
                <p>
                  The platform is designed for Nigerian bidders and online shoppers who want a clear
                  process: create an account, load or earn CopUpCoin where available, browse live
                  listings, join eligible auctions, place valid bids, and complete checkout when you
                  win or buy an item directly. You can shop from home, during work breaks, or on
                  mobile while keeping your profile, cart, favorites, order activity, and auction
                  history in one place.
                </p>
              </article>

              <article>
                <h2>How CopUpBid auctions work</h2>
                <p>
                  CopUpBid auctions are made to be simple. A product is listed with auction details,
                  bidding opens for eligible users, and bidders use the available balance or bid
                  points shown in their account. When the auction closes, the highest verified bidder
                  can win the item and continue with the required payment or fulfillment steps. This
                  gives shoppers a chance to compete for products while still using a structured
                  marketplace flow.
                </p>
                <p>
                  To keep the auction experience fair, CopUpBid may review bidding activity, account
                  behavior, payment records, and delivery details. Fake accounts, bot activity,
                  collusion, payment abuse, and attempts to manipulate auctions can lead to cancelled
                  bids, restricted accounts, or other actions allowed by the platform rules.
                </p>
              </article>

              <article>
                <h2>Buy original products, gadgets, fashion, and everyday items</h2>
                <p>
                  CopUpBid can support a wide range of shopping categories. Electronics shoppers can
                  look for phones, laptops, chargers, smart devices, gaming accessories, and other
                  gadgets. Fashion buyers can discover clothing, shoes, bags, jewelry, watches, and
                  accessories. Home shoppers can browse decor, small appliances, furniture, kitchen
                  products, and lifestyle items. The marketplace can also feature beauty products,
                  collectibles, sports items, gift bundles, and limited seasonal drops.
                </p>
                <p>
                  Product pages are built to show helpful information such as images, prices,
                  descriptions, delivery details, stock status, vendor information, and available
                  purchase modes. This helps customers compare products before they bid or buy.
                </p>
              </article>

              <article>
                <h2>CopUpCoin, cart, checkout, and account tools</h2>
                <p>
                  CopUpCoin is the platform coin used across the CopUpBid experience where supported.
                  Users can manage their account, view balances, track activity, open their cart,
                  save favorite products, and return to the page they wanted after login or
                  registration. These account tools make the shopping flow easier for returning
                  customers and help new users continue from where they started.
                </p>
                <p>
                  Checkout and order tools are designed for e-commerce needs: users can review
                  selected items, confirm quantities, complete payment steps, and follow updates
                  about orders or auction wins. Support pages, privacy information, terms, and cookie
                  preferences are also available so users understand how the platform works.
                </p>
              </article>

              <article>
                <h2>Earn rewards through referrals and affiliate opportunities</h2>
                <p>
                  CopUpBid can also support referral and affiliate programs for users who want to
                  introduce others to auction shopping. When campaigns are available, users may be
                  able to invite friends, help new customers discover products, and earn rewards
                  based on the rules of each program. This creates a simple way for students,
                  creators, entrepreneurs, and community sellers to grow with the platform.
                </p>
              </article>

              <article>
                <h2>Why shoppers choose CopUpBid</h2>
                <p>
                  CopUpBid is built around convenience, product discovery, fair auction participation,
                  and a local shopping experience. Customers can browse products, join auctions,
                  learn how bidding works, view previous winners, manage their profile, and get help
                  when they need support. The goal is to make online auction shopping easier to
                  understand and more useful for Nigerian buyers.
                </p>
              </article>
            </div>

            <div className={styles.aboutStats} aria-label="CopUpBid marketplace highlights">
              <div><strong>CopUpCoin</strong><span>Platform coin for bidding and rewards</span></div>
              <div><strong>Auctions</strong><span>Live drops, product wins, and bidder history</span></div>
              <div><strong>Shopping</strong><span>Electronics, fashion, home, gifts, and gadgets</span></div>
              <div><strong>Nigeria</strong><span>Built for local shoppers, payments, and delivery</span></div>
            </div>

            <button
              type="button"
              className={styles.aboutToggle}
              onClick={() => setSeoExpanded((value) => !value)}
              aria-expanded={seoExpanded}
            >
              {seoExpanded ? "Show less" : "Show more"}
            </button>
          </section>
        </main>

        <aside className={styles.cartRail} aria-label="Shop summary">
          <div className={styles.railCard}>
            <div className={styles.railHeader}>
              <strong>My Cart</strong>
              <span>{realCartCount}</span>
            </div>

            <div className={styles.cartList}>
              {cartLoading ? (
                <div className={styles.cartEmpty}>Loading your cart...</div>
              ) : !getAuthToken() ? (
                <div className={styles.cartEmpty}>
                  Login to see your real cart items here.
                </div>
              ) : cartPreviewItems.length === 0 ? (
                <div className={styles.cartEmpty}>Your cart is empty.</div>
              ) : cartPreviewItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.cartItem}
                  onClick={() => (item.productId ? handleOpenProduct(item.productId, item) : goProtected("/cart"))}
                >
                  <img src={item.image || "/copupcoin.png"} alt="" />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.type} • {item.qty} item{item.qty === 1 ? "" : "s"} • {formatCoin(item.total)} COIN</small>
                  </span>
                </button>
              ))}
            </div>

            <div className={styles.checkoutBox}>
              <div><span>Subtotal</span><strong>{formatCoin(previewTotal)} COIN</strong></div>
              <div><span>Shipping</span><strong>Free</strong></div>
              <div className={styles.totalLine}><span>Total</span><strong>{formatCoin(previewTotal)} COIN</strong></div>
              <button type="button" onClick={() => goProtected("/cart")}>
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
        redirectTo={loginModalMeta.redirectTo}
      />
    </div>
  );
}
