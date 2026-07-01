// AdminWaitlist.jsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./AdminWaitlist.module.css";
import AdminNavbar from "../../components/admin/Navbar";
import { api } from "../../lib/api";

import {
  FaSync,
  FaSearch,
  FaFilter,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaChartBar,
  FaCrown,
  FaBan,
  FaGavel,
  FaMask,
  FaBox,
  FaTag,
  FaDollarSign,
  FaPercentage,
  FaUsers,
  FaCheck, // ✅ FIX: was missing (would crash render)
} from "react-icons/fa";

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function fmtNum(n) {
  return safeNum(n, 0).toLocaleString();
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

const DEFAULT_AUCTION_FORM = {
  name: "",
  description: "",
  entry_bid_points: 0,
  minimum_users: 2,
  category: "product",
  update_waitlist: true,
};

const DEFAULT_HEIST_FORM = {
  name: "",
  story: "",
  question: "",
  answer: "",
  min_users: 2,
  ticket_price: 0,
  prize: 0,
  category: "product",
  prize_name: "",
  update_waitlist: true,
};

export default function AdminWaitlist() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // ✅ products (fetch all, then client-side paginate/search)
  const [allProducts, setAllProducts] = useState([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(12);
  const [productsSearch, setProductsSearch] = useState("");

  // list response
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  // summary response
  const [summary, setSummary] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [productId, setProductId] = useState("");
  const [userId, setUserId] = useState("");
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");
  const [order, setOrder] = useState("newest");

  // paging for waitlist
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  // product drilldown modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [productModalLoading, setProductModalLoading] = useState(false);
  const [productModalErr, setProductModalErr] = useState("");
  const [productModalData, setProductModalData] = useState(null);

  // create modals
  const [showCreateAuction, setShowCreateAuction] = useState(false);
  const [showCreateHeist, setShowCreateHeist] = useState(false);
  const [auctionForm, setAuctionForm] = useState(DEFAULT_AUCTION_FORM);
  const [heistForm, setHeistForm] = useState(DEFAULT_HEIST_FORM);
  const [createErr, setCreateErr] = useState("");

  const selectedProduct = useMemo(() => {
    const pid = Number(productId);
    if (!pid || !Number.isFinite(pid)) return null;
    return allProducts.find((p) => Number(p.id) === pid) || null;
  }, [productId, allProducts]);

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  // ✅ derive product list (search + pagination) from allProducts
  const productsFiltered = useMemo(() => {
    const term = String(productsSearch || "").trim().toLowerCase();
    if (!term) return allProducts;

    return allProducts.filter((p) => {
      const hay = `${p.name || ""} ${p.vendor_name || ""} ${p.categories || ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [allProducts, productsSearch]);

  useEffect(() => {
    setProductsTotal(productsFiltered.length);
  }, [productsFiltered]);

  const productsTotalPages = Math.max(1, Math.ceil(productsFiltered.length / productsPerPage));
  const canPrevProducts = productsPage > 1;
  const canNextProducts = productsPage < productsTotalPages;

  const products = useMemo(() => {
    const start = (productsPage - 1) * productsPerPage;
    const end = start + productsPerPage;
    return productsFiltered.slice(start, end);
  }, [productsFiltered, productsPage, productsPerPage]);

  // keep page valid when filters change
  useEffect(() => {
    if (productsPage > productsTotalPages) setProductsPage(1);
  }, [productsPage, productsTotalPages]);

  const buildParams = useCallback(
    (overrides = {}) => {
      return {
        limit,
        offset,
        order,
        ...(productId ? { productId } : {}),
        ...(userId ? { userId } : {}),
        ...(mode ? { mode } : {}),
        ...(status ? { status } : {}),
        ...overrides,
      };
    },
    [limit, offset, order, productId, userId, mode, status]
  );

  /**
   * ✅ FIX: your backend snippet is GET "/products" returning an ARRAY of rows (not {items,total})
   * but you were calling "/admin/products" and expecting {items,total}.
   *
   * This loader:
   * - tries /admin/products (in case your server uses that)
   * - falls back to /products
   * - supports BOTH response shapes (array OR {items,total})
   */
  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      let res;

      // Try common admin route first
      try {
        res = await api.get("/admin/products");
      } catch (e1) {
        // fallback to the route you pasted: GET /products
        res = await api.get("/products");
      }

      const data = res?.data;

      // Shape A: { items: [], total: n }
      const itemsA = Array.isArray(data?.items) ? data.items : null;

      // Shape B: [ ...rows ]
      const itemsB = Array.isArray(data) ? data : null;

      const finalProducts = itemsA || itemsB || [];

      setAllProducts(finalProducts);
      setProductsTotal(safeNum(data?.total, finalProducts.length));
    } catch (e) {
      console.error("loadProducts error:", e);
      setAllProducts([]);
      setProductsTotal(0);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadWaitlist = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/admin/waitlist", { params: buildParams() });
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
      setTotal(safeNum(res.data?.total, 0));
    } catch (e) {
      console.error("loadWaitlist error:", e);
      setErr(e?.response?.data?.message || e?.message || "Failed to load waitlist");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get("/admin/waitlist/summary", {
        params: {
          ...(mode ? { mode } : {}),
          ...(status ? { status } : {}),
        },
      });
      setSummary(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("loadSummary error:", e);
    } finally {
      setSummaryLoading(false);
    }
  }, [mode, status]);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    setOffset(0);
  }, [productId, userId, mode, status, order, limit]);

  useEffect(() => {
    loadWaitlist();
    loadSummary();
  }, [loadWaitlist, loadSummary]);

  const filteredItems = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((r) => {
      const hay = `${r.user_name || ""} ${r.user_username || ""} ${r.product_name || ""} ${r.mode || ""} ${r.status || ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [items, q]);

  const resetFilters = () => {
    setQ("");
    setProductId("");
    setUserId("");
    setMode("");
    setStatus("");
    setOrder("newest");
    setLimit(50);
    setOffset(0);
  };

  // actions
  const openProductWaitlist = async (pid) => {
    setShowProductModal(true);
    setProductModalLoading(true);
    setProductModalErr("");
    setProductModalData(null);
    try {
      const res = await api.get(`/admin/products/${pid}/waitlist`, {
        params: {
          ...(mode ? { mode } : {}),
          ...(status ? { status } : {}),
          limit: 50,
          offset: 0,
        },
      });
      setProductModalData(res.data);
    } catch (e) {
      console.error("openProductWaitlist error:", e);
      setProductModalErr(e?.response?.data?.message || "Failed to load product waitlist");
    } finally {
      setProductModalLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadWaitlist(), loadSummary(), loadProducts()]);
  };

  const cancelWaitlist = async () => {
    const pid = Number(productId);
    const m = String(mode || "").toLowerCase();

    if (!pid || !Number.isFinite(pid)) return setErr("Select a Product first to cancel its waitlist.");
    if (!["auction", "heist"].includes(m)) return setErr("Select mode (auction/heist) before cancelling waitlist.");

    if (!window.confirm(`Cancel waitlist for product #${pid} (${m}) and refund bid_points?`)) return;

    setBusy(true);
    setErr("");
    try {
      await api.post("/admin/waitlist/cancel", { product_id: pid, mode: m });
      await refreshAll();
      if (showProductModal && productModalData?.product?.id === pid) {
        await openProductWaitlist(pid);
      }
    } catch (e) {
      console.error("cancelWaitlist error:", e);
      setErr(e?.response?.data?.message || "Failed to cancel waitlist");
    } finally {
      setBusy(false);
    }
  };

  const openAuctionCreateModal = () => {
    setCreateErr("");
    if (!selectedProduct) return setErr("Select a Product first (then create auction).");
    setAuctionForm({
      ...DEFAULT_AUCTION_FORM,
      name: `Auction for ${selectedProduct.name}`,
    });
    setShowCreateAuction(true);
  };

  const openHeistCreateModal = () => {
    setCreateErr("");
    if (!selectedProduct) return setErr("Select a Product first (then create heist).");
    setHeistForm({
      ...DEFAULT_HEIST_FORM,
      name: `Heist for ${selectedProduct.name}`,
    });
    setShowCreateHeist(true);
  };

  const validateAuctionForm = () => {
    const pid = Number(productId);
    if (!pid) return "Select a product.";
    if (!auctionForm.name.trim()) return "Auction name is required.";
    const entry = Number(auctionForm.entry_bid_points);
    const minUsers = Number(auctionForm.minimum_users);
    if (!Number.isInteger(entry) || entry < 0) return "Entry bid points must be an integer >= 0.";
    if (!Number.isInteger(minUsers) || minUsers < 1) return "Minimum users must be an integer >= 1.";
    if (!["cash", "product", "coupon"].includes(String(auctionForm.category).toLowerCase()))
      return "Category must be cash, product, or coupon.";
    return "";
  };

  const validateHeistForm = () => {
    const pid = Number(productId);
    if (!pid) return "Select a product.";
    if (!heistForm.name.trim()) return "Heist name is required.";
    const minUsers = Number(heistForm.min_users);
    const ticket = Number(heistForm.ticket_price);
    const prize = Number(heistForm.prize);
    if (!Number.isInteger(minUsers) || minUsers < 1) return "Min users must be an integer >= 1.";
    if (!Number.isInteger(ticket) || ticket < 0) return "Ticket price must be an integer >= 0.";
    if (!Number.isInteger(prize) || prize < 0) return "Prize must be an integer >= 0.";
    if (!["cash", "product"].includes(String(heistForm.category).toLowerCase()))
      return "Category must be cash or product.";
    return "";
  };

  const submitCreateAuction = async () => {
    const msg = validateAuctionForm();
    if (msg) return setCreateErr(msg);

    setBusy(true);
    setCreateErr("");
    try {
      await api.post("/admin/auctions/from-waitlist", {
        product_id: Number(productId),
        name: auctionForm.name.trim(),
        description: auctionForm.description || "",
        entry_bid_points: Number(auctionForm.entry_bid_points),
        minimum_users: Number(auctionForm.minimum_users),
        category: String(auctionForm.category).toLowerCase(),
        update_waitlist: !!auctionForm.update_waitlist,
      });

      setShowCreateAuction(false);
      await refreshAll();
      alert("✅ Auction created from waitlist.");
    } catch (e) {
      console.error("submitCreateAuction error:", e);
      setCreateErr(e?.response?.data?.message || "Failed to create auction from waitlist");
    } finally {
      setBusy(false);
    }
  };

  const submitCreateHeist = async () => {
    const msg = validateHeistForm();
    if (msg) return setCreateErr(msg);

    setBusy(true);
    setCreateErr("");
    try {
      await api.post("/admin/heists/from-waitlist", {
        product_id: Number(productId),
        name: heistForm.name.trim(),
        story: heistForm.story || "",
        question: heistForm.question || "",
        answer: heistForm.answer || "",
        min_users: Number(heistForm.min_users),
        ticket_price: Number(heistForm.ticket_price),
        prize: Number(heistForm.prize),
        category: String(heistForm.category).toLowerCase(),
        prize_name: heistForm.prize_name || "",
        update_waitlist: !!heistForm.update_waitlist,
      });

      setShowCreateHeist(false);
      await refreshAll();
      alert("✅ Heist created from waitlist.");
    } catch (e) {
      console.error("submitCreateHeist error:", e);
      setCreateErr(e?.response?.data?.message || "Failed to create heist from waitlist");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />
      <AdminNavbar />

      <main className={styles.container}>
        <header className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <div className={styles.titleRow}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => window.history.back()}
                title="Back"
              >
                <FaChevronLeft /> Back
              </button>

              <h1 className={styles.title}>Waitlist</h1>
            </div>

            <p className={styles.subtitle}>
              Filter entries, review summary, open product breakdown, cancel/refund, or create an Auction/Heist from queued users.
            </p>

            <div className={styles.contextBar}>
              <div className={styles.contextItem}>
                <span className={styles.contextLabel}>Selected Product:</span>{" "}
                <span className={styles.contextValue}>
                  {selectedProduct ? (
                    <>
                      <FaBox style={{ marginRight: 6 }} />
                      {selectedProduct.name} (#{selectedProduct.id})
                    </>
                  ) : (
                    "All Products"
                  )}
                </span>
              </div>
              <div className={styles.contextItem}>
                <span className={styles.contextLabel}>Mode:</span>{" "}
                <span className={styles.contextValue}>{mode || "All"}</span>
              </div>
              <div className={styles.contextItem}>
                <span className={styles.contextLabel}>Status:</span>{" "}
                <span className={styles.contextValue}>{status || "All"}</span>
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button className={styles.softBtn} type="button" onClick={refreshAll} disabled={loading || busy}>
              <FaSync /> Refresh
            </button>

            <button className={styles.dangerBtn} type="button" onClick={cancelWaitlist} disabled={busy}>
              <FaBan /> Cancel + Refund
            </button>

            <button className={styles.primaryBtn} type="button" onClick={openAuctionCreateModal} disabled={busy}>
              <FaGavel /> Create Auction
            </button>

            <button className={styles.primaryBtn} type="button" onClick={openHeistCreateModal} disabled={busy}>
              <FaMask /> Create Heist
            </button>
          </div>
        </header>

        {err ? <div className={styles.alert}>{err}</div> : null}

        {/* SUMMARY */}
        <section className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryTitle}>
              <FaChartBar /> Summary (By Product + Mode)
            </div>
            <div className={styles.summarySub}>
              {summaryLoading ? "Loading summary..." : "Quick snapshot of waitlist volume and locked points."}
            </div>

            <div className={styles.summaryTableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Mode</th>
                    <th>Entries</th>
                    <th>Locked</th>
                    <th>Queued</th>
                    <th>Won</th>
                    <th>Fulfilled</th>
                    <th>Cancelled</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryLoading ? (
                    <tr>
                      <td colSpan={8} className={styles.muted}>
                        Loading…
                      </td>
                    </tr>
                  ) : summary.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={styles.muted}>
                        No summary data
                      </td>
                    </tr>
                  ) : (
                    summary.slice(0, 12).map((r, idx) => (
                      <tr key={idx}>
                        <td title={r.product_name}>{r.product_name}</td>
                        <td>
                          <span className={`${styles.pill} ${r.mode === "auction" ? styles.pillBlue : styles.pillPurple}`}>
                            {r.mode}
                          </span>
                        </td>
                        <td>{fmtNum(r.entries)}</td>
                        <td>{fmtNum(r.total_locked)}</td>
                        <td>{fmtNum(r.queued)}</td>
                        <td>{fmtNum(r.won)}</td>
                        <td>{fmtNum(r.fulfilled)}</td>
                        <td>{fmtNum(r.cancelled)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {summary.length > 12 ? (
                <div className={styles.mutedSmall}>Showing 12 of {summary.length} rows.</div>
              ) : null}
            </div>
          </div>
        </section>

        {/* PRODUCT CARDS SECTION */}
        <section className={styles.productsSection}>
          <div className={styles.productsHeader}>
            <div className={styles.productsTitle}>
              <FaBox /> Products
              <span className={styles.productsCount}>
                {productsTotal > 0 ? `${products.length} / ${productsTotal}` : ""}
              </span>
            </div>

            <div className={styles.productsControls}>
              <div className={styles.productsSearch}>
                <FaSearch className={styles.searchIconSmall} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productsSearch}
                  onChange={(e) => {
                    setProductsSearch(e.target.value);
                    setProductsPage(1);
                  }}
                  className={styles.productsSearchInput}
                />
              </div>

              <select
                className={styles.productsPerPage}
                value={productsPerPage}
                onChange={(e) => {
                  setProductsPerPage(Number(e.target.value));
                  setProductsPage(1);
                }}
              >
                <option value="8">8 per page</option>
                <option value="12">12 per page</option>
                <option value="16">16 per page</option>
                <option value="24">24 per page</option>
              </select>
            </div>
          </div>

          {productsLoading ? (
            <div className={styles.productsLoading}>
              <div className={styles.loadingSpinner} />
              <span>Loading products...</span>
            </div>
          ) : products.length === 0 ? (
            <div className={styles.productsEmpty}>
              <FaBox size={48} opacity={0.3} />
              <p>No products found</p>
            </div>
          ) : (
            <>
              <div className={styles.productsGrid}>
                {products.map((product) => (
                  <button
                    key={product.id}
                    className={`${styles.productCard} ${
                      String(productId) === String(product.id) ? styles.productCardActive : ""
                    }`}
                    onClick={() => setProductId(String(product.id))}
                  >
                    <div className={styles.productCardHeader}>
                      <div className={styles.productCardTitle}>
                        <FaBox className={styles.productCardIcon} />
                        <span className={styles.productCardName}>{product.name}</span>
                      </div>
                      <span className={styles.productCardId}>#{product.id}</span>
                    </div>

                    <div className={styles.productCardDetails}>
                      {/* ✅ backend provides `categories` (comma string) */}
                      {product.categories ? (
                        <div className={styles.productCardDetail} title={product.categories}>
                          <FaTag className={styles.detailIcon} />
                          <span>{product.categories}</span>
                        </div>
                      ) : null}

                      {/* ✅ backend provides cash_price/auction_price/heist_price */}
                      {product.cash_price != null ? (
                        <div className={styles.productCardDetail}>
                          <FaDollarSign className={styles.detailIcon} />
                          <span>Cash: {fmtNum(product.cash_price)}</span>
                        </div>
                      ) : null}

                      {product.auction_price != null ? (
                        <div className={styles.productCardDetail}>
                          <FaPercentage className={styles.detailIcon} />
                          <span>Auction: {fmtNum(product.auction_price)}</span>
                        </div>
                      ) : null}

                      {product.gallery_count != null ? (
                        <div className={styles.productCardDetail}>
                          <FaUsers className={styles.detailIcon} />
                          <span>{fmtNum(product.gallery_count)} images</span>
                        </div>
                      ) : null}
                    </div>

                    {String(productId) === String(product.id) && (
                      <div className={styles.productCardSelected}>
                        <FaCheck /> Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Product Pagination */}
              {productsTotalPages > 1 && (
                <div className={styles.productsPagination}>
                  <button
                    className={styles.paginationBtn}
                    onClick={() => setProductsPage((p) => Math.max(1, p - 1))}
                    disabled={!canPrevProducts}
                  >
                    <FaChevronLeft />
                  </button>

                  <span className={styles.paginationInfo}>
                    Page {productsPage} of {productsTotalPages}
                  </span>

                  <button
                    className={styles.paginationBtn}
                    onClick={() => setProductsPage((p) => Math.min(productsTotalPages, p + 1))}
                    disabled={!canNextProducts}
                  >
                    <FaChevronRight />
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* FILTERS */}
        <section className={styles.toolsRow}>
          <div className={styles.searchWrap}>
            <FaSearch className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search in loaded rows (user/product/mode/status)…"
            />
          </div>

          <div className={styles.filterWrap}>
            <FaFilter className={styles.filterIcon} />
            <input
              className={styles.input}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Filter by userId"
            />
          </div>

          <div className={styles.filterWrap}>
            <FaFilter className={styles.filterIcon} />
            <select className={styles.select} value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="">All Modes</option>
              <option value="auction">Auction</option>
              <option value="heist">Heist</option>
            </select>
          </div>

          <div className={styles.filterWrap}>
            <FaFilter className={styles.filterIcon} />
            <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="queued">Queued</option>
              <option value="won">Won</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className={styles.filterWrap}>
            <FaFilter className={styles.filterIcon} />
            <select className={styles.select} value={order} onChange={(e) => setOrder(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          <div className={styles.filterWrap}>
            <FaFilter className={styles.filterIcon} />
            <select className={styles.select} value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>

          <button className={styles.softBtn} type="button" onClick={resetFilters} disabled={busy}>
            <FaTimes /> Reset
          </button>

          <button
            className={styles.softBtn}
            type="button"
            onClick={() => {
              const pid = Number(productId);
              if (!pid) return setErr("Select a product to view its waitlist details.");
              openProductWaitlist(pid);
            }}
            disabled={busy}
            title="Open detailed waitlist view for selected product"
          >
            <FaCrown /> Product View
          </button>
        </section>

        {/* LIST */}
        <section className={styles.listCard}>
          <div className={styles.listHeader}>
            <div className={styles.listTitle}>
              <FaCrown /> Entries
              <span className={styles.listCount}>
                {loading ? "…" : `${fmtNum(filteredItems.length)} / ${fmtNum(total)}`}
              </span>
            </div>

            <div className={styles.pager}>
              <button
                className={styles.pagerBtn}
                type="button"
                disabled={!canPrev || loading || busy}
                onClick={() => setOffset((v) => Math.max(0, v - limit))}
              >
                <FaChevronLeft />
              </button>
              <div className={styles.pagerInfo}>
                Page {fmtNum(Math.floor(offset / limit) + 1)} / {fmtNum(Math.max(1, Math.ceil(total / limit)))}
              </div>
              <button
                className={styles.pagerBtn}
                type="button"
                disabled={!canNext || loading || busy}
                onClick={() => setOffset((v) => v + limit)}
              >
                <FaChevronRight />
              </button>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Mode</th>
                  <th>Locked</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className={styles.muted}>
                      Loading…
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={styles.muted}>
                      No waitlist entries found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((r) => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.userName}>{r.user_name || "—"}</div>
                          <div className={styles.userMeta}>@{r.user_username || "—"} • ID: {r.user_id}</div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.productCell}>
                          <div className={styles.productName}>{r.product_name}</div>
                          <div className={styles.userMeta}>ID: {r.product_id}</div>
                        </div>
                      </td>
                      <td>{fmtNum(r.qty)}</td>
                      <td>
                        <span className={`${styles.pill} ${r.mode === "auction" ? styles.pillBlue : styles.pillPurple}`}>
                          {r.mode}
                        </span>
                      </td>
                      <td>{fmtNum(r.bid_locked)}</td>
                      <td>
                        <span className={`${styles.pill} ${styles.pillGray}`}>{r.status}</span>
                      </td>
                      <td>{fmtDate(r.created_at)}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.softBtnSmall}
                          onClick={() => openProductWaitlist(r.product_id)}
                          disabled={busy}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.footerHint}>
            Tip: Pick a product + mode, then use <b>Cancel + Refund</b> or <b>Create Auction/Heist</b>.
          </div>
        </section>
      </main>

      {/* PRODUCT MODAL */}
      {showProductModal ? (
        <div className={styles.modalOverlay} onMouseDown={() => setShowProductModal(false)}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>Product Waitlist</div>
                <div className={styles.modalSub}>
                  {productModalData?.product
                    ? `${productModalData.product.name} (#${productModalData.product.id})`
                    : "Loading…"}
                </div>
              </div>
              <button className={styles.iconBtn} type="button" onClick={() => setShowProductModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className={styles.modalBody}>
              {productModalLoading ? (
                <div className={styles.muted}>Loading…</div>
              ) : productModalErr ? (
                <div className={styles.alert}>{productModalErr}</div>
              ) : !productModalData ? null : (
                <>
                  <div className={styles.modalStats}>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>Overall Entries</div>
                      <div className={styles.statValue}>{fmtNum(productModalData.summary?.overall?.entries)}</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>Overall Users</div>
                      <div className={styles.statValue}>{fmtNum(productModalData.summary?.overall?.users)}</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>Total Locked</div>
                      <div className={styles.statValue}>{fmtNum(productModalData.summary?.overall?.total_locked)}</div>
                    </div>
                  </div>

                  <div className={styles.modalActions}>
                    <button
                      className={styles.softBtn}
                      type="button"
                      onClick={() => openProductWaitlist(productModalData.product.id)}
                      disabled={busy}
                    >
                      <FaSync /> Refresh
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* CREATE AUCTION MODAL */}
      {showCreateAuction ? (
        <div className={styles.modalOverlay} onMouseDown={() => setShowCreateAuction(false)}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>
                  <FaGavel /> Create Auction from Waitlist
                </div>
                <div className={styles.modalSub}>
                  Product: <b>{selectedProduct?.name}</b> (#{selectedProduct?.id})
                </div>
              </div>
              <button className={styles.iconBtn} type="button" onClick={() => setShowCreateAuction(false)}>
                <FaTimes />
              </button>
            </div>

            <div className={styles.modalBody}>
              {createErr ? <div className={styles.alert}>{createErr}</div> : null}

              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Auction Name *</label>
                  <input
                    className={styles.textField}
                    value={auctionForm.name}
                    onChange={(e) => setAuctionForm((s) => ({ ...s, name: e.target.value }))}
                    placeholder="e.g. Friday Mega Auction"
                  />
                  <div className={styles.helpText}>This is what users/admins will see.</div>
                </div>

                <div className={styles.formField}>
                  <label>Category *</label>
                  <select
                    className={styles.textField}
                    value={auctionForm.category}
                    onChange={(e) => setAuctionForm((s) => ({ ...s, category: e.target.value }))}
                  >
                    <option value="cash">cash</option>
                    <option value="product">product</option>
                    <option value="coupon">coupon</option>
                  </select>
                  <div className={styles.helpText}>Must be cash, product, or coupon.</div>
                </div>

                <div className={styles.formField}>
                  <label>Entry Bid Points *</label>
                  <input
                    className={styles.textField}
                    type="number"
                    min="0"
                    step="1"
                    value={auctionForm.entry_bid_points}
                    onChange={(e) =>
                      setAuctionForm((s) => ({ ...s, entry_bid_points: Number(e.target.value) }))
                    }
                  />
                  <div className={styles.helpText}>Non-negative integer.</div>
                </div>

                <div className={styles.formField}>
                  <label>Minimum Users *</label>
                  <input
                    className={styles.textField}
                    type="number"
                    min="1"
                    step="1"
                    value={auctionForm.minimum_users}
                    onChange={(e) =>
                      setAuctionForm((s) => ({ ...s, minimum_users: Number(e.target.value) }))
                    }
                  />
                  <div className={styles.helpText}>Minimum participants required.</div>
                </div>

                <div className={styles.formFieldFull}>
                  <label>Description (optional)</label>
                  <textarea
                    className={styles.textArea}
                    rows={3}
                    value={auctionForm.description}
                    onChange={(e) => setAuctionForm((s) => ({ ...s, description: e.target.value }))}
                    placeholder="Short admin note / description"
                  />
                </div>

                <div className={styles.formCheck}>
                  <input
                    id="auction_update_waitlist"
                    type="checkbox"
                    checked={!!auctionForm.update_waitlist}
                    onChange={(e) => setAuctionForm((s) => ({ ...s, update_waitlist: e.target.checked }))}
                  />
                  <label htmlFor="auction_update_waitlist">
                    Mark queued waitlist entries as <b>in_progress</b> after seeding participants
                  </label>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button className={styles.softBtn} type="button" onClick={() => setShowCreateAuction(false)} disabled={busy}>
                  Cancel
                </button>
                <button className={styles.primaryBtn} type="button" onClick={submitCreateAuction} disabled={busy}>
                  <FaGavel /> Create Auction
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* CREATE HEIST MODAL */}
      {showCreateHeist ? (
        <div className={styles.modalOverlay} onMouseDown={() => setShowCreateHeist(false)}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>
                  <FaMask /> Create Heist from Waitlist
                </div>
                <div className={styles.modalSub}>
                  Product: <b>{selectedProduct?.name}</b> (#{selectedProduct?.id})
                </div>
              </div>
              <button className={styles.iconBtn} type="button" onClick={() => setShowCreateHeist(false)}>
                <FaTimes />
              </button>
            </div>

            <div className={styles.modalBody}>
              {createErr ? <div className={styles.alert}>{createErr}</div> : null}

              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Heist Name *</label>
                  <input
                    className={styles.textField}
                    value={heistForm.name}
                    onChange={(e) => setHeistForm((s) => ({ ...s, name: e.target.value }))}
                    placeholder="e.g. Midnight Vault Heist"
                  />
                </div>

                <div className={styles.formField}>
                  <label>Category *</label>
                  <select
                    className={styles.textField}
                    value={heistForm.category}
                    onChange={(e) => setHeistForm((s) => ({ ...s, category: e.target.value }))}
                  >
                    <option value="cash">cash</option>
                    <option value="product">product</option>
                  </select>
                </div>

                <div className={styles.formField}>
                  <label>Min Users *</label>
                  <input
                    className={styles.textField}
                    type="number"
                    min="1"
                    step="1"
                    value={heistForm.min_users}
                    onChange={(e) => setHeistForm((s) => ({ ...s, min_users: Number(e.target.value) }))}
                  />
                </div>

                <div className={styles.formField}>
                  <label>Ticket Price *</label>
                  <input
                    className={styles.textField}
                    type="number"
                    min="0"
                    step="1"
                    value={heistForm.ticket_price}
                    onChange={(e) => setHeistForm((s) => ({ ...s, ticket_price: Number(e.target.value) }))}
                  />
                </div>

                <div className={styles.formField}>
                  <label>Prize Value *</label>
                  <input
                    className={styles.textField}
                    type="number"
                    min="0"
                    step="1"
                    value={heistForm.prize}
                    onChange={(e) => setHeistForm((s) => ({ ...s, prize: Number(e.target.value) }))}
                  />
                </div>

                <div className={styles.formField}>
                  <label>Prize Name (optional)</label>
                  <input
                    className={styles.textField}
                    value={heistForm.prize_name}
                    onChange={(e) => setHeistForm((s) => ({ ...s, prize_name: e.target.value }))}
                    placeholder="e.g. iPhone 15 Pro"
                  />
                </div>

                <div className={styles.formFieldFull}>
                  <label>Story (optional)</label>
                  <textarea
                    className={styles.textArea}
                    rows={3}
                    value={heistForm.story}
                    onChange={(e) => setHeistForm((s) => ({ ...s, story: e.target.value }))}
                    placeholder="Short storyline..."
                  />
                </div>

                <div className={styles.formFieldFull}>
                  <label>Question (optional)</label>
                  <input
                    className={styles.textField}
                    value={heistForm.question}
                    onChange={(e) => setHeistForm((s) => ({ ...s, question: e.target.value }))}
                    placeholder="Heist question..."
                  />
                </div>

                <div className={styles.formFieldFull}>
                  <label>Answer (optional)</label>
                  <input
                    className={styles.textField}
                    value={heistForm.answer}
                    onChange={(e) => setHeistForm((s) => ({ ...s, answer: e.target.value }))}
                    placeholder="Heist answer..."
                  />
                </div>

                <div className={styles.formCheck}>
                  <input
                    id="heist_update_waitlist"
                    type="checkbox"
                    checked={!!heistForm.update_waitlist}
                    onChange={(e) => setHeistForm((s) => ({ ...s, update_waitlist: e.target.checked }))}
                  />
                  <label htmlFor="heist_update_waitlist">
                    Mark queued waitlist entries as <b>in_progress</b> after seeding participants
                  </label>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button className={styles.softBtn} type="button" onClick={() => setShowCreateHeist(false)} disabled={busy}>
                  Cancel
                </button>
                <button className={styles.primaryBtn} type="button" onClick={submitCreateHeist} disabled={busy}>
                  <FaMask /> Create Heist
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}