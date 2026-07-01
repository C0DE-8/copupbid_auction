// src/pages/admin/AdminPayout.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import styles from "./AdminPayout.module.css";
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

const STATUS_OPTIONS = ["", "pending", "approved", "rejected"];

export default function AdminPayout() {
  return (
    <ToastProvider>
      <AdminPayoutInner />
    </ToastProvider>
  );
}

function AdminPayoutInner() {
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({
    status: "",
    q: "", // username/email/user_id
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  // confirm modal (approve/reject)
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
    payout: null,
    action: "approve", // approve | reject
    admin_note: "",
  });

  const closeNoteModal = () => {
    if (busy) return;
    setNoteModal({ open: false, payout: null, action: "approve", admin_note: "" });
  };

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;

      const res = await api.get("/admin/payouts", { params });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch payouts error:", err);
      toast.error(err?.response?.data?.message || "Failed to fetch payouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
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
        r?.bank_name,
        r?.account_name,
        r?.account_number,
        r?.status,
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

  const openDetails = (p) => {
    setDetail(p);
    setDetailOpen(true);
  };

  const closeDetails = () => {
    if (busy) return;
    setDetailOpen(false);
    setDetail(null);
  };

  const submitAction = async ({ payoutId, action, admin_note }) => {
    try {
      setBusy(true);
      await api.patch(`/admin/payouts/${payoutId}`, {
        action,
        admin_note: admin_note || null,
      });

      toast.success(action === "approve" ? "Payout approved" : "Payout rejected & refunded");
      closeNoteModal();
      closeConfirm();
      await fetchPayouts();
    } catch (err) {
      console.error("Update payout error:", err);
      toast.error(err?.response?.data?.message || "Failed to update payout");
    } finally {
      setBusy(false);
    }
  };

  const askAction = (payout, action) => {
    // open note modal first
    setNoteModal({
      open: true,
      payout,
      action,
      admin_note: payout?.admin_note || "",
    });
  };

  const confirmAction = () => {
    const p = noteModal.payout;
    if (!p) return;

    const action = noteModal.action;
    const payoutId = p.id;

    openConfirm({
      title: action === "approve" ? "Approve this payout?" : "Reject this payout?",
      subtitle: `PATCH /api/admin/payouts/${payoutId}`,
      tone: action === "approve" ? "warn" : "danger",
      confirmText: action === "approve" ? "Yes, approve" : "Yes, reject",
      cancelText: "Cancel",
      message:
        action === "approve"
          ? `Approve payout #${payoutId} for ${safeNum(p.bid_points, 0)} bid point(s).`
          : `Reject payout #${payoutId}. This will refund ${safeNum(p.bid_points, 0)} bid point(s) to the user.`,
      action: async () => {
        await submitAction({
          payoutId,
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
                <h2 className={styles.title}>Payout Management</h2>
                <p className={styles.sub}>
                  Review payout requests and approve or reject (reject refunds the reserved points).
                </p>
              </div>
            </div>

            <div className={styles.headerActions}>
              <button
                className={styles.softBtn}
                type="button"
                onClick={fetchPayouts}
                disabled={busy || loading}
                title="Refresh payouts"
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
                <span className={styles.statIcon}><FiDollarSign /></span>
                <span className={styles.statLabel}>Total Payouts</span>
              </div>
              <div className={styles.statValue}>{counts.all}</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={`${styles.statIcon} ${styles.iWarn}`}><FiFilter /></span>
                <span className={styles.statLabel}>Pending</span>
              </div>
              <div className={styles.statValue}>{counts.pending}</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={`${styles.statIcon} ${styles.iGood}`}><FiCheckCircle /></span>
                <span className={styles.statLabel}>Approved</span>
              </div>
              <div className={styles.statValue}>{counts.approved}</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statTop}>
                <span className={`${styles.statIcon} ${styles.iBad}`}><FiXCircle /></span>
                <span className={styles.statLabel}>Rejected</span>
              </div>
              <div className={styles.statValue}>{counts.rejected}</div>
            </div>
          </section>

          {/* Tools */}
          <section className={styles.tools}>
            <div className={styles.searchWrap}>
              <FiSearch className={styles.searchIcon} />
              <input
                className={styles.input}
                placeholder="Search username / email / user_id / bank…"
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
              {loading ? "Loading…" : `Showing ${filtered.length} payout(s)`}
            </div>
          </section>

          {/* List */}
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardTitle}>Payout Requests</div>
              <div className={styles.mutedSmall}>GET /api/admin/payouts</div>
            </div>

            {loading ? (
              <div className={styles.centerMuted}>Loading payouts…</div>
            ) : filtered.length === 0 ? (
              <div className={styles.centerMuted}>No payouts found.</div>
            ) : (
              <div className={styles.list}>
                {filtered.map((p) => {
                  const status = String(p?.status || "").toLowerCase();
                  const isPending = status === "pending";

                  return (
                    <div key={p.id} className={styles.payoutCard}>
                      <div className={styles.payoutTop}>
                        <div className={styles.payoutTitle}>
                          <span className={styles.mono}>Payout #{p.id}</span>
                          <span
                            className={`${styles.badge} ${
                              styles[`st_${status}`] || styles.badgeSoft
                            }`}
                          >
                            {status || "—"}
                          </span>
                        </div>

                        <div className={styles.payoutMeta}>
                          <div className={styles.metaLine}>
                            Created: <span className={styles.mono}>{fmtDate(p.created_at)}</span>
                          </div>
                          <div className={styles.metaLine}>
                            Updated: <span className={styles.mono}>{fmtDate(p.updated_at)}</span>
                          </div>
                        </div>
                      </div>

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
                          <div className={styles.infoLabel}>Bid Points</div>
                          <div className={styles.infoValue}>
                            <span className={styles.big}>{safeNum(p.bid_points, 0)}</span>
                          </div>
                        </div>

                        <div className={styles.infoBox}>
                          <div className={styles.infoLabel}>Bank</div>
                          <div className={styles.infoValue}>
                            <div>{p.bank_name || "—"}</div>
                            <div className={styles.mutedSmall}>
                              {p.account_name || "—"} • <span className={styles.mono}>{p.account_number || "—"}</span>
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
                          title={!isPending ? "Only pending payouts can be approved" : "Approve payout"}
                          onClick={() => askAction(p, "approve")}
                        >
                          <FiCheckCircle /> Approve
                        </button>

                        <button
                          className={styles.dangerBtnSmall}
                          type="button"
                          disabled={busy || !isPending}
                          title={!isPending ? "Only pending payouts can be rejected" : "Reject payout & refund"}
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
          title={`Payout Details${detail?.id ? ` #${detail.id}` : ""}`}
          subtitle="From GET /api/admin/payouts"
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
                  <div className={styles.infoLabel}>Bid Points</div>
                  <div className={styles.infoValue}>
                    <span className={styles.big}>{safeNum(detail.bid_points, 0)}</span>
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
                  <div className={styles.infoLabel}>Bank</div>
                  <div className={styles.infoValue}>
                    {detail.bank_name || "—"} • {detail.account_name || "—"} •{" "}
                    <span className={styles.mono}>{detail.account_number || "—"}</span>
                  </div>
                </div>

                <div className={styles.infoBox} style={{ gridColumn: "1 / -1" }}>
                  <div className={styles.infoLabel}>Admin Note</div>
                  <div className={styles.infoValue}>
                    {detail.admin_note ? detail.admin_note : <span className={styles.mutedSmall}>—</span>}
                  </div>
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

        {/* Note Modal (enter admin_note then confirm) */}
        <Modal
          open={noteModal.open}
          title={
            noteModal.action === "approve"
              ? `Approve Payout #${noteModal.payout?.id || ""}`
              : `Reject Payout #${noteModal.payout?.id || ""}`
          }
          subtitle={
            noteModal.action === "approve"
              ? "PATCH /api/admin/payouts/:payoutId  { action:'approve', admin_note }"
              : "PATCH /api/admin/payouts/:payoutId  { action:'reject', admin_note }"
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
          {!noteModal.payout ? (
            <div className={styles.centerMuted}>No payout selected.</div>
          ) : (
            <div className={styles.noteWrap}>
              <div className={styles.noteSummary}>
                <div>
                  <div className={styles.noteLine}>
                    <span className={styles.badgeSoft}>Payout</span>{" "}
                    <span className={styles.mono}>#{noteModal.payout.id}</span>
                  </div>
                  <div className={styles.noteLine}>
                    <span className={styles.badgeSoft}>User</span>{" "}
                    <b>{noteModal.payout.username || "—"}</b>{" "}
                    <span className={styles.mutedSmall}>({noteModal.payout.email || "—"})</span>
                  </div>
                </div>

                <div className={styles.noteRight}>
                  <div className={styles.noteLine}>
                    <span className={styles.badgeSoft}>Bid Points</span>{" "}
                    <span className={styles.mono}>{safeNum(noteModal.payout.bid_points, 0)}</span>
                  </div>
                  <div className={styles.noteLine}>
                    <span className={styles.badgeSoft}>Status</span>{" "}
                    <span className={styles.mono}>{noteModal.payout.status}</span>
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
                  ? "Approving will set payout to APPROVED (no refund)."
                  : "Rejecting will refund the bid_points back to the user and set payout to REJECTED."}
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
            <div style={{ color: "rgba(233,233,255,.92)", fontWeight: 700 }}>
              {confirm.message}
            </div>
            <div style={{ color: "rgba(233,233,255,.62)", fontSize: 12 }}>
              Tip: Only <b>pending</b> payouts can be approved/rejected.
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}