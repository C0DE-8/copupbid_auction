import React, { useEffect, useMemo, useState } from "react";
import { api, imgUrl } from "../../lib/api";
import styles from "./AdminBanner.module.css";
import AdminNavbar from "../../components/admin/Navbar";

import {
  FiArrowLeft,
  FiRefreshCw,
  FiPlus,
  FiSearch,
  FiGrid,
  FiList,
  FiEye,
  FiEdit3,
  FiTrash2,
  FiX,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
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

function isFile(x) {
  return x && typeof x === "object" && "name" in x && "size" in x;
}

// Simple Toast Management
let toastQueue = [];
let toastId = 0;

function Toast({ id, message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: "bg-green-900/90",
    error: "bg-red-900/90",
    warn: "bg-yellow-900/90",
    info: "bg-blue-900/90",
  }[type] || "bg-gray-900/90";

  const iconColor = {
    success: "text-green-400",
    error: "text-red-400",
    warn: "text-yellow-400",
    info: "text-blue-400",
  }[type] || "text-gray-400";

  const Icon = {
    success: FiCheckCircle,
    error: FiAlertCircle,
    warn: FiAlertCircle,
    info: FiInfo,
  }[type] || FiInfo;

  return (
    <div className={`${bgColor} px-4 py-3 rounded-lg flex items-center gap-3 text-white text-sm backdrop-blur-sm`}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
      <span>{message}</span>
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "info") => {
    const id = toastId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    return id;
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    success: (msg) => addToast(msg, "success"),
    error: (msg) => addToast(msg, "error"),
    warn: (msg) => addToast(msg, "warn"),
    info: (msg) => addToast(msg, "info"),
    toasts,
    removeToast,
  };
}

// Simple Modal
function Modal({ isOpen, onClose, children, title }) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default function AdminBanner() {
  const toast = useToast();
  const { toasts, removeToast } = toast;

  const [busy, setBusy] = useState(false);

  // Toast manager for this component
  const componentToast = useToast();

  // confirm modal
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    subtitle: "",
    message: "",
    tone: "danger",
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
  const [bannersRaw, setBannersRaw] = useState([]);
  const [loading, setLoading] = useState(false);

  // filters + pagination
  const [filters, setFilters] = useState({ q: "" });
  const [page, setPage] = useState(1);
  const limit = 10;

  // view mode
  const [viewMode, setViewMode] = useState("cards");

  // view modal
  const [viewOpen, setViewOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  // create/edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);

  // form state
  const [form, setForm] = useState({
    action_name: "",
    action_url: "",
    is_active: 1,
    sort_order: 0,
    image: null,
  });

  const resetForm = () => {
    setForm({
      action_name: "",
      action_url: "",
      is_active: 1,
      sort_order: 0,
      image: null,
    });
  };

  const filtered = useMemo(() => {
    const q = String(filters.q || "").trim().toLowerCase();
    return (bannersRaw || []).filter((b) => {
      if (!q) return true;
      const hay = `${b.id} ${b.action_name || ""} ${b.action_url || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [bannersRaw, filters]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paged = useMemo(() => {
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [filters.q]);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/banners");
      const rows = res.data?.banners || [];
      const normalized = rows.map((b) => ({
        ...b,
      }));
      setBannersRaw(normalized);
    } catch (err) {
      console.error("Fetch banners error:", err);
      componentToast.error(err?.response?.data?.message || "Failed to fetch banners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditingBanner(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditingBanner(b);
    setForm({
      action_name: b.action_name || "",
      action_url: b.action_url || "",
      is_active: safeNum(b.is_active, 1),
      sort_order: safeNum(b.sort_order, 0),
      image: null,
    });
    setShowModal(true);
  };

  const buildCreateOrUpdateFormData = () => {
    const fd = new FormData();

    fd.append("action_name", String(form.action_name || "").trim());
    fd.append("action_url", String(form.action_url || "").trim());
    fd.append("is_active", String(form.is_active ? 1 : 0));
    fd.append("sort_order", String(safeNum(form.sort_order, 0)));

    if (form.image && isFile(form.image)) {
      fd.append("image", form.image);
    }

    return fd;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!String(form.action_name || "").trim()) {
      return componentToast.warn("Action name is required");
    }

    if (!String(form.action_url || "").trim()) {
      return componentToast.warn("Action URL is required");
    }

    if (!editingBanner && !form.image) {
      return componentToast.warn("Image is required for new banners");
    }

    try {
      setBusy(true);

      const fd = buildCreateOrUpdateFormData();

      if (editingBanner?.id) {
        await api.put(`/admin/banners/${editingBanner.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        componentToast.success("Banner updated");
      } else {
        await api.post("/admin/banners", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        componentToast.success("Banner created");
      }

      setShowModal(false);
      setEditingBanner(null);
      resetForm();
      await fetchBanners();
    } catch (err) {
      console.error("Save banner error:", err);
      componentToast.error(err?.response?.data?.message || err?.message || "Failed to save banner");
    } finally {
      setBusy(false);
    }
  };

  const openDetail = (b) => {
    setDetail(b);
    setViewOpen(true);
  };

  const handleDelete = (id) => {
    openConfirm({
      title: "Delete this banner?",
      subtitle: "DELETE /admin/banners/:id",
      message: "This will permanently delete the banner.",
      tone: "danger",
      confirmText: "Yes, delete",
      cancelText: "Cancel",
      action: async () => {
        try {
          setBusy(true);
          await api.delete(`/admin/banners/${id}`);
          componentToast.success("Banner deleted");
          await fetchBanners();
        } catch (err) {
          console.error("Delete banner error:", err);
          componentToast.error(err?.response?.data?.message || "Failed to delete banner");
        } finally {
          setBusy(false);
          closeConfirm();
        }
      },
    });
  };

  const refresh = async () => {
    await fetchBanners();
  };

  const canShowTable = viewMode === "table";

  return (
    <>
      <AdminNavbar />

      {/* Toast Container */}
      <div className={styles.toastContainer}>
        {componentToast.toasts.map((t) => (
          <Toast
            key={t.id}
            id={t.id}
            message={t.message}
            type={t.type}
            onClose={() => componentToast.removeToast(t.id)}
          />
        ))}
      </div>

      <div className={`${styles.page} ${viewMode === "cards" ? styles.modeCards : styles.modeTable}`}>
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
                <h2 className={styles.title}>Banner Management</h2>
                <p className={styles.sub}>
                  Uses endpoints: <span className={styles.mono}>/admin/banners</span> • create • read • update • delete
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
                Create Banner
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
                placeholder="Search by name, URL…"
                value={filters.q}
                onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
              />
            </div>

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
              {/* Cards View */}
              {paged.length > 0 ? (
                <div className={`${styles.cardsWrap} ${styles.cardsOnly}`}>
                  {paged.map((b) => (
                    <div key={b.id} className={styles.bannerCard}>
                      <div className={styles.cardTop}>
                        <div>
                          <div className={styles.cardId}>ID: {b.id}</div>
                          <div className={styles.cardName}>{b.action_name}</div>
                        </div>
                        <div className={styles.cardStatus}>
                          {b.is_active ? (
                            <span className={`${styles.badge} ${styles.st_active}`}>Active</span>
                          ) : (
                            <span className={`${styles.badge} ${styles.st_inactive}`}>Inactive</span>
                          )}
                        </div>
                      </div>

                      {b.image_url && (
                        <div className={styles.itemImgWrap}>
                          <img src={b.image_url} alt={b.action_name} className={styles.itemImg} />
                        </div>
                      )}

                      <div className={styles.cardMeta}>
                        <div className={styles.metaBox}>
                          <div className={styles.metaLabel}>URL</div>
                          <div className={styles.metaValue} title={b.action_url}>
                            {b.action_url.substring(0, 20)}...
                          </div>
                        </div>
                        <div className={styles.metaBox}>
                          <div className={styles.metaLabel}>Sort Order</div>
                          <div className={styles.metaValue}>{b.sort_order}</div>
                        </div>
                        <div className={styles.metaBox}>
                          <div className={styles.metaLabel}>Created</div>
                          <div className={styles.metaValue}>{fmtDate(b.created_at)}</div>
                        </div>
                      </div>

                      <div className={styles.cardBottom}>
                        <div className={styles.cardActions}>
                          <button
                            className={styles.primaryBtnSmall}
                            type="button"
                            onClick={() => openDetail(b)}
                            disabled={busy}
                          >
                            <FiEye style={{ marginRight: 4 }} />
                            View
                          </button>
                          <button
                            className={styles.softBtnSmall}
                            type="button"
                            onClick={() => openEdit(b)}
                            disabled={busy}
                          >
                            <FiEdit3 style={{ marginRight: 4 }} />
                            Edit
                          </button>
                          <button
                            className={styles.dangerBtnSmall}
                            type="button"
                            onClick={() => handleDelete(b.id)}
                            disabled={busy}
                          >
                            <FiTrash2 style={{ marginRight: 4 }} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.centerMuted}>{loading ? "Loading…" : "No banners found"}</div>
              )}

              {/* Table View */}
              {paged.length > 0 ? (
                <div className={`${styles.tableWrap} ${styles.tableOnly}`}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Action Name</th>
                        <th>URL</th>
                        <th>Sort Order</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((b) => (
                        <tr key={b.id}>
                          <td className={styles.mono}>{b.id}</td>
                          <td className={styles.cellTitle}>{b.action_name}</td>
                          <td title={b.action_url}>{b.action_url.substring(0, 30)}...</td>
                          <td>{b.sort_order}</td>
                          <td>
                            {b.is_active ? (
                              <span className={`${styles.badge} ${styles.st_active}`}>Active</span>
                            ) : (
                              <span className={`${styles.badge} ${styles.st_inactive}`}>Inactive</span>
                            )}
                          </td>
                          <td className={styles.mutedSmall}>{fmtDate(b.created_at)}</td>
                          <td>
                            <div className={styles.actions}>
                              <button
                                className={styles.primaryBtnSmall}
                                type="button"
                                onClick={() => openDetail(b)}
                                disabled={busy}
                              >
                                <FiEye />
                              </button>
                              <button
                                className={styles.softBtnSmall}
                                type="button"
                                onClick={() => openEdit(b)}
                                disabled={busy}
                              >
                                <FiEdit3 />
                              </button>
                              <button
                                className={styles.dangerBtnSmall}
                                type="button"
                                onClick={() => handleDelete(b.id)}
                                disabled={busy}
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => !busy && setShowModal(false)}>
        <div className={styles.modalHead}>
          <h3 className={styles.modalTitle}>{editingBanner ? "Edit Banner" : "Create Banner"}</h3>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={() => !busy && setShowModal(false)}
            disabled={busy}
          >
            <FiX />
          </button>
        </div>

        <div className={styles.modalScroll}>
          <form onSubmit={handleSubmit} className={styles.modalContent}>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>Action Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g., Summer Sale"
                  value={form.action_name}
                  onChange={(e) => setForm((p) => ({ ...p, action_name: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Action URL *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g., https://example.com/sale"
                  value={form.action_url}
                  onChange={(e) => setForm((p) => ({ ...p, action_url: e.target.value }))}
                  disabled={busy}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Sort Order</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="0"
                  value={form.sort_order}
                  onChange={(e) => setForm((p) => ({ ...p, sort_order: safeNum(e.target.value, 0) }))}
                  disabled={busy}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Status</label>
                <select
                  className={styles.select}
                  value={form.is_active ? 1 : 0}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: Number(e.target.value) }))}
                  disabled={busy}
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>

              <div className={styles.formFieldFull}>
                <label className={styles.label}>{editingBanner ? "Banner Image (optional)" : "Banner Image *"}</label>
                <div className={styles.fileInputWrap}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setForm((p) => ({ ...p, image: e.target.files?.[0] || null }))}
                    disabled={busy}
                    className={styles.fileInput}
                  />
                  <span className={styles.fileInputLabel}>
                    {form.image ? form.image.name : "Click to select image"}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.softBtn}
                onClick={() => !busy && setShowModal(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button type="submit" className={styles.primaryBtn} disabled={busy}>
                {busy ? "Saving…" : editingBanner ? "Update Banner" : "Create Banner"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)}>
        <div className={styles.modalHead}>
          <h3 className={styles.modalTitle}>Banner Details</h3>
          <button type="button" className={styles.modalCloseBtn} onClick={() => setViewOpen(false)}>
            <FiX />
          </button>
        </div>

        <div className={styles.modalScroll}>
          {detail && (
            <div className={styles.modalContent}>
              <div className={styles.detailGrid}>
                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>ID</div>
                  <div className={styles.infoValue}>{detail.id}</div>
                </div>
                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Action Name</div>
                  <div className={styles.infoValue}>{detail.action_name}</div>
                </div>
                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Sort Order</div>
                  <div className={styles.infoValue}>{detail.sort_order}</div>
                </div>
                <div className={styles.infoBox}>
                  <div className={styles.infoLabel}>Status</div>
                  <div className={styles.infoValue}>
                    {detail.is_active ? (
                      <span className={`${styles.badge} ${styles.st_active}`}>Active</span>
                    ) : (
                      <span className={`${styles.badge} ${styles.st_inactive}`}>Inactive</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12 }} className={styles.infoBox}>
                <div className={styles.infoLabel}>Action URL</div>
                <div className={styles.infoValue} style={{ wordBreak: "break-all" }}>
                  {detail.action_url}
                </div>
              </div>

              {detail.image_url && (
                <div style={{ marginTop: 12 }}>
                  <div className={styles.infoLabel}>Banner Image</div>
                  <div className={styles.itemImgWrap} style={{ marginTop: 8, width: "100%", height: 200 }}>
                    <img src={detail.image_url} alt={detail.action_name} className={styles.itemImg} />
                  </div>
                </div>
              )}

              <div style={{ marginTop: 12 }} className={styles.infoBox}>
                <div className={styles.infoLabel}>Created At</div>
                <div className={styles.infoValue}>{fmtDate(detail.created_at)}</div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Confirm Modal */}
      <Modal isOpen={confirm.open} onClose={closeConfirm}>
        <div className={styles.modalHead}>
          <h3 className={styles.modalTitle}>{confirm.title}</h3>
          <button type="button" className={styles.modalCloseBtn} onClick={closeConfirm} disabled={busy}>
            <FiX />
          </button>
        </div>

        <div className={styles.modalScrollSm}>
          <div className={styles.modalContent}>
            {confirm.subtitle && <p className={styles.modalSub}>{confirm.subtitle}</p>}
            {confirm.message && <p className={styles.modalMessage}>{confirm.message}</p>}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.softBtn} onClick={closeConfirm} disabled={busy}>
            {confirm.cancelText}
          </button>
          <button
            type="button"
            className={`${styles.primaryBtn} ${confirm.tone === "danger" ? styles.dangerBtn : ""}`}
            onClick={() => {
              if (confirm.action) confirm.action();
            }}
            disabled={busy}
          >
            {confirm.confirmText}
          </button>
        </div>
      </Modal>
    </>
  );
}
