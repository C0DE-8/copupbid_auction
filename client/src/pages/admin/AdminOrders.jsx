// src/pages/admin/AdminOrders.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import styles from "./AdminOrders.module.css";
import AdminNavbar from "../../components/admin/Navbar";
import { ToastProvider, useToast } from "../../components/ui/Toaster";
import Modal from "../../components/ui/Modal";

import {
  FiRefreshCw,
  FiSearch,
  FiEye,
  FiSave,
  FiTruck,
  FiCalendar,
  FiHash,
  FiUser,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";

const STATUSES = ["pending", "paid", "processing", "in_transit", "delivered", "cancelled"];

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function fmtMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
}

function fmtDate(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

export default function AdminOrders() {
  return (
    <ToastProvider>
      <AdminOrdersInner />
    </ToastProvider>
  );
}

function AdminOrdersInner() {
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // filters
  const [filters, setFilters] = useState({
    status: "",
    userId: "",
  });

  // paging (limit/offset style like your API)
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  const [items, setItems] = useState([]);
  const totalShown = items.length;

  // confirm modal (reuse your Modal)
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    subtitle: "",
    message: "",
    tone: "warn", // warn | danger | primary
    confirmText: "Confirm",
    cancelText: "Cancel",
    action: null,
  });

  const openConfirm = (cfg) => {
    setConfirm({
      open: true,
      title: cfg.title || "Are you sure?",
      subtitle: cfg.subtitle || "",
      message: cfg.message || "Proceed?",
      tone: cfg.tone || "warn",
      confirmText: cfg.confirmText || "Confirm",
      cancelText: cfg.cancelText || "Cancel",
      action: typeof cfg.action === "function" ? cfg.action : null,
    });
  };

  const closeConfirm = () => {
    if (busy) return;
    setConfirm((p) => ({ ...p, open: false, action: null }));
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const params = {
        limit,
        offset,
      };

      if (filters.status) params.status = filters.status;
      if (String(filters.userId || "").trim()) params.userId = String(filters.userId).trim();

      const res = await api.get("/admin/orders", { params });

      setItems(res.data?.items || []);
    } catch (err) {
      console.error("Fetch orders error:", err);
      toast.error(err?.response?.data?.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset]);

  // when filters change, reset offset then fetch
  useEffect(() => {
    setOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.userId, limit]);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.userId]);

  const nextPage = () => setOffset((o) => o + limit);
  const prevPage = () => setOffset((o) => Math.max(0, o - limit));

  // order detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null); // { order, items }

  // draft update fields for PATCH /orders/:id/status
  const [draft, setDraft] = useState({
    status: "",
    tracking_number: "",
    carrier: "",
    expected_delivery: "",
  });

  const openDetail = async (id) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetail(null);

      const res = await api.get(`/admin/orders/${id}`);
      const payload = res.data || null;

      setDetail(payload);

      const o = payload?.order || {};
      setDraft({
        status: o?.status || "",
        tracking_number: o?.tracking_number || "",
        carrier: o?.carrier || "",
        expected_delivery: o?.expected_delivery || "",
      });
    } catch (err) {
      console.error("Order detail error:", err);
      toast.error(err?.response?.data?.message || "Failed to load order");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    if (busy) return;
    setDetailOpen(false);
    setDetail(null);
  };

  const hasDraftChanges = useMemo(() => {
    const o = detail?.order;
    if (!o) return false;
    return (
      String(draft.status || "") !== String(o.status || "") ||
      String(draft.tracking_number || "") !== String(o.tracking_number || "") ||
      String(draft.carrier || "") !== String(o.carrier || "") ||
      String(draft.expected_delivery || "") !== String(o.expected_delivery || "")
    );
  }, [draft, detail]);

  const buildPatchPayload = () => {
    const o = detail?.order;
    if (!o) return null;

    const payload = {};

    if (draft.status !== String(o.status || "")) payload.status = String(draft.status || "").toLowerCase();

    // allow clearing by sending empty => backend turns to null
    if (draft.tracking_number !== String(o.tracking_number || ""))
      payload.tracking_number = String(draft.tracking_number || "");

    if (draft.carrier !== String(o.carrier || "")) payload.carrier = String(draft.carrier || "");

    if (draft.expected_delivery !== String(o.expected_delivery || ""))
      payload.expected_delivery = String(draft.expected_delivery || "");

    return payload;
  };

  const submitUpdate = async () => {
    const o = detail?.order;
    if (!o?.id) return;

    const payload = buildPatchPayload();
    if (!payload || Object.keys(payload).length === 0) return toast.warn("Nothing to update");

    // basic client guard (your backend does real validation)
    if (payload.status && !STATUSES.includes(String(payload.status))) {
      return toast.error("Invalid status");
    }

    try {
      setBusy(true);
      await api.patch(`/admin/orders/${o.id}/status`, payload);
      toast.success("Order updated");

      // refresh detail + list
      await openDetail(o.id);
      await fetchOrders();
    } catch (err) {
      console.error("Update order error:", err);
      toast.error(err?.response?.data?.message || "Failed to update order");
    } finally {
      setBusy(false);
      closeConfirm();
    }
  };

  const confirmUpdate = () => {
    const o = detail?.order;
    if (!o?.id) return;

    openConfirm({
      title: `Update Order #${o.id}?`,
      subtitle: "PATCH /api/admin/orders/:id/status",
      tone: "warn",
      confirmText: "Yes, update",
      cancelText: "Cancel",
      message: "This will update the order status/shipping fields.",
      action: submitUpdate,
    });
  };

  const statusBadgeClass = (s) => {
    const k = String(s || "").toLowerCase();
    if (k === "delivered") return styles.badgeGood;
    if (k === "cancelled") return styles.badgeBad;
    if (k === "in_transit") return styles.badgeInfo;
    if (k === "processing") return styles.badgeWarn;
    if (k === "paid") return styles.badgeSoft;
    return styles.badgeSoft;
  };

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
                <h2 className={styles.title}>Orders</h2>
                <p className={styles.sub}>View and manage shop orders (status + shipping updates).</p>
              </div>
            </div>

            <div className={styles.headerActions}>
              <button className={styles.softBtn} type="button" onClick={fetchOrders} disabled={busy || loading}>
                <FiRefreshCw /> Refresh
              </button>
            </div>
          </header>

          <section className={styles.tools}>
            <div className={styles.searchWrap}>
              <FiSearch className={styles.searchIcon} />
              <input
                className={styles.input}
                placeholder="Filter by userId…"
                value={filters.userId}
                onChange={(e) => setFilters((p) => ({ ...p, userId: e.target.value }))}
              />
            </div>

            <select
              className={styles.select}
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="">All Status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select className={styles.select} value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="75">75</option>
              <option value="100">100</option>
              <option value="150">150</option>
              <option value="200">200</option>
            </select>

            <div className={styles.pager}>
              <button className={styles.pagerBtn} type="button" onClick={prevPage} disabled={busy || loading || offset <= 0}>
                ‹
              </button>
              <div className={styles.pagerInfo}>
                Offset <span className={styles.mono}>{offset}</span> • Limit{" "}
                <span className={styles.mono}>{limit}</span> • Showing{" "}
                <span className={styles.mono}>{totalShown}</span>
                {loading ? " • Loading…" : ""}
              </div>
              <button
                className={styles.pagerBtn}
                type="button"
                onClick={nextPage}
                disabled={busy || loading || items.length < limit}
                title={items.length < limit ? "No more results" : "Next"}
              >
                ›
              </button>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardTitle}>Order List</div>
              <div className={styles.mutedSmall}>GET /api/admin/orders</div>
            </div>

            {loading ? (
              <div className={styles.centerMuted}>Loading orders…</div>
            ) : items.length === 0 ? (
              <div className={styles.centerMuted}>No orders found.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User</th>
                      <th>Customer</th>
                      <th>Subtotal</th>
                      <th>Items</th>
                      <th>Status</th>
                      <th>Shipping</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((o) => (
                      <tr key={o.id}>
                        <td className={styles.mono}>#{o.id}</td>

                        <td>
                          <div className={styles.cellTitle}>
                            <FiUser /> {o.username || "—"}
                          </div>
                          <div className={styles.mutedSmall}>
                            user_id <span className={styles.mono}>{o.user_id}</span> • {o.email || "—"}
                          </div>
                        </td>

                        <td>
                          <div className={styles.cellTitle}>{o.customer_name || o.full_name || "—"}</div>
                          <div className={styles.mutedSmall}>{o.phone_number || "—"}</div>
                        </td>

                        <td className={styles.mono}>{fmtMoney(o.subtotal)}</td>
                        <td className={styles.mono}>{safeNum(o.items_count, 0)}</td>

                        <td>
                          <span className={statusBadgeClass(o.status)}>{String(o.status || "").toLowerCase()}</span>
                        </td>

                        <td>
                          <div className={styles.mutedSmall}>
                            <FiHash /> {o.tracking_number || "—"}
                          </div>
                          <div className={styles.mutedSmall}>
                            <FiTruck /> {o.carrier || "—"}
                          </div>
                          <div className={styles.mutedSmall}>
                            <FiCalendar /> {o.expected_delivery || "—"}
                          </div>
                        </td>

                        <td className={styles.mutedSmall}>{fmtDate(o.created_at)}</td>

                        <td className={styles.actions}>
                          <button className={styles.softBtnSmall} type="button" disabled={busy} onClick={() => openDetail(o.id)}>
                            <FiEye /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* DETAIL MODAL */}
        <Modal
          open={detailOpen}
          title={`Order Details${detail?.order?.id ? ` #${detail.order.id}` : ""}`}
          subtitle="GET /api/admin/orders/:id"
          onClose={closeDetail}
          disableClose={busy}
          size="lg"
          footer={
            <>
              <button className={styles.softBtn} type="button" onClick={closeDetail} disabled={busy}>
                Close
              </button>
              <button className={styles.primaryBtn} type="button" onClick={confirmUpdate} disabled={busy || !hasDraftChanges}>
                <FiSave /> {busy ? "Saving…" : "Save Updates"}
              </button>
            </>
          }
        >
          {detailLoading ? (
            <div className={styles.centerMuted}>Loading…</div>
          ) : !detail?.order ? (
            <div className={styles.centerMuted}>No data.</div>
          ) : (
            <>
              <div className={styles.detailGrid}>
                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>User</div>
                  <div className={styles.infoValue}>
                    <b>{detail.order.username || "—"}</b> • {detail.order.email || "—"}
                    <div className={styles.mutedSmall}>
                      user_id <span className={styles.mono}>{detail.order.user_id}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Customer</div>
                  <div className={styles.infoValue}>
                    {detail.order.customer_name || detail.order.full_name || "—"}
                    <div className={styles.mutedSmall}>{detail.order.phone_number || "—"}</div>
                  </div>
                </div>

                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Address</div>
                  <div className={styles.infoValue}>{detail.order.address || "—"}</div>
                </div>

                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Notes</div>
                  <div className={styles.infoValue}>{detail.order.notes || "—"}</div>
                </div>
              </div>

              <div className={styles.detailGrid2}>
                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Subtotal</div>
                  <div className={styles.infoValue}>
                    <span className={styles.mono}>{fmtMoney(detail.order.subtotal)}</span>
                  </div>
                </div>

                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Items Count</div>
                  <div className={styles.infoValue}>
                    <span className={styles.mono}>{safeNum(detail.order.items_count, 0)}</span>
                  </div>
                </div>

                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Status</div>
                  <div className={styles.infoValue}>
                    <span className={statusBadgeClass(draft.status)}>{draft.status}</span>
                  </div>
                </div>

                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Created</div>
                  <div className={styles.infoValue}>{fmtDate(detail.order.created_at)}</div>
                </div>
              </div>

              <div className={styles.sectionTitle}>Update Shipping / Status</div>

              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label}>Status</label>
                  <select
                    className={styles.select}
                    value={draft.status}
                    onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))}
                    disabled={busy}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Tracking Number</label>
                  <input
                    className={styles.input}
                    value={draft.tracking_number}
                    onChange={(e) => setDraft((p) => ({ ...p, tracking_number: e.target.value }))}
                    placeholder="e.g. TRK-00123"
                    disabled={busy}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Carrier</label>
                  <input
                    className={styles.input}
                    value={draft.carrier}
                    onChange={(e) => setDraft((p) => ({ ...p, carrier: e.target.value }))}
                    placeholder="e.g. DHL"
                    disabled={busy}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Expected Delivery</label>
                  <input
                    className={styles.input}
                    value={draft.expected_delivery}
                    onChange={(e) => setDraft((p) => ({ ...p, expected_delivery: e.target.value }))}
                    placeholder="YYYY-MM-DD or text"
                    disabled={busy}
                  />
                </div>
              </div>

              <div className={styles.sectionTitle}>Order Items</div>

              {Array.isArray(detail.items) && detail.items.length ? (
                <div className={styles.itemsWrap}>
                  {detail.items.map((it) => (
                    <div key={it.id} className={styles.itemCard}>
                      <div className={styles.itemTop}>
                        <div className={styles.itemName}>{it.product_name || "Item"}</div>
                        <span className={styles.badgeSoft}>{it.mode || "—"}</span>
                      </div>

                      <div className={styles.itemMeta}>
                        <span className={styles.mutedSmall}>product_id</span>{" "}
                        <span className={styles.mono}>{it.product_id}</span>
                      </div>

                      <div className={styles.itemGrid}>
                        <div className={styles.mutedSmall}>
                          Qty: <span className={styles.mono}>{safeNum(it.qty, 0)}</span>
                        </div>
                        <div className={styles.mutedSmall}>
                          Price: <span className={styles.mono}>{fmtMoney(it.price)}</span>
                        </div>
                        <div className={styles.mutedSmall}>
                          Subtotal: <span className={styles.mono}>{fmtMoney(it.subtotal)}</span>
                        </div>
                      </div>

                      <div className={styles.mutedSmall}>Created: {fmtDate(it.created_at)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.centerMuted}>No items.</div>
              )}

              {!hasDraftChanges ? (
                <div className={styles.tipRow}>
                  <span className={styles.badgeGood}>
                    <FiCheckCircle /> No unsaved changes
                  </span>
                </div>
              ) : (
                <div className={styles.tipRow}>
                  <span className={styles.badgeWarn}>
                    <FiXCircle /> You have unsaved changes
                  </span>
                </div>
              )}
            </>
          )}
        </Modal>

        {/* CONFIRM MODAL */}
        <Modal
          open={confirm.open}
          title={confirm.title}
          subtitle={confirm.subtitle}
          size="sm"
          onClose={closeConfirm}
          disableClose={busy}
          closeOnOverlay={!busy}
          footer={
            <>
              <button className={styles.softBtn} type="button" onClick={closeConfirm} disabled={busy}>
                {confirm.cancelText}
              </button>
              <button className={styles.warnBtn} type="button" disabled={busy} onClick={() => confirm.action?.()}>
                {busy ? "Please wait…" : confirm.confirmText}
              </button>
            </>
          }
        >
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ color: "rgba(233,233,255,.92)", fontWeight: 800 }}>{confirm.message}</div>
            <div style={{ color: "rgba(233,233,255,.62)", fontSize: 12 }}>
              This calls PATCH /api/admin/orders/:id/status and updates only provided fields.
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}