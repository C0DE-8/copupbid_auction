// src/pages/admin/AdminAffiliates.jsx
import React, { useEffect, useMemo, useState } from "react";
import AdminNavbar from "../../components/admin/Navbar";
import { ToastProvider, useToast } from "../../components/ui/Toaster";
import { api } from "../../lib/api";
import styles from "./AdminAffiliates.module.css";

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

export default function AdminAffiliates() {
  return (
    <ToastProvider>
      <AdminAffiliatesInner />
    </ToastProvider>
  );
}

function AdminAffiliatesInner() {
  const toast = useToast();

  const [tab, setTab] = useState("heists"); // "heists" | "auctions"
  const [busy, setBusy] = useState(false);

  // ------------------------ AUCTIONS ------------------------
  const [aLoading, setALoading] = useState(false);
  const [auctionsReq, setAuctionsReq] = useState([]);
  const [auctionForm, setAuctionForm] = useState({
    auctionId: "",
    targetUsers: 1,
    rewardBidPoints: 0,
  });

  const loadAuctionAffiliateList = async () => {
    try {
      setALoading(true);
      // backend returns 404 if none, we treat as empty
      const res = await api.get("/admin/affiliate/list");
      setAuctionsReq(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err?.response?.status === 404) {
        setAuctionsReq([]);
      } else {
        console.error("Auction affiliate list error:", err);
        toast.error(err?.response?.data?.message || "Failed to load auction affiliate list");
      }
    } finally {
      setALoading(false);
    }
  };

  const submitAuctionRequirement = async (e) => {
    e.preventDefault();
    const auctionId = safeNum(auctionForm.auctionId, 0);
    const targetUsers = safeNum(auctionForm.targetUsers, 0);
    const rewardBidPoints = safeNum(auctionForm.rewardBidPoints, 0);

    if (!Number.isInteger(auctionId) || auctionId <= 0) return toast.warn("Enter a valid Auction ID");
    if (!Number.isInteger(targetUsers) || targetUsers < 1) return toast.warn("targetUsers must be >= 1");
    if (!Number.isInteger(rewardBidPoints) || rewardBidPoints < 0) return toast.warn("rewardBidPoints must be >= 0");

    try {
      setBusy(true);
      await api.post(`/admin/affiliate/set-requirement/${auctionId}`, {
        targetUsers,
        rewardBidPoints,
      });
      toast.success("Auction affiliate requirement saved");
      await loadAuctionAffiliateList();
      setAuctionForm((p) => ({ ...p, auctionId: "" }));
    } catch (err) {
      console.error("Set auction requirement error:", err);
      toast.error(err?.response?.data?.message || "Failed to save auction requirement");
    } finally {
      setBusy(false);
    }
  };

  // ------------------------ HEISTS ------------------------
  const [hLoading, setHLoading] = useState(false);
  const [heists, setHeists] = useState([]);
  const [hPage, setHPage] = useState(1);
  const [hTotal, setHTotal] = useState(0);
  const [hLimit, setHLimit] = useState(20);

  const [hFilters, setHFilters] = useState({
    q: "",
    status: "",
    category: "",
  });

  const [heistDraft, setHeistDraft] = useState({}); // { [heistId]: { targetUsers, rewardBidPoints } }

  const patchHeistDraft = (heistId, patch) => {
    setHeistDraft((prev) => ({
      ...prev,
      [heistId]: { ...(prev[heistId] || {}), ...patch },
    }));
  };

  const hTotalPages = useMemo(() => {
    const pages = Math.ceil(safeNum(hTotal, 0) / Math.max(1, safeNum(hLimit, 20)));
    return Math.max(1, pages);
  }, [hTotal, hLimit]);

  const loadHeists = async () => {
    try {
      setHLoading(true);
      const res = await api.get("/admin/heists", {
        params: {
          ...hFilters,
          page: hPage,
          limit: hLimit,
        },
      });

      const rows = res.data?.data || [];
      setHeists(rows);
      setHTotal(res.data?.total || 0);
    } catch (err) {
      console.error("Load heists error:", err);
      toast.error(err?.response?.data?.message || "Failed to load heists");
    } finally {
      setHLoading(false);
    }
  };

  const submitHeistRequirement = async (heistId) => {
    const d = heistDraft[heistId] || {};
    const targetUsers = safeNum(d.targetUsers, NaN);
    const rewardBidPoints = safeNum(d.rewardBidPoints, NaN);

    if (!Number.isInteger(heistId) || heistId <= 0) return toast.error("Invalid heistId");
    if (!Number.isInteger(targetUsers) || targetUsers < 0) return toast.warn("targetUsers must be a non-negative integer");
    if (!Number.isInteger(rewardBidPoints) || rewardBidPoints < 0) return toast.warn("rewardBidPoints must be a non-negative integer");

    try {
      setBusy(true);
      await api.post(`/admin/affiliate/set-requirement/heist/${heistId}`, {
        targetUsers,
        rewardBidPoints,
      });
      toast.success("Heist affiliate requirement saved");
      await loadHeists();
    } catch (err) {
      console.error("Set heist requirement error:", err);
      toast.error(err?.response?.data?.message || "Failed to save heist requirement");
    } finally {
      setBusy(false);
    }
  };

  const deleteHeistRequirement = async (heistId) => {
    if (!window.confirm("Delete affiliate requirement for this heist?")) return;

    try {
      setBusy(true);
      await api.delete(`/admin/heist/affiliate/delete/${heistId}`);
      toast.success("Heist affiliate requirement deleted");
      await loadHeists();
    } catch (err) {
      console.error("Delete heist affiliate requirement error:", err);
      toast.error(err?.response?.data?.message || "Failed to delete heist requirement");
    } finally {
      setBusy(false);
    }
  };

  // ------------------------ EFFECTS ------------------------
  useEffect(() => {
    if (tab === "auctions") loadAuctionAffiliateList();
    if (tab === "heists") loadHeists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab !== "heists") return;
    loadHeists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hPage, hLimit, hFilters]);

  useEffect(() => {
    if (tab !== "heists") return;
    setHPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hFilters.q, hFilters.status, hFilters.category]);

  const refresh = async () => {
    if (tab === "auctions") return loadAuctionAffiliateList();
    return loadHeists();
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
                <h2 className={styles.title}>Affiliate Requirements</h2>
                <p className={styles.sub}>
                  Configure affiliate targets + rewards for auctions and heists.
                </p>
              </div>
            </div>

            <div className={styles.headerActions}>
              <button className={styles.softBtn} type="button" onClick={refresh} disabled={busy}>
                ↻ Refresh
              </button>
            </div>
          </header>

          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === "heists" ? styles.tabActive : ""}`}
              onClick={() => setTab("heists")}
            >
              Heists
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === "auctions" ? styles.tabActive : ""}`}
              onClick={() => setTab("auctions")}
            >
              Auctions
            </button>
          </div>

          {/* ------------------------ HEISTS TAB ------------------------ */}
          {tab === "heists" ? (
            <>
              <section className={styles.tools}>
                <div className={styles.searchWrap}>
                  <input
                    className={styles.input}
                    placeholder="Search heists by name/story…"
                    value={hFilters.q}
                    onChange={(e) => setHFilters((p) => ({ ...p, q: e.target.value }))}
                  />
                </div>

                <select
                  className={styles.select}
                  value={hFilters.status}
                  onChange={(e) => setHFilters((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="">All Status</option>
                  {["pending", "active", "completed", "cancelled", "hold"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  className={styles.select}
                  value={hFilters.category}
                  onChange={(e) => setHFilters((p) => ({ ...p, category: e.target.value }))}
                >
                  <option value="">All Category</option>
                  {["cash", "product", "coupon"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  className={styles.select}
                  value={String(hLimit)}
                  onChange={(e) => setHLimit(Number(e.target.value))}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>

                <div className={styles.pager}>
                  <button
                    className={styles.pagerBtn}
                    type="button"
                    onClick={() => setHPage((p) => Math.max(1, p - 1))}
                    disabled={busy || hLoading || hPage <= 1}
                  >
                    ‹
                  </button>

                  <div className={styles.pagerInfo}>
                    Page {hPage} / {hTotalPages} • Total {safeNum(hTotal, 0)}
                    {hLoading ? " • Loading…" : ""}
                  </div>

                  <button
                    className={styles.pagerBtn}
                    type="button"
                    onClick={() => setHPage((p) => Math.min(hTotalPages, p + 1))}
                    disabled={busy || hLoading || hPage >= hTotalPages}
                  >
                    ›
                  </button>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={styles.cardTitle}>Heists (Affiliate Settings)</div>
                </div>

                {hLoading ? (
                  <div className={styles.centerMuted}>Loading…</div>
                ) : heists.length === 0 ? (
                  <div className={styles.centerMuted}>No heists found.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Heist</th>
                          <th>Status</th>
                          <th>Category</th>
                          <th>Affiliate Target</th>
                          <th>Reward Points</th>
                          <th>Updated</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {heists.map((h) => {
                          const id = Number(h.id);
                          const hasAffiliate = h.target_users !== null && h.target_users !== undefined;

                          const draft = heistDraft[id] || {};
                          const currentTarget = hasAffiliate ? safeNum(h.target_users, 0) : null;
                          const currentReward = hasAffiliate ? safeNum(h.reward_bid_points, 0) : null;

                          return (
                            <tr key={id}>
                              <td className={styles.mono}>#{id}</td>

                              <td>
                                <div className={styles.cellTitle}>{h.name || "—"}</div>
                                <div className={styles.mutedSmall}>
                                  Participants: {safeNum(h.participants_count, 0)}
                                </div>
                              </td>

                              <td>
                                <span className={`${styles.badge} ${styles.badgeSoft}`}>
                                  {String(h.status || "—")}
                                </span>
                              </td>

                              <td>
                                <span className={`${styles.badge} ${styles.badgeSoft}`}>
                                  {String(h.category || "—")}
                                </span>
                              </td>

                              <td>
                                <div className={styles.inlineField}>
                                  <input
                                    className={styles.inputSmall}
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder={currentTarget === null ? "—" : String(currentTarget)}
                                    value={draft.targetUsers ?? ""}
                                    onChange={(e) =>
                                      patchHeistDraft(id, { targetUsers: e.target.value })
                                    }
                                  />
                                  <div className={styles.hint}>
                                    Current: {currentTarget === null ? "none" : currentTarget}
                                  </div>
                                </div>
                              </td>

                              <td>
                                <div className={styles.inlineField}>
                                  <input
                                    className={styles.inputSmall}
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder={currentReward === null ? "—" : String(currentReward)}
                                    value={draft.rewardBidPoints ?? ""}
                                    onChange={(e) =>
                                      patchHeistDraft(id, { rewardBidPoints: e.target.value })
                                    }
                                  />
                                  <div className={styles.hint}>
                                    Current: {currentReward === null ? "none" : currentReward}
                                  </div>
                                </div>
                              </td>

                              <td className={styles.mutedSmall}>
                                {h.updated_at ? fmtDate(h.updated_at) : "—"}
                              </td>

                              <td className={styles.actions}>
                                <button
                                  className={styles.primaryBtnSmall}
                                  type="button"
                                  disabled={busy}
                                  onClick={() => submitHeistRequirement(id)}
                                >
                                  ✅ Save
                                </button>

                                <button
                                  className={styles.dangerBtnSmall}
                                  type="button"
                                  disabled={busy || !hasAffiliate}
                                  onClick={() => deleteHeistRequirement(id)}
                                  title={!hasAffiliate ? "No requirement to delete" : "Delete requirement"}
                                >
                                  🗑 Delete
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
            </>
          ) : null}

          {/* ------------------------ AUCTIONS TAB ------------------------ */}
          {tab === "auctions" ? (
            <>
              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={styles.cardTitle}>Set Auction Affiliate Requirement</div>
                </div>

                <div className={styles.cardBody}>
                  <form className={styles.formRow} onSubmit={submitAuctionRequirement}>
                    <div className={styles.formField}>
                      <label className={styles.label}>Auction ID</label>
                      <input
                        className={styles.input}
                        value={auctionForm.auctionId}
                        onChange={(e) => setAuctionForm((p) => ({ ...p, auctionId: e.target.value }))}
                        placeholder="e.g. 12"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.label}>Target Users</label>
                      <input
                        className={styles.input}
                        type="number"
                        min="1"
                        step="1"
                        value={auctionForm.targetUsers}
                        onChange={(e) => setAuctionForm((p) => ({ ...p, targetUsers: e.target.value }))}
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.label}>Reward Bid Points</label>
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        step="1"
                        value={auctionForm.rewardBidPoints}
                        onChange={(e) => setAuctionForm((p) => ({ ...p, rewardBidPoints: e.target.value }))}
                      />
                    </div>

                    <div className={styles.formActions}>
                      <button className={styles.primaryBtn} type="submit" disabled={busy}>
                        {busy ? "Saving…" : "Save Requirement"}
                      </button>
                    </div>
                  </form>

                  <div className={styles.note}>
                    Uses: <span className={styles.mono}>POST /api/admin/affiliate/set-requirement/:auctionId</span>
                  </div>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={styles.cardTitle}>Auctions With Affiliate Requirements</div>
                </div>

                {aLoading ? (
                  <div className={styles.centerMuted}>Loading…</div>
                ) : auctionsReq.length === 0 ? (
                  <div className={styles.centerMuted}>No auctions with affiliate requirements yet.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Auction</th>
                          <th>Target Users</th>
                          <th>Reward Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auctionsReq.map((a) => (
                          <tr key={a.id}>
                            <td className={styles.mono}>#{a.id}</td>
                            <td>
                              <div className={styles.cellTitle}>{a.name || "—"}</div>
                              <div className={styles.mutedSmall}>{a.description || "—"}</div>
                            </td>
                            <td className={styles.mono}>{safeNum(a.target_users, 0)}</td>
                            <td className={styles.mono}>{safeNum(a.reward_bid_points, 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}