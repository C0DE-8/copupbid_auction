// src/pages/admin/AdminCoinPay.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api, imgUrl } from "../../lib/api";
import styles from "./AdminCoinPay.module.css";
import AdminNavbar from "../../components/admin/Navbar";
import { ToastProvider, useToast } from "../../components/ui/Toaster";
import Modal from "../../components/ui/Modal";

import {
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiFilter,
  FiSearch,
  FiEye,
  FiUser,
  FiDollarSign,
  FiImage,
  FiX,
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

function fmtMoney(v, currency = "₦") {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  try {
    return `${currency}${n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  } catch {
    return `${currency}${n}`;
  }
}

const STATUS_OPTIONS = ["", "pending", "approved", "rejected"];

export default function AdminCoinPay() {
  return (
    <ToastProvider>
      <AdminCoinPayInner />
    </ToastProvider>
  );
}

function AdminCoinPayInner() {
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({
    status: "",
    q: "",
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  // ✅ proof viewer modal
  const [proofViewer, setProofViewer] = useState({
    open: false,
    src: "",
    title: "Proof Preview",
    meta: "",
  });

  const openProofViewer = (src, title = "Proof Preview", meta = "") => {
    const s = imgUrl(src);
    if (!s) return;
    setProofViewer({ open: true, src: s, title, meta });
  };

  const closeProofViewer = () => {
    if (busy) return;
    setProofViewer((p) => ({ ...p, open: false, src: "" }));
  };

  // confirm modal (approve/reject)
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    subtitle: "",
    message: "",
    tone: "warn",
    confirmText: "Confirm",
    cancelText: "Cancel",
    action: null,
  });

  const openConfirm = (cfg) => {
    setConfirm({
      open: true,
      title: cfg.title || "Are you sure?",
      subtitle: cfg.subtitle || "",
      message: cfg.message || "This action cannot be undone.",
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

  // note modal
  const [noteModal, setNoteModal] = useState({
    open: false,
    purchase: null,
    action: "approve",
    admin_note: "",
  });

  const closeNoteModal = () => {
    if (busy) return;
    setNoteModal({ open: false, purchase: null, action: "approve", admin_note: "" });
  };

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;

      const res = await api.get("/admin/coin-purchases", { params });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch coin purchases error:", err);
      toast.error(err?.response?.data?.message || "Failed to fetch coin purchases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status]);

  const filtered = useMemo(() => {
    const q = String(filters.q || "").trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
      const hay = [
        r?.username,
        r?.email,
        r?.user_id,
        r?.id,
        r?.status,
        r?.coins,
        r?.total_price,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, filters.q]);

  const counts = useMemo(() => {
    const c = { all: rows.length, pending: 0, approved: 0, rejected: 0 };
    for (const r of rows) {
      const s = String(r?.status || "").toLowerCase();
      if (s === "pending") c.pending += 1;
      if (s === "approved") c.approved += 1;
      if (s === "rejected") c.rejected += 1;
    }
    return c;
  }, [rows]);

  const totals = useMemo(() => {
    let coinsAll = 0;
    let amountAll = 0;
    let coinsPending = 0;
    for (const r of rows) {
      const coins = safeNum(r?.coins, 0);
      const amt = safeNum(r?.total_price, 0);
      coinsAll += coins;
      amountAll += amt;
      if (String(r?.status || "").toLowerCase() === "pending") coinsPending += coins;
    }
    return { coinsAll, amountAll, coinsPending };
  }, [rows]);

  const openDetails = (p) => {
    setDetail(p);
    setDetailOpen(true);
  };

  const closeDetails = () => {
    if (busy) return;
    setDetailOpen(false);
    setDetail(null);
  };

  const submitAction = async ({ purchaseId, action, admin_note }) => {
    try {
      setBusy(true);
      await api.patch(`/admin/coin-purchases/${purchaseId}`, {
        action,
        admin_note: admin_note || null,
      });

      toast.success(action === "approve" ? "Purchase approved (coins credited)" : "Purchase rejected");
      closeNoteModal();
      closeConfirm();
      await fetchPurchases();
    } catch (err) {
      console.error("Update coin purchase error:", err);
      toast.error(err?.response?.data?.message || "Failed to update coin purchase");
    } finally {
      setBusy(false);
    }
  };

  const askAction = (purchase, action) => {
    setNoteModal({
      open: true,
      purchase,
      action,
      admin_note: purchase?.admin_note || "",
    });
  };

  const confirmAction = () => {
    const p = noteModal.purchase;
    if (!p) return;

    const action = noteModal.action;
    const purchaseId = p.id;

    openConfirm({
      title: action === "approve" ? "Approve this coin purchase?" : "Reject this coin purchase?",
      subtitle: `PATCH /api/admin/coin-purchases/${purchaseId}`,
      tone: action === "approve" ? "warn" : "danger",
      confirmText: action === "approve" ? "Yes, approve" : "Yes, reject",
      cancelText: "Cancel",
      message:
        action === "approve"
          ? `Approve purchase #${purchaseId} and credit ${safeNum(p.coins, 0)} coin(s) to the user.`
          : `Reject purchase #${purchaseId}. No coins will be credited.`,
      action: async () => {
        await submitAction({
          purchaseId,
          action,
          admin_note: noteModal.admin_note,
        });
      },
    });
  };

  return (
    <>
      <AdminNavbar />

      <div className={styles.page}>
        <div className={styles.bgGlow} />

        <div className={styles.container}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.titleWrap}>
              <button className={styles.backBtn} type="button" onClick={() => window.history.back()}>
                ← Back
              </button>

              <div>
                <h2 className={styles.title}>Coin Purchases</h2>
                <p className={styles.sub}>
                  Review proof uploads and approve/reject coin purchases. Approving credits user bid_points.
                </p>
              </div>
            </div>

            <div className={styles.headerActions}>
              <button
                className={styles.softBtn}
                type="button"
                onClick={fetchPurchases}
                disabled={busy || loading}
                title="Refresh purchases"
              >
                <FiRefreshCw />
                Refresh
              </button>
            </div>
          </header>

          {/* Stats */}
          <section className={styles.stats}>
            <div className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={styles.statIcon}>
                  <FiDollarSign />
                </span>
                <span className={styles.statLabel}>Total Purchases</span>
              </div>
              <div className={styles.statValue}>{counts.all}</div>
              <div className={styles.statSub}>
                Total coins: <span className={styles.mono}>{totals.coinsAll}</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={`${styles.statIcon} ${styles.iWarn}`}>
                  <FiFilter />
                </span>
                <span className={styles.statLabel}>Pending</span>
              </div>
              <div className={styles.statValue}>{counts.pending}</div>
              <div className={styles.statSub}>
                Pending coins: <span className={styles.mono}>{totals.coinsPending}</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={`${styles.statIcon} ${styles.iGood}`}>
                  <FiCheckCircle />
                </span>
                <span className={styles.statLabel}>Approved</span>
              </div>
              <div className={styles.statValue}>{counts.approved}</div>
              <div className={styles.statSub}>Approved = credited</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={`${styles.statIcon} ${styles.iBad}`}>
                  <FiXCircle />
                </span>
                <span className={styles.statLabel}>Rejected</span>
              </div>
              <div className={styles.statValue}>{counts.rejected}</div>
              <div className={styles.statSub}>Rejected = no credit</div>
            </div>
          </section>

          {/* Tools */}
          <section className={styles.tools}>
            <div className={styles.searchWrap}>
              <FiSearch className={styles.searchIcon} />
              <input
                className={styles.input}
                placeholder="Search username / email / user_id / purchase_id / coins…"
                value={filters.q}
                onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
              />
            </div>

            <select
              className={styles.select}
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              title="Filter by status"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.filter(Boolean).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <div className={styles.rightHint}>
              {loading ? "Loading…" : `Showing ${filtered.length} purchase(s)`}
            </div>
          </section>

          {/* List */}
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardTitle}>Purchase Requests</div>
              <div className={styles.mutedSmall}>GET /api/admin/coin-purchases</div>
            </div>

            {loading ? (
              <div className={styles.centerMuted}>Loading purchases…</div>
            ) : filtered.length === 0 ? (
              <div className={styles.centerMuted}>No purchases found.</div>
            ) : (
              <div className={styles.list}>
                {filtered.map((p) => {
                  const status = String(p?.status || "").toLowerCase();
                  const isPending = status === "pending";
                  const hasProof = Boolean(p?.proof_image);
                  const proofSrc = hasProof ? imgUrl(p.proof_image) : "";

                  return (
                    <div key={p.id} className={styles.itemCard}>
                      <div className={styles.itemTop}>
                        <div className={styles.itemTitle}>
                          <span className={styles.mono}>Purchase #{p.id}</span>
                          <span className={`${styles.badge} ${styles[`st_${status}`] || styles.badgeSoft}`}>
                            {status || "—"}
                          </span>

                          {hasProof ? (
                            <span className={`${styles.badgeSoft} ${styles.proofBadge}`}>
                              <FiImage /> proof
                            </span>
                          ) : (
                            <span className={styles.badgeSoft}>no proof</span>
                          )}
                        </div>

                        <div className={styles.itemMeta}>
                          <div className={styles.metaLine}>
                            Created: <span className={styles.mono}>{fmtDate(p.created_at)}</span>
                          </div>
                          <div className={styles.metaLine}>
                            Updated: <span className={styles.mono}>{fmtDate(p.updated_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* ✅ Proof preview in list opens modal */}
                      {hasProof ? (
                        <div className={styles.proofMiniRow}>
                          <button
                            type="button"
                            className={styles.proofMiniBtn}
                            onClick={() =>
                              openProofViewer(
                                p.proof_image,
                                `Proof — Purchase #${p.id}`,
                                `${p.username || "—"} • ${fmtMoney(p.total_price, "₦")}`
                              )
                            }
                            disabled={busy}
                            title="Preview proof"
                          >
                            <FiEye /> Preview proof
                          </button>

                          <button
                            type="button"
                            className={styles.proofThumbBtn}
                            onClick={() =>
                              openProofViewer(
                                p.proof_image,
                                `Proof — Purchase #${p.id}`,
                                `${p.username || "—"} • ${fmtMoney(p.total_price, "₦")}`
                              )
                            }
                            disabled={busy}
                            title="Preview proof"
                          >
                            <img
                              className={styles.proofMiniImg}
                              src={proofSrc}
                              alt="Proof"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </button>
                        </div>
                      ) : null}

                      <div className={styles.gridInfo}>
                        <div className={styles.infoBox}>
                          <div className={styles.infoLabel}>
                            <FiUser /> User
                          </div>
                          <div className={styles.infoValue}>
                            <b>{p.username || "—"}</b>
                            <div className={styles.mutedSmall}>
                              {p.email || "—"} • user_id <span className={styles.mono}>{p.user_id}</span>
                            </div>
                          </div>
                        </div>

                        <div className={styles.infoBox}>
                          <div className={styles.infoLabel}>Coins</div>
                          <div className={styles.infoValue}>
                            <span className={styles.big}>{safeNum(p.coins, 0)}</span>
                          </div>
                        </div>

                        <div className={styles.infoBox}>
                          <div className={styles.infoLabel}>Pricing</div>
                          <div className={styles.infoValue}>
                            <div className={styles.priceRow}>
                              <span className={styles.mutedSmall}>Unit:</span>{" "}
                              <span className={styles.mono}>{fmtMoney(p.unit_price, "₦")}</span>
                            </div>
                            <div className={styles.priceRow}>
                              <span className={styles.mutedSmall}>Total:</span>{" "}
                              <span className={styles.mono}>{fmtMoney(p.total_price, "₦")}</span>
                            </div>
                          </div>
                        </div>

                        <div className={styles.infoBox}>
                          <div className={styles.infoLabel}>Admin Note</div>
                          <div className={styles.infoValue}>
                            {p.admin_note ? (
                              <span className={styles.noteText}>{p.admin_note}</span>
                            ) : (
                              <span className={styles.mutedSmall}>—</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {p.user_note ? (
                        <div className={styles.userNoteBar}>
                          <div className={styles.userNoteLabel}>User note</div>
                          <div className={styles.userNoteText}>{p.user_note}</div>
                        </div>
                      ) : null}

                      <div className={styles.actionsRow}>
                        <button
                          className={styles.softBtnSmall}
                          type="button"
                          disabled={busy}
                          onClick={() => openDetails(p)}
                        >
                          <FiEye /> View
                        </button>

                        <div className={styles.spacer} />

                        <button
                          className={styles.warnBtnSmall}
                          type="button"
                          disabled={busy || !isPending}
                          title={!isPending ? "Only pending purchases can be approved" : "Approve purchase"}
                          onClick={() => askAction(p, "approve")}
                        >
                          <FiCheckCircle /> Approve
                        </button>

                        <button
                          className={styles.dangerBtnSmall}
                          type="button"
                          disabled={busy || !isPending}
                          title={!isPending ? "Only pending purchases can be rejected" : "Reject purchase"}
                          onClick={() => askAction(p, "reject")}
                        >
                          <FiXCircle /> Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Detail Modal */}
        <Modal
          open={detailOpen}
          title={`Coin Purchase Details${detail?.id ? ` #${detail.id}` : ""}`}
          subtitle="From GET /api/admin/coin-purchases"
          onClose={closeDetails}
          disableClose={busy}
          size="lg"
          footer={
            <button className={styles.softBtn} type="button" onClick={closeDetails} disabled={busy}>
              Close
            </button>
          }
        >
          {!detail ? (
            <div className={styles.centerMuted}>No data.</div>
          ) : (
            <div className={styles.detailWrap}>
              <div className={styles.detailGrid}>
                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Status</div>
                  <div className={styles.infoValue}>
                    <span
                      className={`${styles.badge} ${
                        styles[`st_${String(detail.status || "").toLowerCase()}`] || styles.badgeSoft
                      }`}
                    >
                      {detail.status}
                    </span>
                  </div>
                </div>

                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Coins</div>
                  <div className={styles.infoValue}>
                    <span className={styles.big}>{safeNum(detail.coins, 0)}</span>
                  </div>
                </div>

                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>User</div>
                  <div className={styles.infoValue}>
                    {detail.username || "—"} • {detail.email || "—"} •{" "}
                    <span className={styles.mono}>{detail.user_id}</span>
                  </div>
                </div>

                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Pricing</div>
                  <div className={styles.infoValue}>
                    Unit: <span className={styles.mono}>{fmtMoney(detail.unit_price, "₦")}</span>
                    <br />
                    Total: <span className={styles.mono}>{fmtMoney(detail.total_price, "₦")}</span>
                  </div>
                </div>

                <div className={styles.infoBox} style={{ gridColumn: "1 / -1" }}>
                  <div className={styles.infoLabel}>Proof</div>
                  <div className={styles.infoValue}>
                    {detail.proof_image ? (
                      <div className={styles.proofWrap}>
                        <button
                          type="button"
                          className={styles.proofOpenBtn}
                          disabled={busy}
                          onClick={() =>
                            openProofViewer(
                              detail.proof_image,
                              `Proof — Purchase #${detail.id}`,
                              `${detail.username || "—"} • ${fmtMoney(detail.total_price, "₦")}`
                            )
                          }
                        >
                          <FiEye /> Preview proof
                        </button>

                        <button
                          type="button"
                          className={styles.proofImgBtn}
                          disabled={busy}
                          onClick={() =>
                            openProofViewer(
                              detail.proof_image,
                              `Proof — Purchase #${detail.id}`,
                              `${detail.username || "—"} • ${fmtMoney(detail.total_price, "₦")}`
                            )
                          }
                          title="Preview proof"
                        >
                          <img
                            className={styles.proofImg}
                            src={imgUrl(detail.proof_image)}
                            alt="Proof"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </button>
                      </div>
                    ) : (
                      <span className={styles.mutedSmall}>No proof uploaded.</span>
                    )}
                  </div>
                </div>

                <div className={styles.infoBox} style={{ gridColumn: "1 / -1" }}>
                  <div className={styles.infoLabel}>User Note</div>
                  <div className={styles.infoValue}>
                    {detail.user_note ? detail.user_note : <span className={styles.mutedSmall}>—</span>}
                  </div>
                </div>

                <div className={styles.infoBox} style={{ gridColumn: "1 / -1" }}>
                  <div className={styles.infoLabel}>Admin Note</div>
                  <div className={styles.infoValue}>
                    {detail.admin_note ? detail.admin_note : <span className={styles.mutedSmall}>—</span>}
                  </div>
                </div>

                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Approved At</div>
                  <div className={styles.infoValue}>{fmtDate(detail.approved_at)}</div>
                </div>

                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Created</div>
                  <div className={styles.infoValue}>{fmtDate(detail.created_at)}</div>
                </div>

                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Updated</div>
                  <div className={styles.infoValue}>{fmtDate(detail.updated_at)}</div>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Note Modal */}
        <Modal
          open={noteModal.open}
          title={
            noteModal.action === "approve"
              ? `Approve Purchase #${noteModal.purchase?.id || ""}`
              : `Reject Purchase #${noteModal.purchase?.id || ""}`
          }
          subtitle={
            noteModal.action === "approve"
              ? "PATCH /api/admin/coin-purchases/:id  { action:'approve', admin_note }"
              : "PATCH /api/admin/coin-purchases/:id  { action:'reject', admin_note }"
          }
          onClose={closeNoteModal}
          disableClose={busy}
          size="md"
          footer={
            <>
              <button className={styles.softBtn} type="button" onClick={closeNoteModal} disabled={busy}>
                Cancel
              </button>
              <button
                className={noteModal.action === "approve" ? styles.warnBtn : styles.dangerBtn}
                type="button"
                disabled={busy}
                onClick={confirmAction}
              >
                {noteModal.action === "approve" ? "Continue (Approve)" : "Continue (Reject)"}
              </button>
            </>
          }
        >
          {!noteModal.purchase ? (
            <div className={styles.centerMuted}>No purchase selected.</div>
          ) : (
            <div className={styles.noteWrap}>
              <div className={styles.noteSummary}>
                <div>
                  <div className={styles.noteLine}>
                    <span className={styles.badgeSoft}>Purchase</span>{" "}
                    <span className={styles.mono}>#{noteModal.purchase.id}</span>
                  </div>
                  <div className={styles.noteLine}>
                    <span className={styles.badgeSoft}>User</span>{" "}
                    <b>{noteModal.purchase.username || "—"}</b>{" "}
                    <span className={styles.mutedSmall}>({noteModal.purchase.email || "—"})</span>
                  </div>
                </div>

                <div className={styles.noteRight}>
                  <div className={styles.noteLine}>
                    <span className={styles.badgeSoft}>Coins</span>{" "}
                    <span className={styles.mono}>{safeNum(noteModal.purchase.coins, 0)}</span>
                  </div>
                  <div className={styles.noteLine}>
                    <span className={styles.badgeSoft}>Total</span>{" "}
                    <span className={styles.mono}>{fmtMoney(noteModal.purchase.total_price, "₦")}</span>
                  </div>
                </div>
              </div>

              <label className={styles.label}>Admin note (optional)</label>
              <textarea
                className={styles.textarea}
                rows={4}
                value={noteModal.admin_note}
                onChange={(e) => setNoteModal((p) => ({ ...p, admin_note: e.target.value }))}
                placeholder="Write a note for this action…"
                disabled={busy}
              />

              <div className={styles.noteHint}>
                {noteModal.action === "approve"
                  ? "Approving will set status to APPROVED and credit coins to the user."
                  : "Rejecting will set status to REJECTED and will not credit coins."}
              </div>
            </div>
          )}
        </Modal>

        {/* Confirm Modal */}
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

              <button
                className={
                  confirm.tone === "danger"
                    ? styles.dangerBtnSmall
                    : confirm.tone === "warn"
                    ? styles.warnBtnSmall
                    : styles.primaryBtnSmall
                }
                type="button"
                disabled={busy}
                onClick={() => {
                  if (typeof confirm.action === "function") confirm.action();
                }}
              >
                {busy ? "Please wait…" : confirm.confirmText}
              </button>
            </>
          }
        >
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ color: "rgba(233,233,255,.92)", fontWeight: 700 }}>{confirm.message}</div>
            <div style={{ color: "rgba(233,233,255,.62)", fontSize: 12 }}>
              Tip: Only <b>pending</b> purchases can be approved/rejected.
            </div>
          </div>
        </Modal>

        {/* ✅ Proof Viewer Modal */}
        <Modal
          open={proofViewer.open}
          title={proofViewer.title}
          subtitle={proofViewer.meta || "Proof image preview"}
          size="lg"
          onClose={closeProofViewer}
          disableClose={busy}
          footer={
            <button className={styles.softBtn} type="button" onClick={closeProofViewer} disabled={busy}>
              Close
            </button>
          }
        >
          {!proofViewer.src ? (
            <div className={styles.centerMuted}>No proof image.</div>
          ) : (
            <div className={styles.proofViewer}>
              <div className={styles.proofViewerTop}>
                <div className={styles.proofViewerHint}>
                  Click image to zoom in your browser • Best viewed in full screen
                </div>
                <button className={styles.proofViewerClose} type="button" onClick={closeProofViewer} disabled={busy}>
                  <FiX />
                </button>
              </div>

              <div className={styles.proofViewerBody}>
                <img
                  className={styles.proofViewerImg}
                  src={proofViewer.src}
                  alt="Proof Preview"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
}