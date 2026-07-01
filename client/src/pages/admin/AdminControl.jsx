// src/pages/admin/AdminControl.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api"; // your axios instance
import AdminNavbar from "../../components/admin/Navbar";
import styles from "./AdminControl.module.css";

function safeInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

function isCopId(id) {
  return typeof id === "string" && id.startsWith("cop_");
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function fmtDate(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

export default function AdminControl() {
  // ───────────── Available heists ─────────────
  const [availBusy, setAvailBusy] = useState(false);
  const [availableHeists, setAvailableHeists] = useState([]);
  const [availError, setAvailError] = useState("");

  async function loadAvailableHeists() {
    try {
      setAvailBusy(true);
      setAvailError("");
      const res = await api.get("/admin/heists/availables"); // ✅ your route
      setAvailableHeists(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("load available heists error:", e);
      setAvailError(e?.response?.data?.message || e?.response?.data?.error || "Failed to load");
      setAvailableHeists([]);
    } finally {
      setAvailBusy(false);
    }
  }

  // ───────────── Heist controls ─────────────
  const [heistId, setHeistId] = useState("");

  // Add cop users modes: count | range | list
  const [addMode, setAddMode] = useState("count"); // count | range | list
  const [count, setCount] = useState(5);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(5);
  const [numbersText, setNumbersText] = useState("1,2,3");

  const [addBusy, setAddBusy] = useState(false);
  const [addResult, setAddResult] = useState(null);

  // Set winner
  const [winnerId, setWinnerId] = useState("");
  const [winnerBusy, setWinnerBusy] = useState(false);
  const [winnerResult, setWinnerResult] = useState(null);

  // ───────────── Demo users ─────────────
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoUsers, setDemoUsers] = useState([]);

  // Create demo user
  const [createUser, setCreateUser] = useState({
    username: "",
    full_name: "",
    demo_user_id: "", // optional cop_...
    avatarFile: null,
  });

  // Edit demo user
  const [editId, setEditId] = useState("");
  const [editUser, setEditUser] = useState({
    username: "",
    full_name: "",
    avatarFile: null,
  });

  const heistIdNum = useMemo(() => safeInt(heistId), [heistId]);

  const parsedNumbers = useMemo(() => {
    const raw = String(numbersText || "")
      .split(/[\s,]+/)
      .map((x) => safeInt(x))
      .filter((n) => Number.isInteger(n) && n > 0);

    return Array.from(new Set(raw)).slice(0, 100);
  }, [numbersText]);

  async function loadDemoUsers() {
    try {
      setDemoBusy(true);
      const res = await api.get("/admin/demo-users");
      setDemoUsers(res.data?.data || []);
    } catch (e) {
      console.error("load demo users error:", e);
      alert(e?.response?.data?.message || "Failed to load demo users");
    } finally {
      setDemoBusy(false);
    }
  }

  useEffect(() => {
    loadDemoUsers();
    loadAvailableHeists(); // ✅ load on open
  }, []);

  // ───────────── Actions ─────────────
  async function submitAddCopUsers() {
    const hid = heistIdNum;
    if (!Number.isInteger(hid) || hid <= 0) return alert("Enter a valid Heist ID");

    let payload = {};
    if (addMode === "count") {
      const c = safeInt(count);
      if (!Number.isInteger(c) || c <= 0) return alert("Count must be > 0");
      payload = { count: clamp(c, 1, 100) };
    } else if (addMode === "range") {
      const f = safeInt(from);
      const t = safeInt(to);
      if (!Number.isInteger(f) || !Number.isInteger(t) || f <= 0 || t <= 0 || t < f) {
        return alert("Range invalid. Example: from 2 to 15");
      }
      if (t - f + 1 > 100) return alert("Range too large (max 100 users).");
      payload = { from: f, to: t };
    } else {
      if (!parsedNumbers.length) return alert("Enter numbers like 1,2,3");
      payload = { numbers: parsedNumbers };
    }

    try {
      setAddBusy(true);
      setAddResult(null);
      const res = await api.post(`/admin/heists/${hid}/add-cop-users`, payload);
      setAddResult(res.data);
    } catch (e) {
      console.error("add cop users error:", e);
      alert(e?.response?.data?.message || "Failed to add cop users");
    } finally {
      setAddBusy(false);
    }
  }

  async function submitSetWinner() {
    const hid = heistIdNum;
    if (!Number.isInteger(hid) || hid <= 0) return alert("Enter a valid Heist ID");
    if (!String(winnerId || "").trim()) return alert("Enter winner_id (numeric user id or cop_###)");

    try {
      setWinnerBusy(true);
      setWinnerResult(null);
      const res = await api.post(`/admin/heists/${hid}/set-winner`, {
        winner_id: String(winnerId).trim(),
      });
      setWinnerResult(res.data);

      // refresh list since winner completes the heist → may leave availables
      loadAvailableHeists();
    } catch (e) {
      console.error("set winner error:", e);
      alert(e?.response?.data?.message || "Failed to set winner");
    } finally {
      setWinnerBusy(false);
    }
  }

  async function submitCreateDemoUser(e) {
    e.preventDefault();

    const username = String(createUser.username || "").trim();
    const full_name = String(createUser.full_name || "").trim();
    const demo_user_id = String(createUser.demo_user_id || "").trim();

    if (!username || !full_name) return alert("username and full_name are required");
    if (demo_user_id && !isCopId(demo_user_id)) return alert("demo_user_id must start with cop_");

    const fd = new FormData();
    fd.append("username", username);
    fd.append("full_name", full_name);
    if (demo_user_id) fd.append("demo_user_id", demo_user_id);
    if (createUser.avatarFile) fd.append("avatar", createUser.avatarFile);

    try {
      setDemoBusy(true);
      await api.post("/admin/demo-users", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCreateUser({ username: "", full_name: "", demo_user_id: "", avatarFile: null });
      await loadDemoUsers();
      alert("Cop demo user created");
    } catch (e2) {
      console.error("create demo user error:", e2);
      alert(e2?.response?.data?.message || "Failed to create demo user");
    } finally {
      setDemoBusy(false);
    }
  }

  function startEdit(u) {
    setEditId(u.id);
    setEditUser({
      username: u.username || "",
      full_name: u.full_name || "",
      avatarFile: null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitUpdateDemoUser(e) {
    e.preventDefault();
    if (!editId) return;

    const username = String(editUser.username || "").trim();
    const full_name = String(editUser.full_name || "").trim();
    if (!username || !full_name) return alert("username and full_name are required");

    const fd = new FormData();
    fd.append("username", username);
    fd.append("full_name", full_name);
    if (editUser.avatarFile) fd.append("avatar", editUser.avatarFile);

    try {
      setDemoBusy(true);
      await api.put(`/admin/demo-users/${editId}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setEditId("");
      setEditUser({ username: "", full_name: "", avatarFile: null });
      await loadDemoUsers();
      alert("Cop demo user updated");
    } catch (e2) {
      console.error("update demo user error:", e2);
      alert(e2?.response?.data?.message || "Failed to update demo user");
    } finally {
      setDemoBusy(false);
    }
  }

  async function deleteDemoUser(id) {
    if (!window.confirm(`Delete ${id}? (will fail if used in heists)`)) return;
    try {
      setDemoBusy(true);
      await api.delete(`/admin/demo-users/${id}`);
      await loadDemoUsers();
    } catch (e) {
      console.error("delete demo user error:", e);
      alert(e?.response?.data?.message || "Failed to delete demo user");
    } finally {
      setDemoBusy(false);
    }
  }

  async function forceDeleteDemoUser(id) {
    if (!window.confirm(`FORCE delete ${id}? (removes from participants + winner)`)) return;
    try {
      setDemoBusy(true);
      await api.delete(`/admin/demo-users/${id}/force`);
      await loadDemoUsers();
    } catch (e) {
      console.error("force delete demo user error:", e);
      alert(e?.response?.data?.message || "Failed to force delete demo user");
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <>
      {/* ✅ requested */}
      <AdminNavbar />

      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <button className={styles.backBtn} type="button" onClick={() => window.history.back()}>
              ← Back
            </button>
            <div>
              <h1 className={styles.title}>Admin Control</h1>
              <p className={styles.sub}>Available heists • Cop demo users • Add participants • Set winner</p>
            </div>
          </header>

          {/* ✅ Available Heists */}
          <section className={styles.card}>
            <div className={styles.cardHeadRow}>
              <h2>Available Heists (pending / started)</h2>
              <button className={styles.soft} onClick={loadAvailableHeists} disabled={availBusy}>
                {availBusy ? "Loading…" : "Refresh"}
              </button>
            </div>

            {availError ? <div className={styles.errorBox}>{availError}</div> : null}

            {!availBusy && availableHeists.length === 0 ? (
              <div className={styles.emptyBox}>No available heists right now.</div>
            ) : null}

            {availableHeists.length ? (
              <div className={styles.availGrid}>
                {availableHeists.map((h) => (
                  <div key={h.id} className={styles.availCard}>
                    <div className={styles.availTop}>
                      <div>
                        <div className={styles.availTitle}>
                          #{h.id} • {h.name || "Heist"}
                        </div>
                        <div className={styles.availMeta}>
                          Status: <b>{h.status}</b> • Category: <b>{h.category || "—"}</b>
                        </div>
                        <div className={styles.availMeta}>
                          Min users: <b>{h.min_users ?? "—"}</b> • Prize: <b>{h.prize ?? "—"}</b>
                        </div>
                        <div className={styles.availMeta}>Created: {fmtDate(h.created_at)}</div>
                      </div>

                      <div className={styles.availActions}>
                        <button
                          type="button"
                          className={styles.primarySmall}
                          onClick={() => setHeistId(String(h.id))}
                        >
                          Use this Heist
                        </button>
                      </div>
                    </div>

                    {h.prize_image ? (
                      <div className={styles.availImgWrap}>
                        <img className={styles.availImg} src={h.prize_image} alt={h.name || "heist"} />
                      </div>
                    ) : (
                      <div className={styles.availNoImg}>No prize image</div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {/* Heist Control */}
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h2>Heist Controls</h2>
            </div>

            <div className={styles.grid2}>
              <div className={styles.field}>
                <label>Heist ID</label>
                <input value={heistId} onChange={(e) => setHeistId(e.target.value)} placeholder="e.g. 12" />
              </div>

              <div className={styles.field}>
                <label>Mode</label>
                <select value={addMode} onChange={(e) => setAddMode(e.target.value)}>
                  <option value="count">Count (1..count)</option>
                  <option value="range">Range (from..to)</option>
                  <option value="list">List (numbers array)</option>
                </select>
              </div>

              {addMode === "count" ? (
                <div className={styles.field}>
                  <label>Count (max 100)</label>
                  <input type="number" min="1" max="100" value={count} onChange={(e) => setCount(e.target.value)} />
                </div>
              ) : null}

              {addMode === "range" ? (
                <>
                  <div className={styles.field}>
                    <label>From</label>
                    <input type="number" min="1" value={from} onChange={(e) => setFrom(e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label>To (max 100 range)</label>
                    <input type="number" min="1" value={to} onChange={(e) => setTo(e.target.value)} />
                  </div>
                </>
              ) : null}

              {addMode === "list" ? (
                <div className={styles.fieldFull}>
                  <label>Numbers (comma or space separated)</label>
                  <textarea
                    rows={3}
                    value={numbersText}
                    onChange={(e) => setNumbersText(e.target.value)}
                    placeholder="e.g. 1,2,3,10,22"
                  />
                  <div className={styles.hint}>
                    Parsed: {parsedNumbers.length ? parsedNumbers.join(", ") : "—"} (max 100)
                  </div>
                </div>
              ) : null}
            </div>

            <div className={styles.actions}>
              <button className={styles.primary} onClick={submitAddCopUsers} disabled={addBusy}>
                {addBusy ? "Processing…" : "Add Cop Users"}
              </button>
            </div>

            {addResult ? <pre className={styles.pre}>{JSON.stringify(addResult, null, 2)}</pre> : null}
          </section>

          {/* Set Winner */}
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h2>Set Heist Winner</h2>
            </div>

            <div className={styles.grid2}>
              <div className={styles.field}>
                <label>Heist ID</label>
                <input value={heistId} onChange={(e) => setHeistId(e.target.value)} />
              </div>

              <div className={styles.field}>
                <label>Winner ID</label>
                <input
                  value={winnerId}
                  onChange={(e) => setWinnerId(e.target.value)}
                  placeholder="numeric user id OR cop_12"
                />
                <div className={styles.hint}>Accepts: numeric user id OR cop_### id</div>
              </div>
            </div>

            <div className={styles.actions}>
              <button className={styles.primary} onClick={submitSetWinner} disabled={winnerBusy}>
                {winnerBusy ? "Saving…" : "Set Winner + Complete"}
              </button>
            </div>

            {winnerResult ? <pre className={styles.pre}>{JSON.stringify(winnerResult, null, 2)}</pre> : null}
          </section>

          {/* Demo Users */}
          <section className={styles.card}>
            <div className={styles.cardHeadRow}>
              <h2>Cop Demo Users</h2>
              <button className={styles.soft} onClick={loadDemoUsers} disabled={demoBusy}>
                {demoBusy ? "Loading…" : "Refresh"}
              </button>
            </div>

            {/* Edit form */}
            {editId ? (
              <form className={styles.form} onSubmit={submitUpdateDemoUser}>
                <div className={styles.formTitle}>Edit: {editId}</div>

                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label>Username</label>
                    <input
                      value={editUser.username}
                      onChange={(e) => setEditUser((p) => ({ ...p, username: e.target.value }))}
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Full Name</label>
                    <input
                      value={editUser.full_name}
                      onChange={(e) => setEditUser((p) => ({ ...p, full_name: e.target.value }))}
                    />
                  </div>

                  <div className={styles.fieldFull}>
                    <label>Avatar (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditUser((p) => ({ ...p, avatarFile: e.target.files?.[0] || null }))}
                    />
                  </div>
                </div>

                <div className={styles.actions}>
                  <button className={styles.primary} type="submit" disabled={demoBusy}>
                    Save Changes
                  </button>
                  <button
                    className={styles.ghost}
                    type="button"
                    onClick={() => {
                      setEditId("");
                      setEditUser({ username: "", full_name: "", avatarFile: null });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            {/* Create form */}
            <form className={styles.form} onSubmit={submitCreateDemoUser}>
              <div className={styles.formTitle}>Create Cop Demo User</div>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label>Username</label>
                  <input
                    value={createUser.username}
                    onChange={(e) => setCreateUser((p) => ({ ...p, username: e.target.value }))}
                    placeholder="cop007"
                  />
                </div>

                <div className={styles.field}>
                  <label>Full Name</label>
                  <input
                    value={createUser.full_name}
                    onChange={(e) => setCreateUser((p) => ({ ...p, full_name: e.target.value }))}
                    placeholder="Cop Player 7"
                  />
                </div>

                <div className={styles.field}>
                  <label>Custom ID (optional)</label>
                  <input
                    value={createUser.demo_user_id}
                    onChange={(e) => setCreateUser((p) => ({ ...p, demo_user_id: e.target.value }))}
                    placeholder="cop_7"
                  />
                  <div className={styles.hint}>If empty, server creates cop_{`{Date.now()}`}</div>
                </div>

                <div className={styles.field}>
                  <label>Avatar (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCreateUser((p) => ({ ...p, avatarFile: e.target.files?.[0] || null }))}
                  />
                </div>
              </div>

              <div className={styles.actions}>
                <button className={styles.primary} type="submit" disabled={demoBusy}>
                  Create User
                </button>
              </div>
            </form>

            {/* List */}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Avatar</th>
                    <th>Created</th>
                    <th style={{ width: 280 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {demoUsers.map((u) => (
                    <tr key={u.id}>
                      <td className={styles.mono}>{u.id}</td>
                      <td>{u.username}</td>
                      <td>{u.full_name}</td>
                      <td>
                        {u.avatar ? (
                          <a href={u.avatar} target="_blank" rel="noreferrer">
                            view
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{u.created_at ? new Date(u.created_at).toLocaleString() : "—"}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <button className={styles.soft} onClick={() => startEdit(u)} type="button">
                            Edit
                          </button>
                          <button className={styles.danger} onClick={() => deleteDemoUser(u.id)} type="button">
                            Delete
                          </button>
                          <button
                            className={styles.dangerOutline}
                            onClick={() => forceDeleteDemoUser(u.id)}
                            type="button"
                          >
                            Force
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!demoBusy && demoUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={styles.empty}>
                        No demo users yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}