// src/pages/admin/AdminHeists.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api, imgUrl } from "../../lib/api";
import styles from "./AdminHeists.module.css";
import AdminNavbar from "../../components/admin/Navbar";
import Modal from "../../components/ui/Modal";
import { ToastProvider, useToast } from "../../components/ui/Toaster";

import {
  FiArrowLeft,
  FiRefreshCw,
  FiPlus,
  FiSearch,
  FiGrid,
  FiList,
  FiEye,
  FiEdit3,
  FiPlay,
  FiStopCircle,
  FiTrash2,
  FiCpu,
  FiX,
  FiClipboard,
  FiAward,
} from "react-icons/fi";

const HEIST_STATUSES = ["pending", "hold", "started", "completed", "cancelled"];

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

function isFile(x) {
  return x && typeof x === "object" && "name" in x && "size" in x;
}

function safeJsonParse(v, fallback) {
  try {
    if (v === null || v === undefined || v === "") return fallback;
    if (typeof v === "object") return v;
    return JSON.parse(String(v));
  } catch {
    return fallback;
  }
}

function badgeClassForStatus(status) {
  const s = String(status || "").toLowerCase();
  return styles[`st_${s}`] || styles.badgeSoft;
}

/** wrapper so this page can use toasts without touching App.jsx */
export default function AdminHeists() {
  return (
    <ToastProvider>
      <AdminHeistsInner />
    </ToastProvider>
  );
}

