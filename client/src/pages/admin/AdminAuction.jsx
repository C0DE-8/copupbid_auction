import React from "react";
import styles from "./AdminAuction.module.css";
import { api } from "../../lib/api";
import AdminNavbar from "../../components/admin/Navbar";
import { useToast } from "../../components/Toast/ToastContext";
const CATEGORIES = ["cash", "product", "coupon"];
const AUCTION_STATUSES = ["pending", "active", "completed", "cancelled", "hold"]; // you use hold in start route
const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "in_transit",
  "delivered",
  "cancelled",
];

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
function textOrDash(v) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}
function coinText(v) {
  return `${fmtNum(v)} coins`;
}
function firstCategoryName(product) {
  return String(product?.categories || "").split(",").map((x) => x.trim()).filter(Boolean)[0] || "";
}
function isFile(x) {
  return x && typeof x === "object" && "name" in x && "size" in x;
}

export default function AdminAuction() {
  const toastApi = useToast();
  const [tab, setTab] = React.useState("auctions"); // "auctions" | "orders"

  // ---------- shared ui ----------
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const showToast = (msg, type = "success") => {
    const clean = String(msg || "").replace(/^[✅🚀🗑️⚠️]\s*/u, "");
    const fn = toastApi[type] || toastApi.info;
    fn(clean);
  };

  // ==========================
  // AUCTIONS
  // ==========================
  const [aLoading, setALoading] = React.useState(true);
  const [auctions, setAuctions] = React.useState([]);
  const [aTotal, setATotal] = React.useState(0);
  const [shopCategories, setShopCategories] = React.useState([]);
  const [auctionProducts, setAuctionProducts] = React.useState([]);

  // auction list filters
  const [aq, setAQ] = React.useState("");
  const [acategory, setACategory] = React.useState("");
  const [astatus, setAStatus] = React.useState("");
  const [apage, setAPage] = React.useState(1);
  const [alimit, setALimit] = React.useState(50);

  const aTotalPages = Math.max(1, Math.ceil(aTotal / alimit));

  const loadAuctions = React.useCallback(async () => {
    setALoading(true);
    setErr("");
    try {
      const res = await api.get("/admin/auctions", {
        params: {
          ...(aq ? { q: aq } : {}),
          ...(acategory ? { category: acategory } : {}),
          ...(astatus ? { status: astatus } : {}),
          page: apage,
          limit: alimit,
        },
      });

      setAuctions(Array.isArray(res.data?.data) ? res.data.data : []);
      setATotal(safeNum(res.data?.total, 0));
    } catch (e) {
      console.error("loadAuctions error:", e);
      setErr(e?.response?.data?.message || e?.message || "Failed to load auctions");
    } finally {
      setALoading(false);
    }
  }, [aq, acategory, astatus, apage, alimit]);

  React.useEffect(() => {
    if (tab === "auctions") loadAuctions();
  }, [tab, loadAuctions]);

  React.useEffect(() => {
    if (tab !== "auctions") return;
    let alive = true;
    const loadAuctionRefs = async () => {
      try {
        const [catsRes, productsRes] = await Promise.all([
          api.get("/admin/categories"),
          api.get("/admin/products"),
        ]);
        if (!alive) return;
        setShopCategories(Array.isArray(catsRes.data) ? catsRes.data : []);
        const products = Array.isArray(productsRes.data) ? productsRes.data : [];
        setAuctionProducts(products.filter((p) => safeNum(p.allow_auction, 1) === 1));
      } catch (e) {
        console.error("load auction refs error:", e);
      }
    };
    loadAuctionRefs();
    return () => {
      alive = false;
    };
  }, [tab]);

  // reset page on filter changes
  React.useEffect(() => {
    setAPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aq, acategory, astatus, alimit]);

  // ---------- Create auction ----------
  const [createOpen, setCreateOpen] = React.useState(false);
  const [cName, setCName] = React.useState("");
  const [cDesc, setCDesc] = React.useState("");
  const [cEntry, setCEntry] = React.useState(0);
  const [cMinUsers, setCMinUsers] = React.useState(1);
  const [cCategory, setCCategory] = React.useState("cash");
  const [cShopCategoryId, setCShopCategoryId] = React.useState("");
  const [cProductId, setCProductId] = React.useState("");
  const [cImage, setCImage] = React.useState(null);
  const [cSaving, setCSaving] = React.useState(false);

  const resetCreate = () => {
    setCName("");
    setCDesc("");
    setCEntry(0);
    setCMinUsers(1);
    setCCategory("cash");
    setCShopCategoryId("");
    setCProductId("");
    setCImage(null);
  };

  const applyCreateProduct = (productId) => {
    setCProductId(productId);
    const product = auctionProducts.find((p) => String(p.id) === String(productId));
    if (!product) return;
    setCName(product.name || "");
    setCDesc(product.description || product.short_description || "");
    setCEntry(Math.round(safeNum(product.auction_price, 0)));
    setCCategory("product");
    const catName = firstCategoryName(product);
    const category = shopCategories.find((c) => String(c.name).toLowerCase() === catName.toLowerCase());
    setCShopCategoryId(category ? String(category.id) : "");
  };

  const submitCreate = async () => {
    setErr("");
    if (!cName.trim()) return setErr("Name is required");
    if (!CATEGORIES.includes(String(cCategory).toLowerCase())) return setErr("Invalid category");
    const entry = Number(cEntry);
    const minUsers = Number(cMinUsers);
    if (!Number.isInteger(entry) || entry < 0) return setErr("entry_bid_points must be a non-negative integer");
    if (!Number.isInteger(minUsers) || minUsers < 1) return setErr("minimum_users must be >= 1");

    setCSaving(true);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("name", cName.trim());
      fd.append("description", cDesc || "");
      fd.append("entry_bid_points", String(entry));
      fd.append("minimum_users", String(minUsers));
      fd.append("category", String(cCategory).toLowerCase());
      if (cShopCategoryId) fd.append("shop_category_id", String(cShopCategoryId));
      if (cProductId) fd.append("product_id", String(cProductId));
      if (cImage && isFile(cImage)) fd.append("image", cImage);

      await api.post("/admin/auctions", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showToast("Auction created");
      setCreateOpen(false);
      resetCreate();
      await loadAuctions();
    } catch (e) {
      console.error("create auction error:", e);
      const msg = e?.response?.data?.message || e?.message || "Failed to create auction";
      setErr(msg);
      toastApi.error(msg);
    } finally {
      setCSaving(false);
      setBusy(false);
    }
  };

  // ---------- Edit auction ----------
  const [editOpen, setEditOpen] = React.useState(false);
  const [eLoading, setELoading] = React.useState(false);
  const [eSaving, setESaving] = React.useState(false);
  const [editId, setEditId] = React.useState(null);

  const [eName, setEName] = React.useState("");
  const [eDesc, setEDesc] = React.useState("");
  const [eEntry, setEEntry] = React.useState(0);
  const [eMinUsers, setEMinUsers] = React.useState(1);
  const [eCategory, setECategory] = React.useState("cash");
  const [eShopCategoryId, setEShopCategoryId] = React.useState("");
  const [eProductId, setEProductId] = React.useState("");
  const [eStatus, setEStatus] = React.useState("pending");
  const [eImage, setEImage] = React.useState(null);
  const [ePreview, setEPreview] = React.useState("");

  const openEdit = async (id) => {
    const aid = Number(id);
    if (!aid) return;

    setErr("");
    setEditOpen(true);
    setELoading(true);
    setEditId(aid);
    setEImage(null);

    try {
      const res = await api.get(`/admin/auctions/${aid}`);
      const a = res.data || {};
      setEName(a.name || "");
      setEDesc(a.description || "");
      setEEntry(safeNum(a.entry_bid_points, 0));
      setEMinUsers(safeNum(a.minimum_users, 1));
      setECategory(a.category || "cash");
      setEShopCategoryId(a.shop_category_id ? String(a.shop_category_id) : "");
      setEProductId(safeNum(a.product_id, 0) > 0 ? String(a.product_id) : "");
      setEStatus(a.status || "pending");
      setEPreview(a.image_url || "");
    } catch (e) {
      console.error("openEdit error:", e);
      setErr(e?.response?.data?.message || e?.message || "Failed to load auction");
    } finally {
      setELoading(false);
    }
  };

  const closeEdit = () => {
    if (busy) return;
    setEditOpen(false);
    setEditId(null);
    setEImage(null);
    setEPreview("");
  };

  const applyEditProduct = (productId) => {
    setEProductId(productId);
    if (!productId) return;
    const product = auctionProducts.find((p) => String(p.id) === String(productId));
    if (!product) return;
    setEName(product.name || "");
    setEDesc(product.description || product.short_description || "");
    setEEntry(Math.round(safeNum(product.auction_price, 0)));
    setECategory("product");
    setEPreview(product.image_url || "");
    const catName = firstCategoryName(product);
    const category = shopCategories.find((c) => String(c.name).toLowerCase() === catName.toLowerCase());
    if (category) setEShopCategoryId(String(category.id));
  };

  const submitEdit = async () => {
    if (!editId) return;

    setErr("");
    if (eName != null && !String(eName).trim()) return setErr("Name cannot be empty");
    if (eCategory && !CATEGORIES.includes(String(eCategory).toLowerCase())) return setErr("Invalid category");
    if (eStatus && !AUCTION_STATUSES.includes(String(eStatus).toLowerCase())) return setErr("Invalid status");

    const entry = Number(eEntry);
    const minUsers = Number(eMinUsers);
    if (!Number.isInteger(entry) || entry < 0) return setErr("entry_bid_points must be a non-negative integer");
    if (!Number.isInteger(minUsers) || minUsers < 1) return setErr("minimum_users must be >= 1");

    setESaving(true);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("name", String(eName).trim());
      fd.append("description", eDesc || "");
      fd.append("entry_bid_points", String(entry));
      fd.append("minimum_users", String(minUsers));
      fd.append("category", String(eCategory).toLowerCase());
      fd.append("shop_category_id", eShopCategoryId ? String(eShopCategoryId) : "");
      fd.append("product_id", eProductId ? String(eProductId) : "");
      fd.append("status", String(eStatus).toLowerCase());
      if (eImage && isFile(eImage)) fd.append("image", eImage);

      await api.patch(`/admin/auctions/${editId}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showToast("Auction updated");
      closeEdit();
      await loadAuctions();
    } catch (e) {
      console.error("submitEdit error:", e);
      const msg = e?.response?.data?.message || e?.message || "Failed to update auction";
      setErr(msg);
      toastApi.error(msg);
    } finally {
      setESaving(false);
      setBusy(false);
    }
  };

  // ---------- Delete auction ----------
  const deleteAuction = async (id) => {
    const aid = Number(id);
    if (!aid) return;
    if (!window.confirm(`Delete auction #${aid}? This cannot be undone.`)) return;

    setBusy(true);
    setErr("");
    try {
      await api.delete(`/admin/auctions/${aid}`);
      showToast("Auction deleted", "info");
      await loadAuctions();
    } catch (e) {
      console.error("deleteAuction error:", e);
      const msg = e?.response?.data?.message || e?.message || "Failed to delete auction";
      setErr(msg);
      toastApi.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // ---------- Start auction ----------
  const startAuction = async (id, force = false) => {
    const aid = Number(id);
    if (!aid) return;

    setBusy(true);
    setErr("");
    try {
      const res = await api.patch(`/admin/auctions/${aid}/start`, null, {
        params: force ? { force: "true" } : {},
      });

      showToast("Auction started");
      // optional: show end date
      if (res.data?.end_date_in_utc) {
        console.log("Auction ends:", res.data.end_date_in_utc);
      }
      await loadAuctions();
    } catch (e) {
      console.error("startAuction error:", e);
      const msg = e?.response?.data?.message || e?.message || "Failed to start auction";
      setErr(msg);
      toastApi.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // ==========================
  // ORDERS
  // ==========================
  const [oLoading, setOLoading] = React.useState(true);
  const [orders, setOrders] = React.useState([]);
  const [oTotal, setOTotal] = React.useState(0);

  // order list filters
  const [oq, setOQ] = React.useState("");
  const [ostatus, setOStatus] = React.useState("");
  const [ofrom, setOFrom] = React.useState("");
  const [oto, setOTo] = React.useState("");
  const [opage, setOPage] = React.useState(1);
  const [olimit, setOLimit] = React.useState(50);

  const oTotalPages = Math.max(1, Math.ceil(oTotal / olimit));

  const loadOrders = React.useCallback(async () => {
    setOLoading(true);
    setErr("");
    try {
      const res = await api.get("/admin/auction/orders", {
        params: {
          ...(oq ? { q: oq } : {}),
          ...(ostatus ? { status: ostatus } : {}),
          ...(ofrom ? { from: ofrom } : {}),
          ...(oto ? { to: oto } : {}),
          page: opage,
          limit: olimit,
        },
      });

      setOrders(Array.isArray(res.data?.data) ? res.data.data : []);
      setOTotal(safeNum(res.data?.total, 0));
    } catch (e) {
      console.error("loadOrders error:", e);
      setErr(e?.response?.data?.message || e?.message || "Failed to load orders");
    } finally {
      setOLoading(false);
    }
  }, [oq, ostatus, ofrom, oto, opage, olimit]);

  React.useEffect(() => {
    if (tab === "orders") loadOrders();
  }, [tab, loadOrders]);

  React.useEffect(() => {
    setOPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oq, ostatus, ofrom, oto, olimit]);

  // inline update form per order
  const [orderEdit, setOrderEdit] = React.useState({}); // { [orderId]: { status, trackingNumber, notify } }

  const updateOrderDraft = (orderId, patch) => {
    setOrderEdit((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        ...patch,
      },
    }));
  };

  const submitOrderUpdate = async (orderId) => {
    const oid = Number(orderId);
    if (!oid) return;

    const draft = orderEdit[oid] || {};
    const payload = {};
    if (draft.status) payload.status = draft.status;
    if (draft.trackingNumber !== undefined) payload.trackingNumber = draft.trackingNumber;
    payload.notify = draft.notify === undefined ? true : !!draft.notify;

    if (!payload.status && payload.trackingNumber === undefined) {
      return showToast("Add status and/or tracking number", "warning");
    }

    setBusy(true);
    setErr("");
    try {
      await api.patch(`/admin/auction/orders/${oid}`, payload);
      showToast("Order updated");
      await loadOrders();
    } catch (e) {
      console.error("submitOrderUpdate error:", e);
      const msg = e?.response?.data?.message || e?.message || "Failed to update order";
      setErr(msg);
      toastApi.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const deleteOrder = async (orderId, force = false) => {
    const oid = Number(orderId);
    if (!oid) return;

    const msg = force
      ? `FORCE delete order #${oid}? (even if shipped/in_transit/delivered)`
      : `Delete order #${oid}? (May fail if shipped/in_transit/delivered unless forced)`;

    if (!window.confirm(msg)) return;

    setBusy(true);
    setErr("");
    try {
      await api.delete(`/admin/auction/orders/${oid}`, {
        params: force ? { force: "1" } : {},
      });
      showToast("Order deleted", "info");
      await loadOrders();
    } catch (e) {
      console.error("deleteOrder error:", e);
      const msg = e?.response?.data?.message || e?.message || "Failed to delete order";
      setErr(msg);
      toastApi.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    setErr("");
    if (tab === "auctions") return loadAuctions();
    return loadOrders();
  };

  return (
    <>
    <AdminNavbar />
    <div className={styles.page}>
      <div className={styles.bgGlow} />

      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleWrap}>
            <button
              className={styles.backBtn}
              type="button"
              onClick={() => window.history.back()}
              title="Back"
            >
              ← Back
            </button>
            <div>
              <h1 className={styles.title}>Admin Auction</h1>
              <p className={styles.sub}>
                Manage auctions, start rounds, and manage auction orders.
              </p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button className={styles.softBtn} type="button" onClick={refresh} disabled={busy}>
              ↻ Refresh
            </button>

            {tab === "auctions" ? (
              <button
                className={styles.primaryBtn}
                type="button"
                onClick={() => setCreateOpen(true)}
                disabled={busy}
              >
                + Create Auction
              </button>
            ) : null}
          </div>
        </header>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === "auctions" ? styles.tabActive : ""}`}
            onClick={() => setTab("auctions")}
          >
            Auctions
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === "orders" ? styles.tabActive : ""}`}
            onClick={() => setTab("orders")}
          >
            Orders
          </button>
        </div>

        {err ? <div className={styles.alert}>{err}</div> : null}

        {/* ====================== AUCTIONS TAB ====================== */}
        {tab === "auctions" ? (
          <>
            <section className={styles.tools}>
              <div className={styles.searchWrap}>
                <input
                  className={styles.input}
                  value={aq}
                  onChange={(e) => setAQ(e.target.value)}
                  placeholder="Search auctions (name/description)…"
                />
              </div>

              <select
                className={styles.select}
                value={acategory}
                onChange={(e) => setACategory(e.target.value)}
              >
                <option value="">All Auction Types</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                className={styles.select}
                value={astatus}
                onChange={(e) => setAStatus(e.target.value)}
              >
                <option value="">All Status</option>
                {AUCTION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                className={styles.select}
                value={String(alimit)}
                onChange={(e) => setALimit(Number(e.target.value))}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="75">75</option>
                <option value="100">100</option>
              </select>

              <div className={styles.pager}>
                <button
                  className={styles.pagerBtn}
                  type="button"
                  onClick={() => setAPage((p) => Math.max(1, p - 1))}
                  disabled={busy || aLoading || apage <= 1}
                >
                  ‹
                </button>
                <div className={styles.pagerInfo}>
                  Page {apage} / {aTotalPages} • Total {fmtNum(aTotal)}
                </div>
                <button
                  className={styles.pagerBtn}
                  type="button"
                  onClick={() => setAPage((p) => Math.min(aTotalPages, p + 1))}
                  disabled={busy || aLoading || apage >= aTotalPages}
                >
                  ›
                </button>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>
                  Auctions{" "}
                  <span className={styles.muted}>
                    {aLoading ? "…" : `${fmtNum(auctions.length)} / ${fmtNum(aTotal)}`}
                  </span>
                </div>
              </div>

              {aLoading ? (
                <div className={styles.centerMuted}>Loading auctions…</div>
              ) : auctions.length === 0 ? (
                <div className={styles.centerMuted}>No auctions found.</div>
              ) : (
                <div className={styles.grid}>
                  {auctions.map((a) => (
                    <div key={a.id} className={styles.auctionItem}>
                      <div className={styles.auctionImgWrap}>
                        {a.image_url ? (
                          <img className={styles.auctionImg} src={a.image_url} alt={a.name} />
                        ) : (
                          <div className={styles.noImg}>No Image</div>
                        )}
                        <span className={`${styles.badge} ${styles[`st_${String(a.status || "").toLowerCase()}`] || ""}`}>
                          {a.status}
                        </span>
                      </div>

                      <div className={styles.auctionBody}>
                        <div className={styles.auctionTop}>
                          <div className={styles.auctionName}>{a.name}</div>
                          <span className={`${styles.badge} ${styles.badgeSoft}`}>
                            {a.category}
                          </span>
                        </div>

                        <div className={styles.auctionDesc}>
                          {a.description ? a.description : <span className={styles.muted}>No description</span>}
                        </div>

                        <div className={styles.auctionStatsGrid}>
                          <div className={styles.auctionStat}>
                            <span>Joined users</span>
                            <b>{fmtNum(a.participant_count)}</b>
                          </div>
                          <div className={styles.auctionStat}>
                            <span>Unique bidders</span>
                            <b>{fmtNum(a.unique_bidders)}</b>
                          </div>
                          <div className={styles.auctionStat}>
                            <span>Total bid</span>
                            <b>{coinText(a.total_bid_points)}</b>
                          </div>
                          <div className={styles.auctionStat}>
                            <span>Current bid</span>
                            <b>{coinText(a.current_bid_amount)}</b>
                          </div>
                        </div>

                        <div className={styles.auctionInfoGrid}>
                          <div className={styles.auctionInfoBox}>
                            <span>Winner</span>
                            <b>{textOrDash(a.winner_username)}</b>
                            {a.winner_email ? <small>{a.winner_email}</small> : null}
                          </div>
                          <div className={styles.auctionInfoBox}>
                            <span>Highest bidder</span>
                            <b>{textOrDash(a.highest_bidder_username)}</b>
                            {a.highest_bidder ? <small>User #{a.highest_bidder}</small> : null}
                          </div>
                          <div className={styles.auctionInfoBox}>
                            <span>Top spender</span>
                            <b>{textOrDash(a.top_spender_username)}</b>
                            <small>{coinText(a.top_spender_points)}</small>
                          </div>
                          <div className={styles.auctionInfoBox}>
                            <span>Current bidder</span>
                            <b>{textOrDash(a.current_bidder_username)}</b>
                            {a.current_bidder ? <small>User #{a.current_bidder}</small> : null}
                          </div>
                        </div>

                        <div className={styles.metaRow}>
                          <div className={styles.meta}>
                            Entry: <b>{fmtNum(a.entry_bid_points)}</b>
                          </div>
                          <div className={styles.meta}>
                            Min Users: <b>{fmtNum(a.minimum_users)}</b>
                          </div>
                        </div>

                        <div className={styles.metaRow}>
                          <div className={styles.meta}>Created: {fmtDate(a.created_at)}</div>
                          <div className={styles.meta}>Ends: {fmtDate(a.end_date)}</div>
                          <div className={styles.meta}>Final price: <b>{coinText(a.final_price)}</b></div>
                          <div className={styles.meta}>
                            Product: <b>{safeNum(a.product_id) > 0 ? `#${a.product_id}` : "Standalone"}</b>
                          </div>
                          <div className={styles.meta}>
                            Shop category: <b>{textOrDash(a.shop_category_name)}</b>
                          </div>
                          {a.product_name ? (
                            <div className={styles.meta}>
                              Product name: <b>{a.product_name}</b>
                            </div>
                          ) : null}
                        </div>

                        <div className={styles.actionsRow}>
                          <button
                            className={styles.softBtnSmall}
                            type="button"
                            onClick={() => openEdit(a.id)}
                            disabled={busy}
                          >
                            ✎ Edit
                          </button>

                          <button
                            className={styles.dangerBtnSmall}
                            type="button"
                            onClick={() => deleteAuction(a.id)}
                            disabled={busy}
                          >
                            🗑 Delete
                          </button>

                          <div className={styles.startGroup}>
                            <button
                              className={styles.primaryBtnSmall}
                              type="button"
                              onClick={() => startAuction(a.id, false)}
                              disabled={busy || String(a.status).toLowerCase() === "active"}
                              title="Start (checks minimum users unless in hold)"
                            >
                              🚀 Start
                            </button>

                            <button
                              className={styles.warnBtnSmall}
                              type="button"
                              onClick={() => startAuction(a.id, true)}
                              disabled={busy || String(a.status).toLowerCase() === "active"}
                              title="Force start (ignores minimum users when pending)"
                            >
                              ⚡ Force
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}

        {/* ====================== ORDERS TAB ====================== */}
        {tab === "orders" ? (
          <>
            <section className={styles.tools}>
              <div className={styles.searchWrap}>
                <input
                  className={styles.input}
                  value={oq}
                  onChange={(e) => setOQ(e.target.value)}
                  placeholder="Search orders: email/username or orderId…"
                />
              </div>

              <select
                className={styles.select}
                value={ostatus}
                onChange={(e) => setOStatus(e.target.value)}
              >
                <option value="">All Status</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <input
                className={styles.input}
                type="date"
                value={ofrom}
                onChange={(e) => setOFrom(e.target.value)}
                title="From date"
              />
              <input
                className={styles.input}
                type="date"
                value={oto}
                onChange={(e) => setOTo(e.target.value)}
                title="To date"
              />

              <select
                className={styles.select}
                value={String(olimit)}
                onChange={(e) => setOLimit(Number(e.target.value))}
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="75">75</option>
                <option value="100">100</option>
              </select>

              <div className={styles.pager}>
                <button
                  className={styles.pagerBtn}
                  type="button"
                  onClick={() => setOPage((p) => Math.max(1, p - 1))}
                  disabled={busy || oLoading || opage <= 1}
                >
                  ‹
                </button>
                <div className={styles.pagerInfo}>
                  Page {opage} / {oTotalPages} • Total {fmtNum(oTotal)}
                </div>
                <button
                  className={styles.pagerBtn}
                  type="button"
                  onClick={() => setOPage((p) => Math.min(oTotalPages, p + 1))}
                  disabled={busy || oLoading || opage >= oTotalPages}
                >
                  ›
                </button>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>
                  Auction Orders{" "}
                  <span className={styles.muted}>
                    {oLoading ? "…" : `${fmtNum(orders.length)} / ${fmtNum(oTotal)}`}
                  </span>
                </div>
              </div>

              {oLoading ? (
                <div className={styles.centerMuted}>Loading orders…</div>
              ) : orders.length === 0 ? (
                <div className={styles.centerMuted}>No orders found.</div>
              ) : (
                <div className={styles.ordersList}>
                  {orders.map((o) => {
                    const draft = orderEdit[o.orderId] || {};
                    return (
                      <div key={o.orderId} className={styles.orderCard}>
                        <div className={styles.orderTop}>
                          <div>
                            <div className={styles.orderTitle}>
                              Order #{o.orderId}{" "}
                              <span className={`${styles.badge} ${styles[`os_${String(o.status || "").toLowerCase()}`] || styles.badgeSoft}`}>
                                {o.status}
                              </span>
                            </div>
                            <div className={styles.orderSub}>
                              User: <b>{o.username || "—"}</b> • {o.email || "—"}
                            </div>
                          </div>

                          <div className={styles.orderMeta}>
                            <div className={styles.meta}>Created: {fmtDate(o.createdAt)}</div>
                            <div className={styles.meta}>Updated: {fmtDate(o.updatedAt)}</div>
                          </div>
                        </div>

                        <div className={styles.orderInfoGrid}>
                          <div className={styles.infoBox}>
                            <div className={styles.infoLabel}>Address</div>
                            <div className={styles.infoValue}>{o.address || "—"}</div>
                          </div>
                          <div className={styles.infoBox}>
                            <div className={styles.infoLabel}>Phone</div>
                            <div className={styles.infoValue}>{o.phone || "—"}</div>
                          </div>
                          <div className={styles.infoBox}>
                            <div className={styles.infoLabel}>Tracking</div>
                            <div className={styles.infoValue}>{o.trackingNumber || "—"}</div>
                          </div>
                        </div>

                        <div className={styles.itemsWrap}>
                          <div className={styles.itemsTitle}>Items</div>
                          {Array.isArray(o.items) && o.items.length ? (
                            <div className={styles.itemsGrid}>
                              {o.items.map((it) => (
                                <div key={it.itemId} className={styles.item}>
                                  <div className={styles.itemTop}>
                                    <div className={styles.itemName}>{it.name}</div>
                                    <span className={`${styles.badge} ${styles.badgeSoft}`}>{it.category}</span>
                                  </div>
                                  <div className={styles.itemDesc}>
                                    {it.description ? it.description : <span className={styles.muted}>No description</span>}
                                  </div>
                                  <div className={styles.metaRow}>
                                    <div className={styles.meta}>
                                      Final Price: <b>{fmtNum(it.finalPrice)}</b>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className={styles.muted}>No items</div>
                          )}
                        </div>

                        <div className={styles.orderActions}>
                          <div className={styles.row}>
                            <div className={styles.formField}>
                              <label className={styles.label}>Update Status</label>
                              <select
                                className={styles.select}
                                value={draft.status || ""}
                                onChange={(e) => updateOrderDraft(o.orderId, { status: e.target.value })}
                              >
                                <option value="">(no change)</option>
                                {ORDER_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className={styles.formField}>
                              <label className={styles.label}>Tracking Number</label>
                              <input
                                className={styles.input}
                                value={draft.trackingNumber ?? ""}
                                onChange={(e) => updateOrderDraft(o.orderId, { trackingNumber: e.target.value })}
                                placeholder="Enter tracking number…"
                              />
                            </div>

                            <label className={styles.check}>
                              <input
                                type="checkbox"
                                checked={draft.notify === undefined ? true : !!draft.notify}
                                onChange={(e) => updateOrderDraft(o.orderId, { notify: e.target.checked })}
                              />
                              <span>Notify user</span>
                            </label>
                          </div>

                          <div className={styles.actionsRow}>
                            <button
                              className={styles.primaryBtnSmall}
                              type="button"
                              onClick={() => submitOrderUpdate(o.orderId)}
                              disabled={busy}
                            >
                              ✅ Save
                            </button>

                            <button
                              className={styles.dangerBtnSmall}
                              type="button"
                              onClick={() => deleteOrder(o.orderId, false)}
                              disabled={busy}
                              title="Normal delete (may fail if shipped/in_transit/delivered)"
                            >
                              🗑 Delete
                            </button>

                            <button
                              className={styles.warnBtnSmall}
                              type="button"
                              onClick={() => deleteOrder(o.orderId, true)}
                              disabled={busy}
                              title="Force delete"
                            >
                              ⚡ Force Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>

      {/* ====================== CREATE MODAL ====================== */}
      {createOpen ? (
        <div className={styles.modalOverlay} onMouseDown={() => !busy && setCreateOpen(false)}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div>
                <div className={styles.modalTitle}>Create Auction</div>
                <div className={styles.modalSub}>POST /api/admin/auctions</div>
              </div>
              <button className={styles.iconBtn} type="button" onClick={() => !busy && setCreateOpen(false)}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.formFieldFull}>
                  <label className={styles.label}>Use Existing Product</label>
                  <select
                    className={styles.select}
                    value={cProductId}
                    onChange={(e) => applyCreateProduct(e.target.value)}
                  >
                    <option value="">Standalone auction</option>
                    {auctionProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.id} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formFieldFull}>
                  <label className={styles.label}>Name *</label>
                  <input className={styles.input} value={cName} onChange={(e) => setCName(e.target.value)} />
                </div>

                <div className={styles.formFieldFull}>
                  <label className={styles.label}>Description</label>
                  <textarea
                    className={styles.textarea}
                    value={cDesc}
                    onChange={(e) => setCDesc(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Entry Bid Points *</label>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    step="1"
                    value={cEntry}
                    onChange={(e) => setCEntry(Number(e.target.value))}
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Minimum Users *</label>
                  <input
                    className={styles.input}
                    type="number"
                    min="1"
                    step="1"
                    value={cMinUsers}
                    onChange={(e) => setCMinUsers(Number(e.target.value))}
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Auction Type *</label>
                  <select className={styles.select} value={cCategory} onChange={(e) => setCCategory(e.target.value)}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Shop Category</label>
                  <select
                    className={styles.select}
                    value={cShopCategoryId}
                    onChange={(e) => setCShopCategoryId(e.target.value)}
                  >
                    <option value="">No shop category</option>
                    {shopCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.label}>Image</label>
                  <input
                    className={styles.input}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCImage(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  className={styles.softBtn}
                  type="button"
                  onClick={() => {
                    if (busy) return;
                    setCreateOpen(false);
                    resetCreate();
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button className={styles.primaryBtn} type="button" onClick={submitCreate} disabled={busy || cSaving}>
                  {cSaving ? "Creating…" : "Create Auction"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ====================== EDIT MODAL ====================== */}
      {editOpen ? (
        <div className={styles.modalOverlay} onMouseDown={closeEdit}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div>
                <div className={styles.modalTitle}>Edit Auction #{editId}</div>
                <div className={styles.modalSub}>PATCH /api/admin/auctions/:id</div>
              </div>
              <button className={styles.iconBtn} type="button" onClick={closeEdit} disabled={busy}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {eLoading ? (
                <div className={styles.centerMuted}>Loading…</div>
              ) : (
                <>
                  <div className={styles.previewRow}>
                    <div className={styles.previewBox}>
                      {eImage ? (
                        <div className={styles.muted}>New image selected: {eImage.name}</div>
                      ) : ePreview ? (
                        <img className={styles.previewImg} src={ePreview} alt="preview" />
                      ) : (
                        <div className={styles.noImg}>No image</div>
                      )}
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formFieldFull}>
                      <label className={styles.label}>Use Existing Product</label>
                      <select
                        className={styles.select}
                        value={eProductId}
                        onChange={(e) => applyEditProduct(e.target.value)}
                      >
                        <option value="">Standalone auction</option>
                        {auctionProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            #{p.id} - {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formFieldFull}>
                      <label className={styles.label}>Name</label>
                      <input className={styles.input} value={eName} onChange={(e) => setEName(e.target.value)} />
                    </div>

                    <div className={styles.formFieldFull}>
                      <label className={styles.label}>Description</label>
                      <textarea
                        className={styles.textarea}
                        value={eDesc}
                        onChange={(e) => setEDesc(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.label}>Entry Bid Points</label>
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        step="1"
                        value={eEntry}
                        onChange={(e) => setEEntry(Number(e.target.value))}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.label}>Minimum Users</label>
                      <input
                        className={styles.input}
                        type="number"
                        min="1"
                        step="1"
                        value={eMinUsers}
                        onChange={(e) => setEMinUsers(Number(e.target.value))}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.label}>Auction Type</label>
                      <select className={styles.select} value={eCategory} onChange={(e) => setECategory(e.target.value)}>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.label}>Shop Category</label>
                      <select
                        className={styles.select}
                        value={eShopCategoryId}
                        onChange={(e) => setEShopCategoryId(e.target.value)}
                      >
                        <option value="">No shop category</option>
                        {shopCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.label}>Status</label>
                      <select className={styles.select} value={eStatus} onChange={(e) => setEStatus(e.target.value)}>
                        {AUCTION_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formFieldFull}>
                      <label className={styles.label}>Replace Image</label>
                      <input
                        className={styles.input}
                        type="file"
                        accept="image/*"
                        onChange={(e) => setEImage(e.target.files?.[0] || null)}
                      />
                    </div>
                  </div>

                  <div className={styles.modalActions}>
                    <button className={styles.softBtn} type="button" onClick={closeEdit} disabled={busy}>
                      Cancel
                    </button>
                    <button className={styles.primaryBtn} type="button" onClick={submitEdit} disabled={busy || eSaving}>
                      {eSaving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>

    </>

  );
}
