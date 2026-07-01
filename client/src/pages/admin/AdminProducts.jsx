// ✅ FULL UPDATED FILE: AdminProducts.jsx
// ✅ Featured ones will still show ⭐ because your card uses p.is_featured
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import styles from "./AdminProducts.module.css";
import AdminNavbar from "../../components/admin/Navbar";
import { api } from "../../lib/api";

import {
  FaPlus,
  FaSearch,
  FaTrash,
  FaEdit,
  FaStar,
  FaRegStar,
  FaSync,
  FaUpload,
  FaTimes,
  FaSave,
  FaTag,
  FaBoxes,
  FaFilter,
} from "react-icons/fa";

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function fmtNum(n) {
  const x = safeNum(n, 0);
  return x.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtFiat(value, currency = "USD") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

// coins -> currency using coin rate
function coinsToFiat(coins, rate) {
  const unit = Number(rate?.unit || 0);
  const price = Number(rate?.price || 0);
  if (!unit || !price) return null;
  return (Number(coins || 0) * price) / unit;
}

export default function AdminProducts() {
  // data
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  // ✅ NEW: show only featured products (uses /admin/featured/products)
  const [featuredOnly, setFeaturedOnly] = useState(false);

  // coin rate
  const [coinRate, setCoinRate] = useState({
    unit: 0,
    price: 0,
    currency: "USD",
    updated_at: null,
  });
  const [rateLoading, setRateLoading] = useState(false);

  const loadCoinRate = useCallback(async () => {
    setRateLoading(true);
    try {
      const res = await api.get("/admin/coin-rate");
      setCoinRate({
        unit: safeNum(res.data?.unit, 0),
        price: safeNum(res.data?.price, 0),
        currency: res.data?.currency || "USD",
        updated_at: res.data?.updated_at || null,
      });
    } catch (e) {
      console.error("loadCoinRate error:", e);
    } finally {
      setRateLoading(false);
    }
  }, []);

  // filters
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  // category form
  const [catName, setCatName] = useState("");
  const [catEditId, setCatEditId] = useState(null);

  // product form (create/edit)
  const [mode, setMode] = useState("create"); // create | edit
  const [editingId, setEditingId] = useState(null);

  const [pName, setPName] = useState("");
  const [pShort, setPShort] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pVendor, setPVendor] = useState("CopUp");
  const [pStock, setPStock] = useState("in_stock");
  const [pShipCost, setPShipCost] = useState("0");
  const [pEta, setPEta] = useState("");

  // prices are COINS
  const [pCash, setPCash] = useState("0");
  const [pAuction, setPAuction] = useState("0");

  const [pCats, setPCats] = useState([]); // array of category IDs (numbers)
  const [galleryMode, setGalleryMode] = useState("append"); // append | replace

  const primaryRef = useRef(null);
  const galleryRef = useRef(null);

  const [primaryFile, setPrimaryFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);

  // editing preview
  const [selected, setSelected] = useState(null); // full product details (GET /admin/products/:id)

  // ⭐ prevent double-click spam per product id
  const featuredBusyRef = useRef(new Set());

  const filteredProducts = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;

    return products.filter((p) => {
      const hay = `${p.name || ""} ${p.vendor_name || ""} ${p.categories || ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [products, q]);

  // ✅ load products from correct endpoint (all vs featured only)
  const loadAll = useCallback(async () => {
    setLoading(true);
    setErr("");

    try {
      const [catsRes, prodRes] = await Promise.all([
        api.get("/admin/categories"),
        api.get(featuredOnly ? "/admin/featured/products" : "/admin/products", {
          params: categoryId ? { categoryId } : {},
        }),
      ]);

      setCategories(Array.isArray(catsRes.data) ? catsRes.data : []);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
    } catch (e) {
      console.error("AdminProducts loadAll error:", e);
      setErr(e?.response?.data?.message || e?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [categoryId, featuredOnly]);

  useEffect(() => {
    loadAll();
    loadCoinRate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAll, loadCoinRate]);

  // ───────────────────────── Category helpers ─────────────────────────
  const openCategoryManager = () => {
    setCatName("");
    setCatEditId(null);
    setShowCategoryModal(true);
  };

  const submitCategory = async () => {
    const name = String(catName || "").trim();
    if (!name) return setErr("Category name is required");

    setBusy(true);
    setErr("");

    try {
      if (catEditId) {
        await api.put(`/admin/categories/${catEditId}`, { name });
      } else {
        await api.post("/admin/categories", { name });
      }
      await loadAll();
      setCatName("");
      setCatEditId(null);
    } catch (e) {
      console.error("Category submit error:", e);
      setErr(e?.response?.data?.message || "Failed to save category");
    } finally {
      setBusy(false);
    }
  };

  const editCategory = (c) => {
    setCatEditId(c.id);
    setCatName(c.name || "");
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Delete this category?")) return;

    setBusy(true);
    setErr("");
    try {
      await api.delete(`/admin/categories/${id}`);
      if (String(categoryId) === String(id)) setCategoryId("");
      await loadAll();
    } catch (e) {
      console.error("Delete category error:", e);
      setErr(e?.response?.data?.message || "Failed to delete category");
    } finally {
      setBusy(false);
    }
  };

  // ───────────────────────── Product helpers ─────────────────────────
  const resetProductForm = () => {
    setMode("create");
    setEditingId(null);
    setSelected(null);

    setPName("");
    setPShort("");
    setPDesc("");
    setPVendor("CopUp");
    setPStock("in_stock");
    setPShipCost("0");
    setPEta("");

    setPCash("0");
    setPAuction("0");

    setPCats([]);
    setGalleryMode("append");

    setPrimaryFile(null);
    setGalleryFiles([]);
    if (primaryRef.current) primaryRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  };

  const openCreateProduct = () => {
    resetProductForm();
    setShowProductModal(true);
  };

  const openEditProduct = async (productId) => {
    resetProductForm();
    setMode("edit");
    setEditingId(productId);
    setShowProductModal(true);

    setBusy(true);
    setErr("");
    try {
      const res = await api.get(`/admin/products/${productId}`);
      const p = res.data;

      setSelected(p);

      setPName(p.name || "");
      setPShort(p.short_description || "");
      setPDesc(p.description || "");
      setPVendor(p.vendor_name || "CopUp");
      setPStock(p.stock_status || "in_stock");
      setPShipCost(String(p.shipping_cost ?? "0"));
      setPEta(p.delivery_eta || "");

      // still COINS
      setPCash(String(p.cash_price ?? "0"));
      setPAuction(String(p.auction_price ?? "0"));

      const catIds = Array.isArray(p.categories) ? p.categories.map((c) => Number(c.id)) : [];
      setPCats(catIds);
    } catch (e) {
      console.error("Open edit product error:", e);
      setErr(e?.response?.data?.message || "Failed to load product");
    } finally {
      setBusy(false);
    }
  };

  const toggleCat = (id) => {
    const cid = Number(id);
    setPCats((prev) => {
      if (prev.includes(cid)) return prev.filter((x) => x !== cid);
      return [...prev, cid];
    });
  };

  const submitProduct = async () => {
    const name = String(pName || "").trim();
    if (!name) return setErr("Product name is required");

    setBusy(true);
    setErr("");

    try {
      const fd = new FormData();
      fd.append("name", name);

      fd.append("short_description", String(pShort || "").trim());
      fd.append("description", String(pDesc || "").trim());
      fd.append("vendor_name", String(pVendor || "CopUp").trim() || "CopUp");
      fd.append("stock_status", String(pStock || "in_stock"));
      fd.append("shipping_cost", String(pShipCost || "0"));
      fd.append("delivery_eta", String(pEta || "").trim());

      // COINS (not fiat)
      fd.append("cash_price", String(pCash || "0"));
      fd.append("auction_price", String(pAuction || "0"));

      if (pCats.length) fd.append("categoryIds", pCats.join(","));
      fd.append("gallery_mode", String(galleryMode || "append"));

      if (primaryFile) fd.append("image", primaryFile);
      if (galleryFiles.length) galleryFiles.forEach((f) => fd.append("gallery", f));

      if (mode === "create") {
        await api.post("/admin/products", fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await api.put(`/admin/products/${editingId}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }

      await loadAll();
      setShowProductModal(false);
      resetProductForm();
    } catch (e) {
      console.error("Submit product error:", e);
      setErr(e?.response?.data?.message || "Failed to save product");
    } finally {
      setBusy(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;

    setBusy(true);
    setErr("");
    try {
      await api.delete(`/admin/products/${id}`);
      await loadAll();
    } catch (e) {
      console.error("Delete product error:", e);
      setErr(e?.response?.data?.message || "Failed to delete product");
    } finally {
      setBusy(false);
    }
  };

  // ✅ FIX: stop click from causing “refresh”, optimistic update, then re-sync.
  const toggleFeatured = async (e, id, currentFeatured) => {
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();

    const key = String(id);
    if (featuredBusyRef.current.has(key)) return;
    featuredBusyRef.current.add(key);

    setErr("");

    const nextVal = currentFeatured ? 0 : 1;

    // optimistic update
    setProducts((prev) =>
      prev.map((p) => (String(p.id) === String(id) ? { ...p, is_featured: nextVal } : p))
    );
    setSelected((prev) => {
      if (!prev) return prev;
      if (String(prev.id) !== String(id)) return prev;
      return { ...prev, is_featured: nextVal };
    });

    try {
      const resp = await api.patch(`/admin/products/${id}/featured`, { is_featured: nextVal });

      // if backend returns the saved value, use it (safe)
      const saved =
        typeof resp?.data?.is_featured !== "undefined"
          ? Number(resp.data.is_featured)
          : nextVal;

      setProducts((prev) =>
        prev.map((p) => (String(p.id) === String(id) ? { ...p, is_featured: saved } : p))
      );
      setSelected((prev) => {
        if (!prev) return prev;
        if (String(prev.id) !== String(id)) return prev;
        return { ...prev, is_featured: saved };
      });

      // ✅ re-sync list from DB so refresh never “lies”
      await loadAll();
    } catch (err) {
      console.error("Toggle featured error:", err);

      // revert
      const revertVal = currentFeatured ? 1 : 0;
      setProducts((prev) =>
        prev.map((p) => (String(p.id) === String(id) ? { ...p, is_featured: revertVal } : p))
      );
      setSelected((prev) => {
        if (!prev) return prev;
        if (String(prev.id) !== String(id)) return prev;
        return { ...prev, is_featured: revertVal };
      });

      setErr(err?.response?.data?.message || "Failed to update featured flag");
    } finally {
      featuredBusyRef.current.delete(key);
    }
  };

  // computed conversion helpers for modal
  const cashFiat = useMemo(() => coinsToFiat(pCash, coinRate), [pCash, coinRate]);
  const auctionFiat = useMemo(() => coinsToFiat(pAuction, coinRate), [pAuction, coinRate]);

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />
      <AdminNavbar />

      <main className={styles.container}>
        <header className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Products</h1>
            <p className={styles.subtitle}>Manage products, categories, galleries, and featured listing.</p>

            {/* ✅ Coin Rate Strip */}
            <div className={styles.rateStrip}>
              <div className={styles.rateTitle}>Coin Rate</div>
              <div className={styles.rateValue}>
                {rateLoading ? (
                  "Loading..."
                ) : coinRate.unit && coinRate.price ? (
                  <>
                    <strong>{fmtNum(coinRate.unit)}</strong> COINS ={" "}
                    <strong>{fmtNum(coinRate.price)}</strong> {coinRate.currency}
                  </>
                ) : (
                  "Rate not set"
                )}
              </div>
              <div className={styles.rateHint}>
                Product prices are stored in <strong>COPUP COINS</strong>. We use this rate to estimate value in{" "}
                <strong>{coinRate.currency || "USD"}</strong>.
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button className={styles.softBtn} onClick={loadAll} disabled={loading || busy} type="button">
              <FaSync /> Refresh
            </button>

            <button className={styles.softBtn} onClick={loadCoinRate} disabled={loading || busy || rateLoading} type="button">
              <FaSync /> Rate
            </button>

            <button className={styles.softBtn} onClick={openCategoryManager} disabled={loading || busy} type="button">
              <FaTag /> Categories
            </button>

            {/* ✅ NEW: Featured Only toggle (no CSS changes) */}
            <button
              className={styles.softBtn}
              type="button"
              onClick={() => setFeaturedOnly((v) => !v)}
              disabled={loading || busy}
              title="Toggle: show only featured products"
            >
              {featuredOnly ? <FaStar /> : <FaRegStar />} {featuredOnly ? "Featured Only" : "All Products"}
            </button>

            <button className={styles.primaryBtn} onClick={openCreateProduct} disabled={loading || busy} type="button">
              <FaPlus /> New Product
            </button>
          </div>
        </header>

        {err ? <div className={styles.alert}>{err}</div> : null}

        <section className={styles.toolsRow}>
          <div className={styles.searchWrap}>
            <FaSearch className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products (name, vendor, category)…"
            />
          </div>

          <div className={styles.filterWrap}>
            <FaFilter className={styles.filterIcon} />
            <select className={styles.select} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className={styles.grid}>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.cardSkeleton}>
                <div className={styles.skelImg} />
                <div className={styles.skelLine} />
                <div className={styles.skelLineSmall} />
              </div>
            ))
          ) : filteredProducts.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <FaBoxes />
              </div>
              <div className={styles.emptyTitle}>No products found</div>
              <div className={styles.emptyDesc}>Try changing your filters or create a new product.</div>
              <button className={styles.primaryBtn} onClick={openCreateProduct} type="button">
                <FaPlus /> New Product
              </button>
            </div>
          ) : (
            filteredProducts.map((p) => {
              const cashV = coinsToFiat(p.cash_price, coinRate);
              const auctionV = coinsToFiat(p.auction_price, coinRate);

              return (
                <div key={p.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <div className={styles.imgWrap}>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className={styles.img} />
                      ) : (
                        <div className={styles.imgPlaceholder}>No Image</div>
                      )}

                      <button
                        className={`${styles.featureBtn} ${p.is_featured ? styles.featureOn : ""}`}
                        onClick={(e) => toggleFeatured(e, p.id, !!p.is_featured)}
                        title={p.is_featured ? "Unfeature" : "Feature"}
                        disabled={busy}
                        type="button"
                      >
                        {p.is_featured ? <FaStar /> : <FaRegStar />}
                      </button>
                    </div>

                    <div className={styles.cardBody}>
                      <div className={styles.cardTitleRow}>
                        <h3 className={styles.cardTitle} title={p.name}>
                          {p.name}
                        </h3>
                        <span className={styles.badge}>
                          {p.stock_status === "out_of_stock" ? "Out of stock" : "In stock"}
                        </span>
                      </div>

                      <div className={styles.meta}>
                        <span className={styles.metaItem}>
                          Vendor: <strong>{p.vendor_name || "CopUp"}</strong>
                        </span>

                        <span className={styles.metaItem}>
                          Categories: <strong>{p.categories ? p.categories : "—"}</strong>
                        </span>

                        <span className={styles.metaItem}>
                          Gallery: <strong>{safeNum(p.gallery_count)}</strong>
                        </span>
                      </div>

                      <div className={styles.priceRow}>
                        <div className={styles.priceBox}>
                          <div className={styles.priceLabel}>Cash</div>
                          <div className={styles.priceValue}>
                            {fmtNum(p.cash_price)} <span className={styles.coinUnit}>COINS</span>
                          </div>
                          <div className={styles.priceSub}>
                            {cashV == null ? "Rate not set" : fmtFiat(cashV, coinRate.currency)}
                          </div>
                        </div>

                        <div className={styles.priceBox}>
                          <div className={styles.priceLabel}>Auction</div>
                          <div className={styles.priceValue}>
                            {fmtNum(p.auction_price)} <span className={styles.coinUnit}>COINS</span>
                          </div>
                          <div className={styles.priceSub}>
                            {auctionV == null ? "Rate not set" : fmtFiat(auctionV, coinRate.currency)}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button className={styles.softBtn} onClick={() => openEditProduct(p.id)} disabled={busy} type="button">
                      <FaEdit /> Edit
                    </button>
                    <button className={styles.dangerBtn} onClick={() => deleteProduct(p.id)} disabled={busy} type="button">
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>

      {/* ───────────── Category Modal ───────────── */}
      {showCategoryModal ? (
        <div className={styles.modalOverlay} onMouseDown={() => setShowCategoryModal(false)}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>Categories</div>
                <div className={styles.modalSub}>Create, rename, and delete categories.</div>
              </div>

              <button className={styles.iconBtn} onClick={() => setShowCategoryModal(false)} type="button">
                <FaTimes />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formRow}>
                <input
                  className={styles.input}
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Category name"
                />
                <button className={styles.primaryBtn} onClick={submitCategory} disabled={busy} type="button">
                  <FaSave /> {catEditId ? "Update" : "Create"}
                </button>
              </div>

              <div className={styles.list}>
                {categories.map((c) => (
                  <div key={c.id} className={styles.listRow}>
                    <div className={styles.listMain}>
                      <div className={styles.listTitle}>{c.name}</div>
                      <div className={styles.listSub}>ID: {c.id}</div>
                    </div>

                    <div className={styles.listActions}>
                      <button className={styles.softBtn} onClick={() => editCategory(c)} disabled={busy} type="button">
                        <FaEdit /> Rename
                      </button>
                      <button className={styles.dangerBtn} onClick={() => deleteCategory(c.id)} disabled={busy} type="button">
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ───────────── Product Modal ───────────── */}
      {showProductModal ? (
        <div className={styles.modalOverlay} onMouseDown={() => setShowProductModal(false)}>
          <div className={styles.modalLarge} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>
                  {mode === "create" ? "Create Product" : `Edit Product #${editingId}`}
                </div>
                <div className={styles.modalSub}>
                  Prices are COPUP COINS. We show estimated value using the current coin rate.
                </div>
              </div>

              <button className={styles.iconBtn} onClick={() => setShowProductModal(false)} type="button">
                <FaTimes />
              </button>
            </div>

            <div className={styles.modalBodyGrid}>
              <div className={styles.formCol}>
                <div className={styles.formGrid}>
                  <label className={styles.label}>
                    Name
                    <input className={styles.input} value={pName} onChange={(e) => setPName(e.target.value)} />
                  </label>

                  <label className={styles.label}>
                    Vendor
                    <input className={styles.input} value={pVendor} onChange={(e) => setPVendor(e.target.value)} />
                  </label>

                  <label className={styles.label}>
                    Stock status
                    <select className={styles.select} value={pStock} onChange={(e) => setPStock(e.target.value)}>
                      <option value="in_stock">In stock</option>
                      <option value="out_of_stock">Out of stock</option>
                    </select>
                  </label>

                  <label className={styles.label}>
                    Shipping cost
                    <input
                      className={styles.input}
                      value={pShipCost}
                      onChange={(e) => setPShipCost(e.target.value)}
                      placeholder="0"
                    />
                  </label>

                  <label className={styles.label}>
                    Delivery ETA
                    <input
                      className={styles.input}
                      value={pEta}
                      onChange={(e) => setPEta(e.target.value)}
                      placeholder="e.g. 2-5 days"
                    />
                  </label>

                  <label className={styles.labelFull}>
                    Short description
                    <input
                      className={styles.input}
                      value={pShort}
                      onChange={(e) => setPShort(e.target.value)}
                      placeholder="Short description"
                    />
                  </label>

                  <label className={styles.labelFull}>
                    Description
                    <textarea
                      className={styles.textarea}
                      value={pDesc}
                      onChange={(e) => setPDesc(e.target.value)}
                      placeholder="Full description"
                    />
                  </label>

                  <div className={styles.priceGrid}>
                    <label className={styles.label}>
                      Cash (coins)
                      <input
                        className={styles.input}
                        value={pCash}
                        onChange={(e) => setPCash(e.target.value)}
                        placeholder="0"
                      />
                      <div className={styles.inputHint}>
                        ≈ {cashFiat == null ? "Rate not set" : fmtFiat(cashFiat, coinRate.currency)}
                      </div>
                    </label>

                    <label className={styles.label}>
                      Auction (coins)
                      <input
                        className={styles.input}
                        value={pAuction}
                        onChange={(e) => setPAuction(e.target.value)}
                        placeholder="0"
                      />
                      <div className={styles.inputHint}>
                        ≈ {auctionFiat == null ? "Rate not set" : fmtFiat(auctionFiat, coinRate.currency)}
                      </div>
                    </label>

                  </div>

                  <div className={styles.uploadRow}>
                    <div className={styles.uploadBox}>
                      <div className={styles.uploadTitle}>Primary image</div>
                      <input
                        ref={primaryRef}
                        type="file"
                        accept="image/*"
                        className={styles.file}
                        onChange={(e) => setPrimaryFile(e.target.files?.[0] || null)}
                      />
                      <div className={styles.uploadHint}>
                        <FaUpload /> {primaryFile ? primaryFile.name : "Choose image"}
                      </div>
                    </div>

                    <div className={styles.uploadBox}>
                      <div className={styles.uploadTitle}>Gallery images</div>
                      <input
                        ref={galleryRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className={styles.file}
                        onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))}
                      />
                      <div className={styles.uploadHint}>
                        <FaUpload /> {galleryFiles.length ? `${galleryFiles.length} selected` : "Choose up to 12"}
                      </div>
                    </div>
                  </div>

                  {mode === "edit" ? (
                    <div className={styles.galleryModeRow}>
                      <div className={styles.galleryModeTitle}>Gallery mode</div>
                      <div className={styles.galleryModeBtns}>
                        <button
                          type="button"
                          className={`${styles.pillBtn} ${galleryMode === "append" ? styles.pillActive : ""}`}
                          onClick={() => setGalleryMode("append")}
                        >
                          Append
                        </button>
                        <button
                          type="button"
                          className={`${styles.pillBtn} ${galleryMode === "replace" ? styles.pillActive : ""}`}
                          onClick={() => setGalleryMode("replace")}
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className={styles.modalFooter}>
                    <button
                      className={styles.softBtn}
                      onClick={() => setShowProductModal(false)}
                      disabled={busy}
                      type="button"
                    >
                      <FaTimes /> Cancel
                    </button>
                    <button className={styles.primaryBtn} onClick={submitProduct} disabled={busy} type="button">
                      <FaSave /> {busy ? "Saving..." : mode === "create" ? "Create" : "Save changes"}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.sideCol}>
                <div className={styles.sideCard}>
                  <div className={styles.sideTitle}>Assign Categories</div>
                  <div className={styles.sideSub}>Select one or more categories.</div>

                  <div className={styles.chips}>
                    {categories.map((c) => {
                      const on = pCats.includes(Number(c.id));
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCat(c.id)}
                          className={`${styles.chip} ${on ? styles.chipOn : ""}`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                    {categories.length === 0 ? (
                      <div className={styles.mutedSmall}>
                        No categories yet. Create one in <strong>Categories</strong>.
                      </div>
                    ) : null}
                  </div>
                </div>

                {mode === "edit" && selected ? (
                  <div className={styles.sideCard}>
                    <div className={styles.sideTitle}>Current Media</div>
                    <div className={styles.previewWrap}>
                      {selected.image_url ? (
                        <img className={styles.previewImg} src={selected.image_url} alt="Primary" />
                      ) : (
                        <div className={styles.previewEmpty}>No primary image</div>
                      )}
                    </div>

                    <div className={styles.galleryPreview}>
                      {(selected.gallery || []).slice(0, 6).map((g) => (
                        <img key={g.id} src={g.image_url} alt="Gallery" className={styles.galleryThumb} />
                      ))}
                      {(selected.gallery || []).length === 0 ? (
                        <div className={styles.mutedSmall}>No gallery images</div>
                      ) : null}
                      {(selected.gallery || []).length > 6 ? (
                        <div className={styles.mutedSmall}>+{selected.gallery.length - 6} more</div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
