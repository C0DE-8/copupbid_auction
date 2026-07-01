// src/pages/admin/AdminFavorites.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api, imgUrl } from "../../lib/api";
import styles from "./AdminFavorites.module.css";
import AdminNavbar from "../../components/admin/Navbar";
import { ToastProvider, useToast } from "../../components/ui/Toaster";
import Modal from "../../components/ui/Modal";

import {
  FiRefreshCw,
  FiSearch,
  FiStar,
  FiUsers,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
  FiTag,
  FiImage,
} from "react-icons/fi";

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function fmtDate(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}
function normUrl(v) {
  // your api already has imgUrl helper, but summary returns image_url
  return v ? imgUrl(v) || v : "";
}

export default function AdminFavorites() {
  return (
    <ToastProvider>
      <AdminFavoritesInner />
    </ToastProvider>
  );
}

function AdminFavoritesInner() {
  const toast = useToast();

  const [busy, setBusy] = useState(false);

  // -------------------- CATEGORY FILTER (derived) --------------------
  // Your backend doesn't provide a categories list endpoint here.
  // We derive "category options" from /admin/products categories string.
  const [categoryOptions, setCategoryOptions] = useState([{ id: null, name: "All Categories" }]);
  const [categoryId, setCategoryId] = useState(null); // null => all

  // -------------------- SUMMARY LIST --------------------
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState([]);

  // -------------------- DETAIL MODAL (product favorites users) --------------------
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null); // { product, counts, limit, offset, items }
  const [dLimit, setDLimit] = useState(50);
  const [dOffset, setDOffset] = useState(0);

  const canPrev = offset > 0;
  const canNext = rows.length >= limit;

  const dCanPrev = dOffset > 0;
  const dCanNext = (detail?.items?.length || 0) >= dLimit;

  // -------------------- Load categories (derived from products list) --------------------
  const fetchCategoryOptions = async () => {
    try {
      // get all products once, and derive categories from "categories" string
      const res = await api.get("/admin/products");
      const list = res.data || [];

      const setNames = new Set();
      list.forEach((p) => {
        const cats = String(p.categories || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        cats.forEach((c) => setNames.add(c));
      });

      // We don't have category IDs here, only names from the products route.
      // So we display names, but categoryId filter requires ID.
      // ✅ Solution: show "Derived Categories" as a visual filter ONLY for search,
      // and keep the real categoryId filter as a numeric input (since your API expects categoryId).
      const opts = [{ id: null, name: "All Categories" }].concat(
        Array.from(setNames)
          .sort((a, b) => a.localeCompare(b))
          .map((name) => ({ id: null, name }))
      );
      setCategoryOptions(opts);
    } catch (err) {
      console.error("fetchCategoryOptions error:", err);
      // silent; not critical
    }
  };

  // -------------------- Fetch favorites summary --------------------
  const fetchSummary = async () => {
    try {
      setLoading(true);

      const params = { limit, offset };
      // real filter
      if (Number.isFinite(Number(categoryId)) && Number(categoryId) > 0) {
        params.categoryId = Number(categoryId);
      }

      const res = await api.get("/admin/favorites/summary", { params });

      const data = Array.isArray(res.data) ? res.data : [];

      // client-side search by name/categories
      const filtered = String(q || "").trim()
        ? data.filter((r) => {
            const hay = `${r.name || ""} ${r.categories || ""}`.toLowerCase();
            return hay.includes(String(q).toLowerCase());
          })
        : data;

      setRows(
        filtered.map((r) => ({
          ...r,
          favorite_count: safeNum(r.favorite_count, 0),
          distinct_users: safeNum(r.distinct_users, 0),
          image_url: r.image_url || normUrl(r.image_path),
        }))
      );
    } catch (err) {
      console.error("fetchSummary error:", err);
      toast.error(err?.response?.data?.message || "Failed to fetch favorites summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset, categoryId]);

  // search should not re-hit server, just filter current page
  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const refresh = async () => {
    await fetchSummary();
  };

  // -------------------- Detail (users who favorited a product) --------------------
  const openDetail = async (productId) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetail(null);
      setDOffset(0);

      const res = await api.get(`/admin/products/${productId}/favorites`, {
        params: { limit: dLimit, offset: 0 },
      });

      setDetail(res.data || null);
    } catch (err) {
      console.error("openDetail error:", err);
      toast.error(err?.response?.data?.message || "Failed to load product favorites");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const loadDetailPage = async (nextOffset) => {
    const pid = detail?.product?.id;
    if (!pid) return;

    try {
      setBusy(true);
      setDetailLoading(true);

      const res = await api.get(`/admin/products/${pid}/favorites`, {
        params: { limit: dLimit, offset: nextOffset },
      });

      setDetail(res.data || null);
      setDOffset(nextOffset);
    } catch (err) {
      console.error("loadDetailPage error:", err);
      toast.error(err?.response?.data?.message || "Failed to load favorites page");
    } finally {
      setBusy(false);
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    if (busy) return;
    setDetailOpen(false);
    setDetail(null);
  };

  const topTotals = useMemo(() => {
    const totalFav = rows.reduce((a, r) => a + safeNum(r.favorite_count, 0), 0);
    const totalUsers = rows.reduce((a, r) => a + safeNum(r.distinct_users, 0), 0);
    const featured = rows.filter((r) => safeNum(r.is_featured, 0) === 1).length;
    return { totalFav, totalUsers, featured };
  }, [rows]);

  return (
    <>
      <AdminNavbar />

      <div className={styles.page}>
        <div className={styles.bgGlow} />

        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.titleWrap}>
              <button className={styles.backBtn} type="button" onClick={() => window.history.back()}>
                ← Back
              </button>

              <div>
                <h2 className={styles.title}>Favorites Summary</h2>
                <p className={styles.sub}>
                  View most favorited products and see which users favorited each product.
                </p>
              </div>
            </div>

            <div className={styles.headerActions}>
              <button className={styles.softBtn} type="button" onClick={refresh} disabled={busy || loading}>
                <FiRefreshCw /> Refresh
              </button>
            </div>
          </header>

          <section className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Favorites (sum)</div>
              <div className={styles.statValue}>
                <FiStar /> {topTotals.totalFav.toLocaleString()}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Distinct Users (sum)</div>
              <div className={styles.statValue}>
                <FiUsers /> {topTotals.totalUsers.toLocaleString()}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Featured in list</div>
              <div className={styles.statValue}>
                <FiTag /> {topTotals.featured.toLocaleString()}
              </div>
            </div>
          </section>

          <section className={styles.tools}>
            <div className={styles.searchWrap}>
              <FiSearch className={styles.searchIcon} />
              <input
                className={styles.input}
                placeholder="Search products or categories..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* real categoryId filter is numeric because API expects id */}
            <input
              className={styles.inputSmall}
              placeholder="categoryId (number)"
              value={categoryId ?? ""}
              onChange={(e) => {
                const v = e.target.value.trim();
                setOffset(0);
                setCategoryId(v === "" ? null : v);
              }}
              title="API filter uses categoryId numeric"
            />

            <select className={styles.select} value={String(limit)} onChange={(e) => { setOffset(0); setLimit(Number(e.target.value)); }}>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="75">75</option>
              <option value="100">100</option>
              <option value="150">150</option>
              <option value="200">200</option>
            </select>

            <div className={styles.pager}>
              <button className={styles.pagerBtn} type="button" onClick={() => setOffset((o) => Math.max(0, o - limit))} disabled={busy || loading || !canPrev}>
                <FiChevronLeft />
              </button>

              <div className={styles.pagerInfo}>
                Offset <span className={styles.mono}>{offset}</span> • Limit{" "}
                <span className={styles.mono}>{limit}</span> • Showing{" "}
                <span className={styles.mono}>{rows.length}</span>
                {loading ? " • Loading…" : ""}
              </div>

              <button className={styles.pagerBtn} type="button" onClick={() => setOffset((o) => o + limit)} disabled={busy || loading || !canNext}>
                <FiChevronRight />
              </button>
            </div>
          </section>

          {/* Derived categories (visual only) */}
          <section className={styles.chips}>
            {categoryOptions.slice(0, 18).map((c, idx) => (
              <span key={`${c.name}-${idx}`} className={styles.chip}>
                <FiTag /> {c.name}
              </span>
            ))}
            {categoryOptions.length > 18 ? (
              <span className={styles.chipMuted}>+{categoryOptions.length - 18} more</span>
            ) : null}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardTitle}>Favorites Summary</div>
              <div className={styles.mutedSmall}>GET /api/admin/favorites/summary</div>
            </div>

            {loading ? (
              <div className={styles.centerMuted}>Loading…</div>
            ) : rows.length === 0 ? (
              <div className={styles.centerMuted}>No data.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Prices</th>
                      <th>Categories</th>
                      <th>Favorites</th>
                      <th>Distinct Users</th>
                      <th>Featured</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((r) => {
                      const img = r.image_url || "";
                      return (
                        <tr key={r.id}>
                          <td>
                            <div className={styles.prodCell}>
                              <div className={styles.prodImgWrap}>
                                {img ? (
                                  <img
                                    className={styles.prodImg}
                                    src={img}
                                    alt={r.name || "product"}
                                    onError={(e) => (e.currentTarget.style.display = "none")}
                                  />
                                ) : (
                                  <div className={styles.imgFallback}>
                                    <FiImage />
                                  </div>
                                )}
                              </div>

                              <div>
                                <div className={styles.cellTitle}>{r.name}</div>
                                <div className={styles.mutedSmall}>ID: <span className={styles.mono}>{r.id}</span></div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className={styles.mutedSmall}>
                              Cash: <span className={styles.mono}>{safeNum(r.cash_price, 0)}</span>
                            </div>
                            <div className={styles.mutedSmall}>
                              Auction: <span className={styles.mono}>{safeNum(r.auction_price, 0)}</span>
                            </div>
                          </td>

                          <td className={styles.mutedSmall}>
                            {r.categories ? r.categories : "—"}
                          </td>

                          <td>
                            <span className={styles.badgeInfo}>
                              <FiStar /> {safeNum(r.favorite_count, 0)}
                            </span>
                          </td>

                          <td>
                            <span className={styles.badgeSoft}>
                              <FiUsers /> {safeNum(r.distinct_users, 0)}
                            </span>
                          </td>

                          <td>
                            {safeNum(r.is_featured, 0) === 1 ? (
                              <span className={styles.badgeGood}>Yes</span>
                            ) : (
                              <span className={styles.badgeSoft}>No</span>
                            )}
                          </td>

                          <td className={styles.mutedSmall}>{fmtDate(r.created_at)}</td>

                          <td className={styles.actions}>
                            <button
                              className={styles.softBtnSmall}
                              type="button"
                              disabled={busy}
                              onClick={() => openDetail(r.id)}
                            >
                              <FiEye /> View Users
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* DETAIL MODAL */}
        <Modal
          open={detailOpen}
          title={`Product Favorites${detail?.product?.name ? ` • ${detail.product.name}` : ""}`}
          subtitle="GET /api/admin/products/:productId/favorites"
          onClose={closeDetail}
          disableClose={busy}
          size="lg"
          footer={
            <>
              <button className={styles.softBtn} type="button" onClick={closeDetail} disabled={busy}>
                Close
              </button>
            </>
          }
        >
          {detailLoading ? (
            <div className={styles.centerMuted}>Loading…</div>
          ) : !detail?.product ? (
            <div className={styles.centerMuted}>No data.</div>
          ) : (
            <>
              <div className={styles.detailTop}>
                <div className={styles.detailProd}>
                  {detail.product.image_url ? (
                    <img className={styles.detailImg} src={detail.product.image_url} alt={detail.product.name} />
                  ) : (
                    <div className={styles.imgFallbackLg}>
                      <FiImage />
                    </div>
                  )}
                  <div>
                    <div className={styles.cellTitle}>{detail.product.name}</div>
                    <div className={styles.mutedSmall}>
                      Product ID: <span className={styles.mono}>{detail.product.id}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.detailCounts}>
                  <div className={styles.countCard}>
                    <div className={styles.mutedSmall}>Favorite Count</div>
                    <div className={styles.countValue}>
                      <FiStar /> {safeNum(detail.counts?.favorite_count, 0)}
                    </div>
                  </div>
                  <div className={styles.countCard}>
                    <div className={styles.mutedSmall}>Distinct Users</div>
                    <div className={styles.countValue}>
                      <FiUsers /> {safeNum(detail.counts?.distinct_users, 0)}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.detailPager}>
                <button
                  className={styles.pagerBtn}
                  type="button"
                  onClick={() => loadDetailPage(Math.max(0, dOffset - dLimit))}
                  disabled={busy || detailLoading || !dCanPrev}
                >
                  <FiChevronLeft />
                </button>
                <div className={styles.pagerInfo}>
                  Offset <span className={styles.mono}>{dOffset}</span> • Limit{" "}
                  <span className={styles.mono}>{dLimit}</span> • Showing{" "}
                  <span className={styles.mono}>{detail.items?.length || 0}</span>
                </div>
                <button
                  className={styles.pagerBtn}
                  type="button"
                  onClick={() => loadDetailPage(dOffset + dLimit)}
                  disabled={busy || detailLoading || !dCanNext}
                >
                  <FiChevronRight />
                </button>

                <select className={styles.select} value={String(dLimit)} onChange={(e) => { setDLimit(Number(e.target.value)); setDOffset(0); loadDetailPage(0); }}>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="75">75</option>
                  <option value="100">100</option>
                  <option value="150">150</option>
                  <option value="200">200</option>
                </select>
              </div>

              <div className={styles.usersWrap}>
                {Array.isArray(detail.items) && detail.items.length ? (
                  detail.items.map((u) => (
                    <div key={u.favorite_id} className={styles.userCard}>
                      <div className={styles.userTop}>
                        <div className={styles.userName}>
                          {u.user_name || u.user_username || "User"}
                        </div>
                        <div className={styles.mutedSmall}>
                          user_id <span className={styles.mono}>{u.user_id}</span>
                        </div>
                      </div>

                      <div className={styles.userMeta}>
                        <div className={styles.mutedSmall}>Username: <b>{u.user_username || "—"}</b></div>
                        <div className={styles.mutedSmall}>Email: <b>{u.user_email || "—"}</b></div>
                        <div className={styles.mutedSmall}>Favorited: {fmtDate(u.favorited_at)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.centerMuted}>No users found.</div>
                )}
              </div>
            </>
          )}
        </Modal>
      </div>
    </>
  );
}
