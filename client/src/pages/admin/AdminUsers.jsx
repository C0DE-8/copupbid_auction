import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./AdminUsers.module.css";
import AdminNavbar from "../../components/admin/Navbar";
import { api } from "../../lib/api";

import {
  FaChevronLeft,
  FaSync,
  FaSearch,
  FaFilter,
  FaTimes,
  FaChevronRight,
  FaUsers,
  FaUserEdit,
  FaTrash,
  FaShieldAlt,
  FaCheckCircle,
  FaBan,
  FaCoins,
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

const EMPTY_EDIT = {
  id: "",
  email: "",
  username: "",
  full_name: "",
  role: "user",
  is_verified: 0,
  is_blocked: 0,
  wallet_address: "",
  game_id: "",
  referral_code: "",
  bid_points: 0,
};

export default function AdminUsers() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  // top stats
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [countLoading, setCountLoading] = useState(false);

  // list data
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // filters
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [verified, setVerified] = useState("");
  const [blocked, setBlocked] = useState("");
  const [from, setFrom] = useState(""); // yyyy-mm-dd
  const [to, setTo] = useState(""); // yyyy-mm-dd
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);

  // edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [editForm, setEditForm] = useState(EMPTY_EDIT);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const filtersActive = useMemo(() => {
    return !!(q || role || verified || blocked || from || to);
  }, [q, role, verified, blocked, from, to]);

  const buildParams = useCallback(() => {
    return {
      ...(q ? { q } : {}),
      ...(role ? { role } : {}),
      ...(verified === "0" || verified === "1" ? { verified } : {}),
      ...(blocked === "0" || blocked === "1" ? { blocked } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      page,
      limit,
    };
  }, [q, role, verified, blocked, from, to, page, limit]);

  const loadCount = useCallback(async () => {
    setCountLoading(true);
    try {
      const res = await api.get("/admin/user/count");
      setTotalUsersCount(safeNum(res.data?.total_users, 0));
    } catch (e) {
      console.error("loadCount error:", e);
    } finally {
      setCountLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/admin/users", { params: buildParams() });
      setRows(Array.isArray(res.data?.data) ? res.data.data : []);
      setTotal(safeNum(res.data?.total, 0));
    } catch (e) {
      console.error("loadUsers error:", e);
      setErr(e?.response?.data?.message || e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // reset to page 1 when filters change (except page/limit)
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, role, verified, blocked, from, to]);

  const refresh = async () => {
    setToast("");
    await Promise.all([loadCount(), loadUsers()]);
    setToast("✅ Refreshed");
    setTimeout(() => setToast(""), 1500);
  };

  const resetFilters = () => {
    setQ("");
    setRole("");
    setVerified("");
    setBlocked("");
    setFrom("");
    setTo("");
    setLimit(50);
    setPage(1);
  };

  const openEdit = async (id) => {
    const uid = Number(id);
    if (!uid || !Number.isFinite(uid)) return;

    setShowEdit(true);
    setEditLoading(true);
    setEditErr("");
    setEditForm(EMPTY_EDIT);

    try {
      const res = await api.get(`/admin/users/${uid}`);
      const u = res.data || {};
      setEditForm({
        id: u.id ?? "",
        email: u.email ?? "",
        username: u.username ?? "",
        full_name: u.full_name ?? "",
        role: u.role ?? "user",
        is_verified: safeNum(u.is_verified, 0),
        is_blocked: safeNum(u.is_blocked, 0),
        wallet_address: u.wallet_address ?? "",
        game_id: u.game_id ?? "",
        referral_code: u.referral_code ?? "",
        bid_points: safeNum(u.bid_points, 0),
      });
    } catch (e) {
      console.error("openEdit error:", e);
      setEditErr(e?.response?.data?.message || "Failed to load user");
    } finally {
      setEditLoading(false);
    }
  };

  const closeEdit = () => {
    if (busy) return;
    setShowEdit(false);
    setEditErr("");
    setEditForm(EMPTY_EDIT);
  };

  const submitEdit = async () => {
    const uid = Number(editForm.id);
    if (!uid) return;

    setBusy(true);
    setEditErr("");
    try {
      // send only fields you actually edit
      const payload = {
        email: String(editForm.email || "").trim().toLowerCase(),
        username: String(editForm.username || "").trim(),
        full_name: String(editForm.full_name || "").trim(),
        role: String(editForm.role || "user").trim().toLowerCase(),
        is_verified: Number(editForm.is_verified) ? 1 : 0,
        is_blocked: Number(editForm.is_blocked) ? 1 : 0,
        wallet_address: String(editForm.wallet_address || "").trim(),
        game_id: String(editForm.game_id || "").trim(),
        referral_code: String(editForm.referral_code || "").trim(),
        bid_points: Number(editForm.bid_points),
      };

      await api.patch(`/admin/users/${uid}`, payload);

      setToast("✅ User updated");
      setTimeout(() => setToast(""), 1500);

      closeEdit();
      await refresh();
    } catch (e) {
      console.error("submitEdit error:", e);
      setEditErr(e?.response?.data?.message || "Failed to update user");
    } finally {
      setBusy(false);
    }
  };

  const deleteUser = async (id) => {
    const uid = Number(id);
    if (!uid || !Number.isFinite(uid)) return;

    if (!window.confirm(`Delete user #${uid}? This cannot be undone.`)) return;

    setBusy(true);
    setErr("");
    try {
      await api.delete(`/admin/users/${uid}`);
      setToast("🗑️ User deleted");
      setTimeout(() => setToast(""), 1500);
      await refresh();
    } catch (e) {
      console.error("deleteUser error:", e);
      setErr(e?.response?.data?.message || "Failed to delete user");
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

              <h1 className={styles.title}>Users Management</h1>
            </div>

          </div>

          <div className={styles.headerActions}>
            <button className={styles.softBtn} type="button" onClick={refresh} disabled={busy}>
              <FaSync /> Refresh
            </button>
          </div>
        </header>

        {toast ? <div className={styles.toast}>{toast}</div> : null}
        {err ? <div className={styles.alert}>{err}</div> : null}

        {/* STATS */}
        <section className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statTop}>
              <FaUsers />
              <span>Total Users</span>
            </div>
            <div className={styles.statValue}>
              {countLoading ? "…" : fmtNum(totalUsersCount)}
            </div>
          
          </div>

          <div className={styles.statCard}>
            <div className={styles.statTop}>
              <FaCoins />
              <span>Loaded Rows</span>
            </div>
            <div className={styles.statValue}>
              {loading ? "…" : `${fmtNum(rows.length)} / ${fmtNum(total)}`}
            </div>
          
          </div>
        </section>

        {/* FILTERS */}
        <section className={styles.toolsRow}>
          <div className={styles.searchWrap}>
            <FaSearch className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search: email, username, full name…"
            />
          </div>

          <div className={styles.filterWrap}>
            <FaFilter className={styles.filterIcon} />
            <select className={styles.select} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">All Roles</option>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div className={styles.filterWrap}>
            <FaCheckCircle className={styles.filterIcon} />
            <select className={styles.select} value={verified} onChange={(e) => setVerified(e.target.value)}>
              <option value="">All Verified</option>
              <option value="1">Verified</option>
              <option value="0">Not Verified</option>
            </select>
          </div>

          <div className={styles.filterWrap}>
            <FaBan className={styles.filterIcon} />
            <select className={styles.select} value={blocked} onChange={(e) => setBlocked(e.target.value)}>
              <option value="">All Blocked</option>
              <option value="1">Blocked</option>
              <option value="0">Not Blocked</option>
            </select>
          </div>

          <div className={styles.dateWrap}>
            <label className={styles.dateLabel}>From</label>
            <input
              className={styles.dateInput}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className={styles.dateWrap}>
            <label className={styles.dateLabel}>To</label>
            <input
              className={styles.dateInput}
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className={styles.filterWrap}>
            <FaFilter className={styles.filterIcon} />
            <select className={styles.select} value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="75">75</option>
              <option value="100">100</option>
            </select>
          </div>

          <button
            className={styles.softBtn}
            type="button"
            onClick={resetFilters}
            disabled={busy || !filtersActive}
            title="Reset filters"
          >
            <FaTimes /> Reset
          </button>
        </section>

        {/* LIST */}
        <section className={styles.listCard}>
          <div className={styles.listHeader}>
            <div className={styles.listTitle}>
              <FaUsers /> Users
              <span className={styles.listCount}>
                {loading ? "…" : `${fmtNum(rows.length)} / ${fmtNum(total)}`}
              </span>
            </div>

            <div className={styles.pager}>
              <button
                className={styles.pagerBtn}
                type="button"
                disabled={!canPrev || loading || busy}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <FaChevronLeft />
              </button>
              <div className={styles.pagerInfo}>
                Page {fmtNum(page)} / {fmtNum(totalPages)}
              </div>
              <button
                className={styles.pagerBtn}
                type="button"
                disabled={!canNext || loading || busy}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
                  <th>Role</th>
                  <th>Bid Points</th>
                  <th>Verified</th>
                  <th>Blocked</th>
                  <th>Created</th>
                  <th style={{ width: 170 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className={styles.muted}>
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={styles.muted}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  rows.map((u) => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.userName}>
                            {u.full_name || "—"}
                          </div>
                          <div className={styles.userMeta}>
                            @{u.username || "—"} • {u.email || "—"}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.pill} ${u.role === "admin" ? styles.pillGold : styles.pillGray}`}>
                          {u.role || "user"}
                        </span>
                      </td>
                      <td>
                        <span className={styles.coins}>
                          <FaCoins style={{ marginRight: 6 }} />
                          {fmtNum(u.bid_points)}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.pill} ${Number(u.is_verified) ? styles.pillGreen : styles.pillGray}`}>
                          {Number(u.is_verified) ? "yes" : "no"}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.pill} ${Number(u.is_blocked) ? styles.pillRed : styles.pillGray}`}>
                          {Number(u.is_blocked) ? "yes" : "no"}
                        </span>
                      </td>
                      <td>{u.created_at_fmt || fmtDate(u.created_at)}</td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={styles.softBtnSmall}
                            type="button"
                            onClick={() => openEdit(u.id)}
                            disabled={busy}
                            title="Edit user"
                          >
                            <FaUserEdit /> Edit
                          </button>

                          <button
                            className={styles.dangerBtnSmall}
                            type="button"
                            onClick={() => deleteUser(u.id)}
                            disabled={busy}
                            title="Delete user"
                          >
                            <FaTrash /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

    
        </section>
      </main>

      {/* EDIT MODAL */}
      {showEdit ? (
        <div className={styles.modalOverlay} onMouseDown={closeEdit}>
          <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>
                  <FaShieldAlt /> Edit User
                </div>
                <div className={styles.modalSub}>
                  {editForm?.id ? `User #${editForm.id}` : "Loading…"}
                </div>
              </div>

              <button className={styles.iconBtn} type="button" onClick={closeEdit} disabled={busy}>
                <FaTimes />
              </button>
            </div>

            <div className={styles.modalBody}>
              {editLoading ? (
                <div className={styles.muted}>Loading user…</div>
              ) : editErr ? (
                <div className={styles.alert}>{editErr}</div>
              ) : (
                <>
                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label>Email</label>
                      <input
                        className={styles.textField}
                        value={editForm.email}
                        onChange={(e) => setEditForm((s) => ({ ...s, email: e.target.value }))}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label>Username</label>
                      <input
                        className={styles.textField}
                        value={editForm.username}
                        onChange={(e) => setEditForm((s) => ({ ...s, username: e.target.value }))}
                      />
                    </div>

                    <div className={styles.formFieldFull}>
                      <label>Full Name</label>
                      <input
                        className={styles.textField}
                        value={editForm.full_name}
                        onChange={(e) => setEditForm((s) => ({ ...s, full_name: e.target.value }))}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label>Role</label>
                      <select
                        className={styles.textField}
                        value={editForm.role}
                        onChange={(e) => setEditForm((s) => ({ ...s, role: e.target.value }))}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </div>

                    <div className={styles.formField}>
                      <label>Bid Points</label>
                      <input
                        className={styles.textField}
                        type="number"
                        min="0"
                        step="1"
                        value={editForm.bid_points}
                        onChange={(e) =>
                          setEditForm((s) => ({ ...s, bid_points: Number(e.target.value) }))
                        }
                      />
                    </div>

                    <div className={styles.formFieldFull}>
                      <label>Wallet Address</label>
                      <input
                        className={styles.textField}
                        value={editForm.wallet_address}
                        onChange={(e) => setEditForm((s) => ({ ...s, wallet_address: e.target.value }))}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label>Game ID</label>
                      <input
                        className={styles.textField}
                        value={editForm.game_id}
                        onChange={(e) => setEditForm((s) => ({ ...s, game_id: e.target.value }))}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label>Referral Code</label>
                      <input
                        className={styles.textField}
                        value={editForm.referral_code}
                        onChange={(e) => setEditForm((s) => ({ ...s, referral_code: e.target.value }))}
                      />
                    </div>

                    <div className={styles.switchRow}>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          checked={!!Number(editForm.is_verified)}
                          onChange={(e) => setEditForm((s) => ({ ...s, is_verified: e.target.checked ? 1 : 0 }))}
                        />
                        <span className={styles.slider} />
                        <span className={styles.switchLabel}>Verified</span>
                      </label>

                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          checked={!!Number(editForm.is_blocked)}
                          onChange={(e) => setEditForm((s) => ({ ...s, is_blocked: e.target.checked ? 1 : 0 }))}
                        />
                        <span className={styles.slider} />
                        <span className={styles.switchLabel}>Blocked</span>
                      </label>
                    </div>
                  </div>

                  <div className={styles.modalFooter}>
                    <button className={styles.softBtn} type="button" onClick={closeEdit} disabled={busy}>
                      Cancel
                    </button>
                    <button className={styles.primaryBtn} type="button" onClick={submitEdit} disabled={busy}>
                      <FaUserEdit /> Save Changes
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}