function AdminHeistsInner() {
  const toast = useToast();

  const [busy, setBusy] = useState(false);

  // confirm modal
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    subtitle: "",
    message: "",
    tone: "danger", // danger | warn | primary
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
      tone: cfg.tone || "danger",
      confirmText: cfg.confirmText || "Confirm",
      cancelText: cfg.cancelText || "Cancel",
      action: typeof cfg.action === "function" ? cfg.action : null,
    });
  };

  const closeConfirm = () => {
    if (busy) return;
    setConfirm((p) => ({ ...p, open: false, action: null }));
  };

  // data
  const [heistsRaw, setHeistsRaw] = useState([]);
  const [loading, setLoading] = useState(false);

  // filters + client pagination
  const [filters, setFilters] = useState({ q: "", status: "" });
  const [page, setPage] = useState(1);
  const limit = 10;

  // view mode
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"

  // View modal
  const [viewOpen, setViewOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailTab, setDetailTab] = useState("overview"); // overview | questions | attempts | leaderboard
  const [attempts, setAttempts] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);

  const resetDetailPanels = () => {
    setAttempts(null);
    setLeaderboard(null);
    setDetailTab("overview");
  };

  // ---- variants helpers ----
  function normalizeVariants(list) {
    const arr = Array.isArray(list) ? list : [];
    return arr
      .map((v) => ({
        question: String(v?.question || "").trim(),
        answer: String(v?.answer || "").trim(),
      }))
      .filter((v) => v.question && v.answer);
  }

  function variantsToJsonText(variants) {
    const clean = normalizeVariants(variants);
    return clean.length ? JSON.stringify(clean, null, 2) : "";
  }

  function parseVariantsJsonText(text) {
    const parsed = safeJsonParse(text, null);
    if (!Array.isArray(parsed)) return null;
    return normalizeVariants(parsed);
  }

  const filtered = useMemo(() => {
    const q = String(filters.q || "").trim().toLowerCase();
    const st = String(filters.status || "").trim().toLowerCase();

    return (heistsRaw || []).filter((h) => {
      const okStatus = !st || String(h.status || "").toLowerCase() === st;
      if (!okStatus) return false;

      if (!q) return true;
      const hay = `${h.id} ${h.name || ""} ${h.story || ""} ${h.prize_name || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [heistsRaw, filters]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paged = useMemo(() => {
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [filters.q, filters.status]);

  const fetchHeists = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/heists");
      const rows = res.data?.data || [];
      const normalized = rows.map((h) => {
        const variants = safeJsonParse(h.question_variants, []);
        const prize_image = h?.prize_image || "";
        return {
          ...h,
          prize_image,
          prize_image_url: prize_image ? imgUrl(prize_image) : "",
          variants_count: Array.isArray(variants) ? variants.length : safeNum(h.variants_count, 0),
          question_variants: Array.isArray(variants) ? variants : [],
        };
      });
      setHeistsRaw(normalized);
    } catch (err) {
      console.error("Fetch heists error:", err);
      toast.error(err?.response?.data?.message || "Failed to fetch heists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // create/edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingHeist, setEditingHeist] = useState(null);

  // form state
  const [form, setForm] = useState({
    name: "",
    story: "",
    min_users: 1,
    ticket_price: 0,
    prize: 0,
    prize_name: "",
    countdown_duration_minutes: 10,
    retry_ticket_price: 0,

    auto_generate_questions: true,
    questions_count: 6,

    variants: [],

    advanced_json_open: false,
    advanced_variants_json: "",

    prize_image: null,
  });

  const resetForm = () => {
    setForm({
      name: "",
      story: "",
      min_users: 1,
      ticket_price: 0,
      prize: 0,
      prize_name: "",
      countdown_duration_minutes: 10,
      retry_ticket_price: 0,

      auto_generate_questions: true,
      questions_count: 6,

      variants: [],
      advanced_json_open: false,
      advanced_variants_json: "",

      prize_image: null,
    });
  };

  const openCreate = () => {
    setEditingHeist(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (h) => {
    const variants = Array.isArray(h.question_variants)
      ? h.question_variants
      : safeJsonParse(h.question_variants, []);

    setEditingHeist(h);

    setForm({
      name: h.name || "",
      story: h.story || "",
      min_users: safeNum(h.min_users, 1),
      ticket_price: safeNum(h.ticket_price, 0),
      prize: safeNum(h.prize, 0),
      prize_name: h.prize_name || "",
      countdown_duration_minutes: safeNum(h.countdown_duration_minutes, 10),
      retry_ticket_price: safeNum(h.retry_ticket_price, 0),

      auto_generate_questions: false,
      questions_count: 6,

      variants: Array.isArray(variants)
        ? variants.map((v) => ({
            question: String(v?.question || ""),
            answer: String(v?.answer || ""),
          }))
        : [],

      advanced_json_open: false,
      advanced_variants_json: Array.isArray(variants) && variants.length ? JSON.stringify(variants, null, 2) : "",

      prize_image: null,
    });

    setShowModal(true);
  };

  const buildCreateOrUpdateFormData = () => {
    const fd = new FormData();

    fd.append("name", String(form.name || "").trim());
    fd.append("story", String(form.story || ""));
    fd.append("min_users", String(safeNum(form.min_users, 1)));
    fd.append("ticket_price", String(safeNum(form.ticket_price, 0)));
    fd.append("prize", String(safeNum(form.prize, 0)));
    fd.append("prize_name", String(form.prize_name || ""));
    fd.append("countdown_duration_minutes", String(safeNum(form.countdown_duration_minutes, 10)));
    fd.append("retry_ticket_price", String(safeNum(form.retry_ticket_price, 0)));

    const cleanVariants = normalizeVariants(form.variants);

    if (cleanVariants.length) {
      fd.append("question_variants", JSON.stringify(cleanVariants));
      fd.append("auto_generate_questions", "false");
    } else {
      fd.append("auto_generate_questions", form.auto_generate_questions ? "true" : "false");
      fd.append("questions_count", String(safeNum(form.questions_count, 6)));
    }

    if (form.prize_image && isFile(form.prize_image)) {
      fd.append("prize_image", form.prize_image);
    }

    return fd;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!String(form.name || "").trim()) return toast.warn("Name is required");

    const cleanVariants = normalizeVariants(form.variants);
    if ((form.variants || []).length > 0 && cleanVariants.length === 0) {
      return toast.warn("Your questions must have both question + answer");
    }

    try {
      setBusy(true);

      const fd = buildCreateOrUpdateFormData();

      if (editingHeist?.id) {
        await api.put(`/admin/heists/${editingHeist.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Heist updated");
      } else {
        await api.post("/admin/heists", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Heist created");
      }

      setShowModal(false);
      setEditingHeist(null);
      resetForm();
      await fetchHeists();
    } catch (err) {
      console.error("Save heist error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to save heist");
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (id) => {
    try {
      setDetailLoading(true);
      setDetail(null);
      resetDetailPanels();

      const res = await api.get(`/admin/heists/${id}`);
      const h = res.data?.heist || null;

      if (h) {
        const variants = safeJsonParse(h.question_variants, []);
        const prize_image = h.prize_image || "";
        setDetail({
          ...h,
          prize_image,
          prize_image_url: prize_image ? imgUrl(prize_image) : "",
          question_variants: Array.isArray(variants) ? variants : [],
          variants_count: Array.isArray(variants) ? variants.length : 0,
        });
        setViewOpen(true);
      } else {
        setDetail(null);
        toast.warn("Heist not found");
      }
    } catch (err) {
      console.error("Get heist detail error:", err);
      toast.error(err?.response?.data?.message || "Failed to load heist");
    } finally {
      setDetailLoading(false);
    }
  };

  const loadAttempts = async (heistId) => {
    try {
      setDetailTab("attempts");
      setAttempts({ loading: true, data: null });
      const res = await api.get(`/admin/heists/${heistId}/attempts`, {
        params: { page: 1, limit: 50 },
      });
      setAttempts({ loading: false, data: res.data });
    } catch (err) {
      console.error("Load attempts error:", err);
      toast.error(err?.response?.data?.message || "Failed to load attempts");
      setAttempts({ loading: false, data: null });
    }
  };

  const loadLeaderboard = async (heistId) => {
    try {
      setDetailTab("leaderboard");
      setLeaderboard({ loading: true, data: null });
      const res = await api.get(`/admin/heists/${heistId}/leaderboard`);
      setLeaderboard({ loading: false, data: res.data });
    } catch (err) {
      console.error("Load leaderboard error:", err);
      toast.error(err?.response?.data?.message || "Failed to load leaderboard");
      setLeaderboard({ loading: false, data: null });
    }
  };

  const handleDelete = (id) => {
    openConfirm({
      title: "Delete this heist?",
      subtitle: "DELETE /admin/heists/:heistId",
      message: "This will permanently delete the heist (only allowed if status = pending).",
      tone: "danger",
      confirmText: "Yes, delete",
      cancelText: "Cancel",
      action: async () => {
        try {
          setBusy(true);
          await api.delete(`/admin/heists/${id}`);
          toast.success("Heist deleted");
          await fetchHeists();
        } catch (err) {
          console.error("Delete heist error:", err);
          toast.error(err?.response?.data?.message || "Cannot delete heist");
        } finally {
          setBusy(false);
          closeConfirm();
        }
      },
    });
  };

  const handleStart = (id) => {
    openConfirm({
      title: "Start this heist?",
      subtitle: "POST /admin/heists/:id/start",
      message: "This will start the countdown and set status = started.",
      tone: "warn",
      confirmText: "Start",
      cancelText: "Cancel",
      action: async () => {
        try {
          setBusy(true);
          await api.post(`/admin/heists/${id}/start`);
          toast.success("Heist started");
          await fetchHeists();
          if (detail?.id === id) await openDetail(id);
        } catch (err) {
          console.error("Start heist error:", err);
          toast.error(err?.response?.data?.message || "Failed to start heist");
        } finally {
          setBusy(false);
          closeConfirm();
        }
      },
    });
  };

  const handleEnd = (id) => {
    openConfirm({
      title: "End & finalize this heist?",
      subtitle: "POST /admin/heists/:id/end",
      message: "This locks submissions and finalizes winner (if your finalize logic is set).",
      tone: "warn",
      confirmText: "End",
      cancelText: "Cancel",
      action: async () => {
        try {
          setBusy(true);
          const res = await api.post(`/admin/heists/${id}/end`);
          toast.success(`Heist ended. Winner: ${res.data?.winner_id || "—"}`);
          await fetchHeists();
          if (detail?.id === id) await openDetail(id);
        } catch (err) {
          console.error("End heist error:", err);
          toast.error(err?.response?.data?.message || "Failed to end heist");
        } finally {
          setBusy(false);
          closeConfirm();
        }
      },
    });
  };

  const handleGenerateQA = (id) => {
    openConfirm({
      title: "Generate CopUpBot Q/A?",
      subtitle: "POST /admin/heists/:id/generate-qa",
      message: "This will generate question_variants from story (replace mode).",
      tone: "primary",
      confirmText: "Generate",
      cancelText: "Cancel",
      action: async () => {
        try {
          setBusy(true);
          await api.post(`/admin/heists/${id}/generate-qa`, {
            mode: "replace",
            questions_count: 6,
          });
          toast.success("Q/A generated");
          await fetchHeists();
          if (detail?.id === id) await openDetail(id);
        } catch (err) {
          console.error("Generate QA error:", err);
          toast.error(err?.response?.data?.message || "Failed to generate Q/A");
        } finally {
          setBusy(false);
          closeConfirm();
        }
      },
    });
  };

  const refresh = async () => {
    await fetchHeists();
  };

  const canShowTable = viewMode === "table";

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
                <FiArrowLeft style={{ marginRight: 8 }} />
                Back
              </button>

              <div>
                <h2 className={styles.title}>Heist Management</h2>
                <p className={styles.sub}>
                  Uses endpoints: <span className={styles.mono}>/admin/heists</span> • create • start • end • leaderboard • attempts.
                </p>
              </div>
            </div>

            <div className={styles.headerActions}>
              <button className={styles.softBtn} type="button" onClick={refresh} disabled={busy || loading}>
                <FiRefreshCw style={{ marginRight: 8 }} />
                Refresh
              </button>

              <button className={styles.primaryBtn} type="button" onClick={openCreate} disabled={busy}>
                <FiPlus style={{ marginRight: 8 }} />
                Create Heist
              </button>
            </div>
          </header>

          {/* Tools */}
          <section className={styles.tools}>
            <div className={styles.searchWrap} style={{ position: "relative" }}>
              <FiSearch
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  opacity: 0.75,
                }}
              />
              <input
                className={styles.input}
                style={{ paddingLeft: 36 }}
                placeholder="Search by name, story, prize…"
                value={filters.q}
                onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
              />
            </div>

            <select
              className={styles.select}
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="">All Status</option>
              {HEIST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <div className={styles.viewToggle}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${viewMode === "cards" ? styles.toggleActive : ""}`}
                onClick={() => setViewMode("cards")}
                disabled={busy || loading}
                title="Cards view"
              >
                <FiGrid style={{ marginRight: 8 }} />
                Cards
              </button>

              <button
                type="button"
                className={`${styles.toggleBtn} ${viewMode === "table" ? styles.toggleActive : ""}`}
                onClick={() => setViewMode("table")}
                disabled={busy || loading}
                title="Table view"
              >
                <FiList style={{ marginRight: 8 }} />
                Table
              </button>
            </div>

            <div className={styles.pager}>
              <button
                className={styles.pagerBtn}
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={busy || loading || page <= 1}
              >
                ‹
              </button>

              <div className={styles.pagerInfo}>
                Page {Math.min(page, totalPages)} / {totalPages} • Total {total}
                {loading ? " • Loading…" : ""}
              </div>

              <button
                className={styles.pagerBtn}
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={busy || loading || page >= totalPages}
              >
                ›
              </button>
            </div>
          </section>

          {/* LIST */}
          <div className={styles.listCol}>
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>Heists</div>
                <div className={styles.mutedSmall}>
                  Showing <b>{paged.length}</b> of <b>{total}</b>
                </div>
              </div>

              {loading ? (
                <div className={styles.centerMuted}>Loading…</div>
              ) : paged.length === 0 ? (
                <div className={styles.centerMuted}>No heists found.</div>
              ) : (
                <>
                  {/* Cards (mobile + cards mode) */}
                  <div className={`${styles.cardsOnly} ${viewMode === "cards" ? "" : ""}`}>
                    <div className={styles.cardsWrap}>
                      {paged.map((h) => {
                        const st = String(h.status || "").toLowerCase();
                        const img = h.prize_image_url || (h.prize_image ? imgUrl(h.prize_image) : "");

                        return (
                          <div key={h.id} className={styles.heistCard}>
                            <div className={styles.cardTop}>
                              <div>
                                <div className={styles.cardId}>#{h.id}</div>
                                <div className={styles.cardName}>{h.name}</div>
                                <div className={styles.mutedSmall}>
                                  Created: {fmtDate(h.created_at)} • Updated: {fmtDate(h.updated_at)}
                                </div>
                              </div>

                              <span className={`${styles.badge} ${badgeClassForStatus(h.status)}`}>{h.status}</span>
                            </div>

                            <div className={styles.cardMeta}>
                              <div className={styles.metaBox}>
                                <div className={styles.metaLabel}>Prize</div>
                                <div className={styles.metaValue} style={{ fontFamily: "ui-monospace" }}>
                                  {safeNum(h.prize, 0)}
                                </div>
                              </div>

                              <div className={styles.metaBox}>
                                <div className={styles.metaLabel}>Ticket</div>
                                <div className={styles.metaValue} style={{ fontFamily: "ui-monospace" }}>
                                  {safeNum(h.ticket_price, 0)}
                                </div>
                              </div>

                              <div className={styles.metaBox}>
                                <div className={styles.metaLabel}>Min Users</div>
                                <div className={styles.metaValue} style={{ fontFamily: "ui-monospace" }}>
                                  {safeNum(h.min_users, 1)}
                                </div>
                              </div>

                              <div className={styles.metaBox}>
                                <div className={styles.metaLabel}>Duration</div>
                                <div className={styles.metaValue} style={{ fontFamily: "ui-monospace" }}>
                                  {safeNum(h.countdown_duration_minutes, 10)}m
                                </div>
                              </div>

                              <div className={styles.metaBox}>
                                <div className={styles.metaLabel}>Retry</div>
                                <div className={styles.metaValue} style={{ fontFamily: "ui-monospace" }}>
                                  {safeNum(h.retry_ticket_price, 0)}
                                </div>
                              </div>

                              <div className={styles.metaBox}>
                                <div className={styles.metaLabel}>Q/A</div>
                                <div className={styles.metaValue} style={{ fontFamily: "ui-monospace" }}>
                                  {safeNum(
                                    h.variants_count,
                                    Array.isArray(h.question_variants) ? h.question_variants.length : 0
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className={styles.cardBottom}>
                              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                {img ? (
                                  <div className={styles.itemImgWrap}>
                                    <img
                                      className={styles.itemImg}
                                      src={img}
                                      alt={h.prize_name || h.name || "Prize"}
                                      onError={(e) => (e.currentTarget.style.display = "none")}
                                    />
                                  </div>
                                ) : (
                                  <span className={styles.mutedSmall}>No image</span>
                                )}

                                <div className={styles.mutedSmall}>
                                  {h.prize_name ? <b>{h.prize_name}</b> : "—"}
                                  <div>Locked: {safeNum(h.submissions_locked, 0) ? "Yes" : "No"}</div>
                                </div>
                              </div>

                              <div className={styles.cardActions}>
                                <button
                                  className={styles.softBtnSmall}
                                  type="button"
                                  disabled={busy}
                                  onClick={() => openDetail(h.id)}
                                  title="View details"
                                >
                                  <FiEye style={{ marginRight: 6 }} />
                                  View
                                </button>

                                <button
                                  className={styles.softBtnSmall}
                                  type="button"
                                  disabled={busy}
                                  onClick={() => openEdit(h)}
                                  title="Edit"
                                >
                                  <FiEdit3 style={{ marginRight: 6 }} />
                                  Edit
                                </button>

                                {st === "hold" ? (
                                  <button
                                    className={styles.warnBtnSmall}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => handleStart(h.id)}
                                    title="Start heist"
                                  >
                                    <FiPlay style={{ marginRight: 6 }} />
                                    Start
                                  </button>
                                ) : null}

                                {st === "started" ? (
                                  <button
                                    className={styles.warnBtnSmall}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => handleEnd(h.id)}
                                    title="End heist"
                                  >
                                    <FiStopCircle style={{ marginRight: 6 }} />
                                    End
                                  </button>
                                ) : null}

                                {st !== "completed" ? (
                                  <button
                                    className={styles.primaryBtnSmall}
                                    type="button"
                                    disabled={busy || !String(h.story || "").trim()}
                                    onClick={() => handleGenerateQA(h.id)}
                                    title={!String(h.story || "").trim() ? "Add a story first" : "Generate Q/A from story"}
                                  >
                                    <FiCpu style={{ marginRight: 6 }} />
                                    Q/A
                                  </button>
                                ) : null}

                                {st === "pending" ? (
                                  <button
                                    className={styles.dangerBtnSmall}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => handleDelete(h.id)}
                                    title="Delete"
                                  >
                                    <FiTrash2 />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Table (desktop + table mode) */}
                  <div className={`${styles.tableOnly} ${canShowTable ? "" : ""}`}>
                    {viewMode !== "table" ? null : (
                      <div className={styles.tableWrap}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Heist</th>
                              <th>Prize</th>
                              <th>Status</th>
                              <th>Min Users</th>
                              <th>Ticket</th>
                              <th>Duration</th>
                              <th>Retry</th>
                              <th>Q/A</th>
                              <th>Locked</th>
                              <th>Image</th>
                              <th>Actions</th>
                            </tr>
                          </thead>

                          <tbody>
                            {paged.map((h) => {
                              const st = String(h.status || "").toLowerCase();
                              const img = h.prize_image_url || (h.prize_image ? imgUrl(h.prize_image) : "");

                              return (
                                <tr key={h.id}>
                                  <td className={styles.mono}>#{h.id}</td>

                                  <td>
                                    <div className={styles.cellTitle}>{h.name}</div>
                                    <div className={styles.mutedSmall}>
                                      Created: {fmtDate(h.created_at)} • Updated: {fmtDate(h.updated_at)}
                                    </div>
                                  </td>

                                  <td>
                                    <div className={styles.mono}>{safeNum(h.prize, 0)}</div>
                                    {h.prize_name ? <div className={styles.mutedSmall}>{h.prize_name}</div> : null}
                                  </td>

                                  <td>
                                    <span className={`${styles.badge} ${badgeClassForStatus(h.status)}`}>{h.status}</span>
                                  </td>

                                  <td className={styles.mono}>{safeNum(h.min_users, 1)}</td>
                                  <td className={styles.mono}>{safeNum(h.ticket_price, 0)}</td>
                                  <td className={styles.mono}>{safeNum(h.countdown_duration_minutes, 10)}m</td>
                                  <td className={styles.mono}>{safeNum(h.retry_ticket_price, 0)}</td>

                                  <td className={styles.mono}>
                                    {safeNum(
                                      h.variants_count,
                                      Array.isArray(h.question_variants) ? h.question_variants.length : 0
                                    )}
                                  </td>

                                  <td>
                                    <span className={`${styles.badge} ${styles.badgeSoft}`}>
                                      {safeNum(h.submissions_locked, 0) ? "Yes" : "No"}
                                    </span>
                                  </td>

                                  <td>
                                    {img ? (
                                      <div className={styles.itemImgWrap}>
                                        <img
                                          className={styles.itemImg}
                                          src={img}
                                          alt={h.prize_name || h.name || "Prize"}
                                          onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <span className={styles.mutedSmall}>—</span>
                                    )}
                                  </td>

                                  <td className={styles.actions}>
                                    <button
                                      className={styles.softBtnSmall}
                                      type="button"
                                      disabled={busy}
                                      onClick={() => openDetail(h.id)}
                                    >
                                      <FiEye style={{ marginRight: 6 }} />
                                      View
                                    </button>

                                    <button
                                      className={styles.softBtnSmall}
                                      type="button"
                                      disabled={busy}
                                      onClick={() => openEdit(h)}
                                    >
                                      <FiEdit3 style={{ marginRight: 6 }} />
                                      Edit
                                    </button>

                                    {st === "hold" ? (
                                      <button
                                        className={styles.warnBtnSmall}
                                        type="button"
                                        disabled={busy}
                                        onClick={() => handleStart(h.id)}
                                      >
                                        <FiPlay style={{ marginRight: 6 }} />
                                        Start
                                      </button>
                                    ) : null}

                                    {st === "started" ? (
                                      <button
                                        className={styles.warnBtnSmall}
                                        type="button"
                                        disabled={busy}
                                        onClick={() => handleEnd(h.id)}
                                      >
                                        <FiStopCircle style={{ marginRight: 6 }} />
                                        End
                                      </button>
                                    ) : null}

                                    {st !== "completed" ? (
                                      <button
                                        className={styles.primaryBtnSmall}
                                        type="button"
                                        disabled={busy || !String(h.story || "").trim()}
                                        onClick={() => handleGenerateQA(h.id)}
                                        title={!String(h.story || "").trim() ? "Add a story first" : "Generate Q/A from story"}
                                      >
                                        <FiCpu style={{ marginRight: 6 }} />
                                        Q/A
                                      </button>
                                    ) : null}

                                    {st === "pending" ? (
                                      <button
                                        className={styles.dangerBtnSmall}
                                        type="button"
                                        disabled={busy}
                                        onClick={() => handleDelete(h.id)}
                                      >
                                        <FiTrash2 />
                                      </button>
                                    ) : null}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* If desktop + cards mode, also show cards here */}
                  {viewMode === "cards" ? (
                    <div className={styles.tableOnly}>
                      <div className={styles.cardsWrap}>
                        {paged.map((h) => {
                          const st = String(h.status || "").toLowerCase();
                          const img = h.prize_image_url || (h.prize_image ? imgUrl(h.prize_image) : "");

                          return (
                            <div key={h.id} className={styles.heistCard}>
                              <div className={styles.cardTop}>
                                <div>
                                  <div className={styles.cardId}>#{h.id}</div>
                                  <div className={styles.cardName}>{h.name}</div>
                                  <div className={styles.mutedSmall}>
                                    Created: {fmtDate(h.created_at)} • Updated: {fmtDate(h.updated_at)}
                                  </div>
                                </div>

                                <span className={`${styles.badge} ${badgeClassForStatus(h.status)}`}>{h.status}</span>
                              </div>

                              <div className={styles.cardMeta}>
                                <div className={styles.metaBox}>
                                  <div className={styles.metaLabel}>Prize</div>
                                  <div className={styles.metaValue} style={{ fontFamily: "ui-monospace" }}>
                                    {safeNum(h.prize, 0)}
                                  </div>
                                </div>

                                <div className={styles.metaBox}>
                                  <div className={styles.metaLabel}>Ticket</div>
                                  <div className={styles.metaValue} style={{ fontFamily: "ui-monospace" }}>
                                    {safeNum(h.ticket_price, 0)}
                                  </div>
                                </div>

                                <div className={styles.metaBox}>
                                  <div className={styles.metaLabel}>Min Users</div>
                                  <div className={styles.metaValue} style={{ fontFamily: "ui-monospace" }}>
                                    {safeNum(h.min_users, 1)}
                                  </div>
                                </div>

                                <div className={styles.metaBox}>
                                  <div className={styles.metaLabel}>Duration</div>
                                  <div className={styles.metaValue} style={{ fontFamily: "ui-monospace" }}>
                                    {safeNum(h.countdown_duration_minutes, 10)}m
                                  </div>
                                </div>

                                <div className={styles.metaBox}>
                                  <div className={styles.metaLabel}>Retry</div>
                                  <div className={styles.metaValue} style={{ fontFamily: "ui-monospace" }}>
                                    {safeNum(h.retry_ticket_price, 0)}
                                  </div>
                                </div>

                                <div className={styles.metaBox}>
                                  <div className={styles.metaLabel}>Q/A</div>
                                  <div className={styles.metaValue} style={{ fontFamily: "ui-monospace" }}>
                                    {safeNum(
                                      h.variants_count,
                                      Array.isArray(h.question_variants) ? h.question_variants.length : 0
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className={styles.cardBottom}>
                                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                  {img ? (
                                    <div className={styles.itemImgWrap}>
                                      <img
                                        className={styles.itemImg}
                                        src={img}
                                        alt={h.prize_name || h.name || "Prize"}
                                        onError={(e) => (e.currentTarget.style.display = "none")}
                                      />
                                    </div>
                                  ) : (
                                    <span className={styles.mutedSmall}>No image</span>
                                  )}

                                  <div className={styles.mutedSmall}>
                                    {h.prize_name ? <b>{h.prize_name}</b> : "—"}
                                    <div>Locked: {safeNum(h.submissions_locked, 0) ? "Yes" : "No"}</div>
                                  </div>
                                </div>

                                <div className={styles.cardActions}>
                                  <button
                                    className={styles.softBtnSmall}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => openDetail(h.id)}
                                  >
                                    <FiEye style={{ marginRight: 6 }} />
                                    View
                                  </button>

                                  <button
                                    className={styles.softBtnSmall}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => openEdit(h)}
                                  >
                                    <FiEdit3 style={{ marginRight: 6 }} />
                                    Edit
                                  </button>

                                  {st === "hold" ? (
                                    <button
                                      className={styles.warnBtnSmall}
                                      type="button"
                                      disabled={busy}
                                      onClick={() => handleStart(h.id)}
                                    >
                                      <FiPlay style={{ marginRight: 6 }} />
                                      Start
                                    </button>
                                  ) : null}

                                  {st === "started" ? (
                                    <button
                                      className={styles.warnBtnSmall}
                                      type="button"
                                      disabled={busy}
                                      onClick={() => handleEnd(h.id)}
                                    >
                                      <FiStopCircle style={{ marginRight: 6 }} />
                                      End
                                    </button>
                                  ) : null}

                                  {st !== "completed" ? (
                                    <button
                                      className={styles.primaryBtnSmall}
                                      type="button"
                                      disabled={busy || !String(h.story || "").trim()}
                                      onClick={() => handleGenerateQA(h.id)}
                                    >
                                      <FiCpu style={{ marginRight: 6 }} />
                                      Q/A
                                    </button>
                                  ) : null}

                                  {st === "pending" ? (
                                    <button
                                      className={styles.dangerBtnSmall}
                                      type="button"
                                      disabled={busy}
                                      onClick={() => handleDelete(h.id)}
                                    >
                                      <FiTrash2 />
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          </div>

          {/* CREATE/EDIT MODAL */}
          <Modal
            open={showModal}
            title={editingHeist ? `Edit Heist #${editingHeist.id}` : "Create Heist"}
            subtitle={editingHeist ? "PUT /admin/heists/:id" : "POST /admin/heists"}
            onClose={() => !busy && setShowModal(false)}
            disableClose={busy}
            size="lg"
            footer={
              <>
                <button className={styles.primaryBtn} type="submit" form="heistForm" disabled={busy}>
                  {busy ? "Saving…" : "Save"}
                </button>
                <button className={styles.softBtn} type="button" onClick={() => !busy && setShowModal(false)} disabled={busy}>
                  Cancel
                </button>
              </>
            }
          >
            {/* ✅ NEW: scroll wrapper so the modal body becomes scrollable when long */}
            <div className={styles.modalScroll}>
              <form id="heistForm" onSubmit={handleSubmit} className={styles.formGrid}>
                {/* SECTION: Basics */}
                <div className={styles.section}>
                  <div className={styles.sectionHead}>
                    <div>
                      <div className={styles.sectionTitle}>Basics</div>
                      <div className={styles.sectionSub}>Name + Story. Story powers CopUpBot generation.</div>
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formFieldFull}>
                      <label className={styles.label}>Name *</label>
                      <input
                        className={styles.input}
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        required
                      />
                    </div>

                    <div className={styles.formFieldFull}>
                      <label className={styles.label}>Story (used for AI generation)</label>
                      <textarea
                        className={styles.textarea}
                        value={form.story}
                        onChange={(e) => setForm((p) => ({ ...p, story: e.target.value }))}
                        rows={5}
                      />
                      <div className={styles.mutedSmall}>
                        If you want auto CopUpBot questions, keep story filled and enable auto-generate OR click “Generate Q/A” on a heist.
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION: Pricing */}
                <div className={styles.section}>
                  <div className={styles.sectionHead}>
                    <div>
                      <div className={styles.sectionTitle}>Pricing</div>
                      <div className={styles.sectionSub}>Ticket price, retry price, and prize value.</div>
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label className={styles.label}>Min Users</label>
                      <input
                        className={styles.input}
                        type="number"
                        min="1"
                        step="1"
                        value={form.min_users}
                        onChange={(e) => setForm((p) => ({ ...p, min_users: Number(e.target.value) }))}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.label}>Ticket Price</label>
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        step="1"
                        value={form.ticket_price}
                        onChange={(e) => setForm((p) => ({ ...p, ticket_price: Number(e.target.value) }))}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.label}>Retry Ticket Price</label>
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        step="1"
                        value={form.retry_ticket_price}
                        onChange={(e) => setForm((p) => ({ ...p, retry_ticket_price: Number(e.target.value) }))}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.label}>Prize (numeric)</label>
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        step="1"
                        value={form.prize}
                        onChange={(e) => setForm((p) => ({ ...p, prize: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION: Timing */}
                <div className={styles.section}>
                  <div className={styles.sectionHead}>
                    <div>
                      <div className={styles.sectionTitle}>Timing</div>
                      <div className={styles.sectionSub}>Countdown duration in minutes.</div>
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label className={styles.label}>Countdown Duration (minutes)</label>
                      <input
                        className={styles.input}
                        type="number"
                        min="1"
                        step="1"
                        value={form.countdown_duration_minutes}
                        onChange={(e) => setForm((p) => ({ ...p, countdown_duration_minutes: Number(e.target.value) }))}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.label}>Prize Name</label>
                      <input
                        className={styles.input}
                        value={form.prize_name}
                        onChange={(e) => setForm((p) => ({ ...p, prize_name: e.target.value }))}
                        placeholder="e.g., iPhone 15 Pro, ₦50k Cash…"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION: Prize Image */}
                <div className={styles.section}>
                  <div className={styles.sectionHead}>
                    <div>
                      <div className={styles.sectionTitle}>Prize</div>
                      <div className={styles.sectionSub}>Upload prize image (optional).</div>
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formFieldFull}>
                      <label className={styles.label}>
                        Prize Image (uploads as <span className={styles.mono}>prize_image</span>)
                      </label>
                      <input
                        className={styles.input}
                        type="file"
                        accept="image/*"
                        onChange={(e) => setForm((p) => ({ ...p, prize_image: e.target.files?.[0] || null }))}
                      />
                      {form.prize_image ? (
                        <div className={styles.mutedSmall}>
                          Selected: <b>{form.prize_image.name}</b> ({Math.round(form.prize_image.size / 1024)}KB)
                        </div>
                      ) : null}
                    </div>

                    {form.prize_image ? (
                      <div className={styles.formFieldFull}>
                        <div className={styles.mutedSmall}>Preview</div>
                        <div className={styles.itemImgWrap} style={{ width: 260, height: 160 }}>
                          <img className={styles.itemImg} src={URL.createObjectURL(form.prize_image)} alt="Prize preview" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* SECTION: Questions & Answers */}
                <div className={styles.section}>
                  <div className={styles.sectionHead}>
                    <div>
                      <div className={styles.sectionTitle}>Questions & Answers</div>
                      <div className={styles.sectionSub}>
                        Add questions manually (recommended). Admin never needs JSON. Each answer should be one word.
                      </div>
                    </div>

                    <button
                      className={styles.softBtnSmall}
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          variants: [...(p.variants || []), { question: "", answer: "" }],
                        }))
                      }
                    >
                      <FiPlus style={{ marginRight: 6 }} />
                      Add Question
                    </button>
                  </div>

                  {(form.variants || []).length ? (
                    <div className={styles.qaList}>
                      {form.variants.map((v, idx) => (
                        <div key={idx} className={styles.qaRow}>
                          <div className={styles.qaIndex}>#{idx + 1}</div>

                          <div className={styles.qaFields}>
                            <div className={styles.formFieldFull}>
                              <label className={styles.label}>Question</label>
                              <input
                                className={styles.input}
                                value={v.question}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm((p) => {
                                    const next = [...(p.variants || [])];
                                    next[idx] = { ...next[idx], question: val };
                                    return { ...p, variants: next };
                                  });
                                }}
                                placeholder="Type the question..."
                              />
                            </div>

                            <div className={styles.formFieldFull}>
                              <label className={styles.label}>Answer (one word)</label>
                              <input
                                className={styles.input}
                                value={v.answer}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm((p) => {
                                    const next = [...(p.variants || [])];
                                    next[idx] = { ...next[idx], answer: val };
                                    return { ...p, variants: next };
                                  });
                                }}
                                placeholder="e.g., Eclipse"
                              />
                              <div className={styles.mutedSmall}>Tip: Answers should be a single word (your backend enforces this).</div>
                            </div>
                          </div>

                          <button
                            className={styles.dangerBtnSmall}
                            type="button"
                            onClick={() => {
                              setForm((p) => {
                                const next = [...(p.variants || [])];
                                next.splice(idx, 1);
                                return { ...p, variants: next };
                              });
                            }}
                            title="Remove"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.centerMuted} style={{ padding: 12 }}>
                      No manual questions added yet.
                    </div>
                  )}

                  <div className={styles.sectionDivider} />

                  <div className={styles.checkRow}>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={!!form.auto_generate_questions}
                        onChange={(e) => setForm((p) => ({ ...p, auto_generate_questions: e.target.checked }))}
                        disabled={(form.variants || []).length > 0}
                      />
                      <span>Auto-generate from Story (on create)</span>
                    </label>

                    <div className={styles.formField} style={{ minWidth: 180 }}>
                      <label className={styles.label}>Questions Count</label>
                      <input
                        className={styles.input}
                        type="number"
                        min="1"
                        step="1"
                        value={form.questions_count}
                        onChange={(e) => setForm((p) => ({ ...p, questions_count: Number(e.target.value) }))}
                        disabled={(form.variants || []).length > 0}
                      />
                    </div>
                  </div>

                  <div className={styles.mutedSmall}>If you add manual questions above, auto-generate is disabled automatically.</div>

                  <div className={styles.sectionDivider} />

                  <button
                    type="button"
                    className={styles.softBtnSmall}
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        advanced_json_open: !p.advanced_json_open,
                        advanced_variants_json: p.advanced_json_open
                          ? p.advanced_variants_json
                          : p.advanced_variants_json || variantsToJsonText(p.variants),
                      }))
                    }
                  >
                    <FiCpu style={{ marginRight: 6 }} />
                    {form.advanced_json_open ? "Hide Advanced JSON" : "Show Advanced JSON"}
                  </button>

                  {form.advanced_json_open ? (
                    <div style={{ marginTop: 10 }}>
                      <textarea
                        className={styles.textarea}
                        value={form.advanced_variants_json}
                        onChange={(e) => setForm((p) => ({ ...p, advanced_variants_json: e.target.value }))}
                        rows={8}
                        placeholder={`[
  {"question":"What is the codeword?","answer":"Eclipse"}
]`}
                      />

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                        <button
                          type="button"
                          className={styles.primaryBtnSmall}
                          onClick={() => {
                            const next = parseVariantsJsonText(form.advanced_variants_json);
                            if (!next) return toast.error("Invalid JSON array. Must be [{question,answer}...]");
                            setForm((p) => ({ ...p, variants: next }));
                            toast.success("Imported JSON into builder");
                          }}
                        >
                          Import JSON → Builder
                        </button>

                        <button
                          type="button"
                          className={styles.softBtnSmall}
                          onClick={() => {
                            const txt = variantsToJsonText(form.variants);
                            setForm((p) => ({ ...p, advanced_variants_json: txt }));
                            toast.success("Exported builder → JSON");
                          }}
                        >
                          Export Builder → JSON
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </form>
            </div>
          </Modal>

          {/* VIEW DETAILS MODAL */}
          <Modal
            open={viewOpen}
            title={detail ? `Heist #${detail.id} • ${detail.name}` : "Heist Details"}
            subtitle="Admin View (modal)"
            onClose={() => !busy && setViewOpen(false)}
            disableClose={busy}
            size="lg"
            footer={
              <>
                <button className={styles.softBtn} type="button" onClick={() => !busy && setViewOpen(false)} disabled={busy}>
                  Close
                </button>
              </>
            }
          >
            {/* ✅ NEW: scroll wrapper for view modal too */}
            <div className={styles.modalScroll}>
              <div className={styles.detailTabs}>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${detailTab === "overview" ? styles.tabActive : ""}`}
                  onClick={() => setDetailTab("overview")}
                >
                  Overview
                </button>

                <button
                  type="button"
                  className={`${styles.tabBtn} ${detailTab === "questions" ? styles.tabActive : ""}`}
                  onClick={() => setDetailTab("questions")}
                >
                  Questions
                </button>

                <button
                  type="button"
                  className={`${styles.tabBtn} ${detailTab === "attempts" ? styles.tabActive : ""}`}
                  onClick={() => detail?.id && loadAttempts(detail.id)}
                  disabled={!detail?.id}
                >
                  Attempts
                </button>

                <button
                  type="button"
                  className={`${styles.tabBtn} ${detailTab === "leaderboard" ? styles.tabActive : ""}`}
                  onClick={() => detail?.id && loadLeaderboard(detail.id)}
                  disabled={!detail?.id}
                >
                  Leaderboard
                </button>
              </div>

              <div className={styles.detailBody}>
                {detailLoading ? (
                  <div className={styles.centerMuted}>Loading…</div>
                ) : !detail ? (
                  <div className={styles.centerMuted}>No heist loaded.</div>
                ) : (
                  <>
                    {detailTab === "overview" ? (
                      <>
                        <div className={styles.detailGrid}>
                          <div className={styles.infoBox}>
                            <div className={styles.infoLabel}>Status</div>
                            <div className={styles.infoValue}>
                              <span className={`${styles.badge} ${badgeClassForStatus(detail.status)}`}>{detail.status}</span>
                            </div>
                          </div>

                          <div className={styles.infoBox}>
                            <div className={styles.infoLabel}>Countdown</div>
                            <div className={styles.infoValue}>{safeNum(detail.countdown_duration_minutes, 10)} minutes</div>
                          </div>

                          <div className={styles.infoBox}>
                            <div className={styles.infoLabel}>Ends At</div>
                            <div className={styles.infoValue}>{fmtDate(detail.countdown_ends_at)}</div>
                          </div>

                          <div className={styles.infoBox}>
                            <div className={styles.infoLabel}>Winner</div>
                            <div className={styles.infoValue}>{detail.winner_id || "—"}</div>
                          </div>
                        </div>

                        <div className={styles.twoCol} style={{ marginTop: 12 }}>
                          <div className={styles.infoBox}>
                            <div className={styles.infoLabel}>Story</div>
                            <div className={styles.infoValue} style={{ whiteSpace: "pre-wrap" }}>
                              {detail.story || "—"}
                            </div>
                          </div>

                          <div className={styles.infoBox}>
                            <div className={styles.infoLabel}>Prize</div>
                            <div className={styles.infoValue}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                <div>
                                  <div className={styles.mutedSmall}>Prize Name</div>
                                  <div style={{ fontWeight: 800 }}>{detail.prize_name || "—"}</div>
                                </div>
                                <div>
                                  <div className={styles.mutedSmall}>Prize Value</div>
                                  <div className={styles.mono} style={{ fontWeight: 900 }}>
                                    {safeNum(detail.prize, 0)}
                                  </div>
                                </div>
                              </div>

                              <div style={{ marginTop: 10 }}>
                                {detail.prize_image_url ? (
                                  <div className={styles.itemImgWrap} style={{ width: "100%", height: 180 }}>
                                    <img className={styles.itemImg} src={detail.prize_image_url} alt="Prize" />
                                  </div>
                                ) : (
                                  <div className={styles.centerMuted} style={{ padding: 10 }}>
                                    No prize image
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={styles.detailGrid} style={{ marginTop: 12 }}>
                          <div className={styles.infoBox}>
                            <div className={styles.infoLabel}>Min Users</div>
                            <div className={`${styles.infoValue} ${styles.mono}`}>{safeNum(detail.min_users, 1)}</div>
                          </div>
                          <div className={styles.infoBox}>
                            <div className={styles.infoLabel}>Ticket Price</div>
                            <div className={`${styles.infoValue} ${styles.mono}`}>{safeNum(detail.ticket_price, 0)}</div>
                          </div>
                          <div className={styles.infoBox}>
                            <div className={styles.infoLabel}>Retry Ticket</div>
                            <div className={`${styles.infoValue} ${styles.mono}`}>{safeNum(detail.retry_ticket_price, 0)}</div>
                          </div>
                          <div className={styles.infoBox}>
                            <div className={styles.infoLabel}>Submissions Locked</div>
                            <div className={styles.infoValue}>{safeNum(detail.submissions_locked, 0) ? "Yes" : "No"}</div>
                          </div>
                        </div>
                      </>
                    ) : null}

                    {detailTab === "questions" ? (
                      <div className={styles.section} style={{ marginTop: 10 }}>
                        <div className={styles.sectionHead}>
                          <div>
                            <div className={styles.sectionTitle}>Questions ({detail.variants_count || 0})</div>
                            <div className={styles.sectionSub}>This is how admin sees it (no JSON confusion).</div>
                          </div>
                        </div>

                        {(detail.question_variants || []).length ? (
                          <div className={styles.qaViewList}>
                            {(detail.question_variants || []).map((v, idx) => (
                              <div key={idx} className={styles.qaViewRow}>
                                <div className={styles.qaIndex}>#{idx + 1}</div>
                                <div style={{ display: "grid", gap: 6 }}>
                                  <div>
                                    <div className={styles.mutedSmall}>Question</div>
                                    <div style={{ fontWeight: 800 }}>{String(v?.question || "—")}</div>
                                  </div>
                                  <div>
                                    <div className={styles.mutedSmall}>Answer</div>
                                    <div className={styles.mono} style={{ fontWeight: 900 }}>
                                      {String(v?.answer || "—")}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.centerMuted} style={{ padding: 10 }}>
                            No questions found.
                          </div>
                        )}
                      </div>
                    ) : null}

                    {detailTab === "attempts" ? (
                      <div className={styles.section} style={{ marginTop: 10 }}>
                        <div className={styles.sectionHead}>
                          <div>
                            <div className={styles.sectionTitle}>Attempts (latest 50)</div>
                            <div className={styles.sectionSub}>Showing meaningful fields.</div>
                          </div>
                        </div>

                        {attempts?.loading ? (
                          <div className={styles.centerMuted} style={{ padding: 12 }}>
                            Loading attempts…
                          </div>
                        ) : attempts?.data?.data?.length ? (
                          <div className={styles.tableWrap}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th>ID</th>
                                  <th>User</th>
                                  <th>Correct</th>
                                  <th>Time(s)</th>
                                  <th>Submitted</th>
                                  <th>Created</th>
                                </tr>
                              </thead>
                              <tbody>
                                {attempts.data.data.map((a) => (
                                  <tr key={a.id}>
                                    <td className={styles.mono}>#{a.id}</td>
                                    <td className={styles.mono}>{a.user_id}</td>
                                    <td>
                                      <span className={`${styles.badge} ${a.is_correct ? styles.st_completed : styles.badgeSoft}`}>
                                        {a.is_correct ? "Yes" : "No"}
                                      </span>
                                    </td>
                                    <td className={styles.mono}>{safeNum(a.total_time_seconds, 0)}</td>
                                    <td className={styles.mono}>{String(a.submitted_answer || "—")}</td>
                                    <td>{fmtDate(a.created_at)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className={styles.centerMuted} style={{ padding: 12 }}>
                            No attempts.
                          </div>
                        )}
                      </div>
                    ) : null}

                    {detailTab === "leaderboard" ? (
                      <div className={styles.section} style={{ marginTop: 10 }}>
                        <div className={styles.sectionHead}>
                          <div>
                            <div className={styles.sectionTitle}>Leaderboard (top 200)</div>
                            <div className={styles.sectionSub}>Fast overview: best time + attempts.</div>
                          </div>
                        </div>

                        {leaderboard?.loading ? (
                          <div className={styles.centerMuted} style={{ padding: 12 }}>
                            Loading leaderboard…
                          </div>
                        ) : leaderboard?.data?.data?.length ? (
                          <div className={styles.tableWrap}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th>User</th>
                                  <th>Best Time</th>
                                  <th>Attempts</th>
                                  <th>Correct</th>
                                </tr>
                              </thead>
                              <tbody>
                                {leaderboard.data.data.map((r) => (
                                  <tr key={r.user_id}>
                                    <td className={styles.mono}>{r.user_id}</td>
                                    <td className={styles.mono}>{r.best_time == null ? "—" : r.best_time}</td>
                                    <td className={styles.mono}>{safeNum(r.attempts_count, 0)}</td>
                                    <td className={styles.mono}>{safeNum(r.correct_attempts, 0)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className={styles.centerMuted} style={{ padding: 12 }}>
                            No leaderboard data.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
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
            {/* ✅ NEW: scroll wrapper here too (safe when message becomes long) */}
            <div className={`${styles.modalScroll} ${styles.modalScrollSm}`}>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ color: "rgba(233,233,255,.92)", fontWeight: 700 }}>{confirm.message}</div>
                <div style={{ color: "rgba(233,233,255,.62)", fontSize: 12 }}>Tip: This action can’t be undone once confirmed.</div>
              </div>
            </div>
          </Modal>
        </div>
      </div>
    </>
  );
}