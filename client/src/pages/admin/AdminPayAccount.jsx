// src/pages/admin/AdminPayAccount.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import styles from "./AdminPayAccount.module.css";
import AdminNavbar from "../../components/admin/Navbar";
import { ToastProvider, useToast } from "../../components/ui/Toaster";
import Modal from "../../components/ui/Modal";

import { FiRefreshCw, FiSave, FiEdit3, FiLock, FiCheckCircle, FiXCircle } from "react-icons/fi";

function fmtDate(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function toUpper3(v, fallback = "NGN") {
  const s = String(v || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(s) ? s : fallback;
}

export default function AdminPayAccount() {
  return (
    <ToastProvider>
      <AdminPayAccountInner />
    </ToastProvider>
  );
}

function AdminPayAccountInner() {
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // if GET returns 404 → not configured yet
  const [notConfigured, setNotConfigured] = useState(false);

  const [current, setCurrent] = useState(null);

  const [form, setForm] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
    currency: "NGN",
    is_active: true,
    notes: "",
  });

  // confirm modal
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

  const fetchPayAccount = async () => {
    try {
      setLoading(true);
      setNotConfigured(false);

      const res = await api.get("/admin/pay-account");
      const r = res.data || null;

      setCurrent(r);

      setForm({
        bank_name: r?.bank_name || "",
        account_name: r?.account_name || "",
        account_number: r?.account_number || "",
        currency: toUpper3(r?.currency, "NGN"),
        is_active: !!r?.is_active,
        notes: r?.notes || "",
      });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        setNotConfigured(true);
        setCurrent(null);
        setForm((p) => ({
          ...p,
          currency: "NGN",
          is_active: true,
        }));
        toast.warn("Pay account not configured yet. Set it up below.");
      } else {
        console.error("Fetch pay account error:", err);
        toast.error(err?.response?.data?.message || "Failed to fetch pay account");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateClient = () => {
    const bank_name = String(form.bank_name || "").trim();
    const account_name = String(form.account_name || "").trim();
    const account_number = String(form.account_number || "").trim();
    const currency = String(form.currency || "").trim().toUpperCase();

    if (!bank_name) return "bank_name cannot be empty";
    if (!account_name) return "account_name cannot be empty";
    if (!/^[0-9A-Za-z\-\s]{5,40}$/.test(account_number)) return "Invalid account_number format";
    if (!/^[A-Z]{3}$/.test(currency)) return "currency must be 3 letters (e.g. NGN, USD)";
    return null;
  };

  // Only send changed fields (and always send is_active/currency if you changed them)
  const buildPatchPayload = () => {
    const payload = {};

    const next = {
      bank_name: String(form.bank_name || "").trim(),
      account_name: String(form.account_name || "").trim(),
      account_number: String(form.account_number || "").trim(),
      currency: toUpper3(form.currency, "NGN"),
      is_active: !!form.is_active,
      notes: form.notes === undefined ? "" : String(form.notes),
    };

    // First time setup (no current): backend requires core fields.
    if (!current) {
      payload.bank_name = next.bank_name;
      payload.account_name = next.account_name;
      payload.account_number = next.account_number;
      payload.currency = next.currency;
      payload.is_active = next.is_active;
      payload.notes = next.notes;
      return payload;
    }

    // Update only provided fields (diff-based)
    if (next.bank_name !== String(current.bank_name || "")) payload.bank_name = next.bank_name;
    if (next.account_name !== String(current.account_name || "")) payload.account_name = next.account_name;
    if (next.account_number !== String(current.account_number || "")) payload.account_number = next.account_number;

    if (next.currency !== toUpper3(current.currency, "NGN")) payload.currency = next.currency;
    if (next.is_active !== !!current.is_active) payload.is_active = next.is_active;

    if (next.notes !== String(current.notes || "")) payload.notes = next.notes;

    return payload;
  };

  const canSave = useMemo(() => {
    const err = validateClient();
    if (err) return false;

    const payload = buildPatchPayload();
    return Object.keys(payload).length > 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, current]);

  const onSave = async () => {
    const err = validateClient();
    if (err) return toast.error(err);

    const payload = buildPatchPayload();
    if (!Object.keys(payload).length) return toast.warn("No changes to save");

    try {
      setBusy(true);
      const res = await api.patch("/admin/pay-account", payload);
      toast.success(res.data?.message || "Pay account updated");
      await fetchPayAccount();
    } catch (e) {
      console.error("Save pay account error:", e);
      toast.error(e?.response?.data?.message || "Failed to update pay account");
    } finally {
      setBusy(false);
      closeConfirm();
    }
  };

  const confirmSave = () => {
    openConfirm({
      title: current ? "Update pay account?" : "Setup pay account?",
      subtitle: "PATCH /api/admin/pay-account",
      tone: "warn",
      confirmText: current ? "Yes, update" : "Yes, setup",
      cancelText: "Cancel",
      message: current
        ? "This will update the payout payment account details."
        : "This will create the pay account row (first-time setup).",
      action: onSave,
    });
  };

  const resetToCurrent = () => {
    if (!current) {
      setForm({
        bank_name: "",
        account_name: "",
        account_number: "",
        currency: "NGN",
        is_active: true,
        notes: "",
      });
      return;
    }
    setForm({
      bank_name: current.bank_name || "",
      account_name: current.account_name || "",
      account_number: current.account_number || "",
      currency: toUpper3(current.currency, "NGN"),
      is_active: !!current.is_active,
      notes: current.notes || "",
    });
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
                <h2 className={styles.title}>Pay Account</h2>
                <p className={styles.sub}>
                  Configure the admin payment account shown to users for payouts / settlements.
                </p>
              </div>
            </div>

            <div className={styles.headerActions}>
              <button
                className={styles.softBtn}
                type="button"
                onClick={fetchPayAccount}
                disabled={busy || loading}
              >
                <FiRefreshCw /> Refresh
              </button>

              <button
                className={styles.primaryBtn}
                type="button"
                disabled={busy || loading || !canSave}
                onClick={confirmSave}
                title={!canSave ? "No changes or invalid fields" : "Save changes"}
              >
                <FiSave /> Save
              </button>
            </div>
          </header>

          {/* Current card */}
          <section className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>Current Configuration</div>
                <div className={styles.mutedSmall}>
                  {loading ? "Loading…" : `Updated: ${fmtDate(current?.updated_at)}`}
                </div>
              </div>

              {notConfigured ? (
                <div className={styles.centerMuted}>
                  <div className={styles.alertRow}>
                    <span className={styles.badgeWarn}>
                      <FiLock /> Not configured
                    </span>
                    <span className={styles.mutedSmall}>
                      No pay_account row exists yet. Use the form to set it up.
                    </span>
                  </div>
                </div>
              ) : !current ? (
                <div className={styles.centerMuted}>No data.</div>
              ) : (
                <div className={styles.currentGrid}>
                  <div className={styles.infoBox}>
                    <div className={styles.infoLabel}>Bank</div>
                    <div className={styles.infoValue}>{current.bank_name || "—"}</div>
                  </div>

                  <div className={styles.infoBox}>
                    <div className={styles.infoLabel}>Account Name</div>
                    <div className={styles.infoValue}>{current.account_name || "—"}</div>
                  </div>

                  <div className={styles.infoBox}>
                    <div className={styles.infoLabel}>Account Number</div>
                    <div className={styles.infoValue}>
                      <span className={styles.mono}>{current.account_number || "—"}</span>
                    </div>
                  </div>

                  <div className={styles.infoBox}>
                    <div className={styles.infoLabel}>Currency</div>
                    <div className={styles.infoValue}>
                      <span className={styles.badge}>{toUpper3(current.currency, "NGN")}</span>
                    </div>
                  </div>

                  <div className={styles.infoBox}>
                    <div className={styles.infoLabel}>Active</div>
                    <div className={styles.infoValue}>
                      {current.is_active ? (
                        <span className={styles.badgeGood}>
                          <FiCheckCircle /> Active
                        </span>
                      ) : (
                        <span className={styles.badgeBad}>
                          <FiXCircle /> Disabled
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.infoBox} style={{ gridColumn: "1 / -1" }}>
                    <div className={styles.infoLabel}>Notes</div>
                    <div className={styles.infoValue}>
                      {current.notes ? <span className={styles.noteText}>{current.notes}</span> : "—"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Edit card */}
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>Edit Pay Account</div>
                <div className={styles.mutedSmall}>
                  {current ? "Updates only changed fields" : "First-time setup required fields"}
                </div>
              </div>

              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  confirmSave();
                }}
              >
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Bank Name *</label>
                    <input
                      className={styles.input}
                      value={form.bank_name}
                      onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))}
                      placeholder="e.g. Access Bank"
                      disabled={busy}
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Account Name *</label>
                    <input
                      className={styles.input}
                      value={form.account_name}
                      onChange={(e) => setForm((p) => ({ ...p, account_name: e.target.value }))}
                      placeholder="e.g. CopupBid Limited"
                      disabled={busy}
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Account Number *</label>
                    <input
                      className={styles.input}
                      value={form.account_number}
                      onChange={(e) => setForm((p) => ({ ...p, account_number: e.target.value }))}
                      placeholder="e.g. 0123456789"
                      disabled={busy}
                      required
                    />
                    <div className={styles.help}>Allowed: 5–40 chars, digits/letters/spaces/dash</div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Currency (3 letters)</label>
                    <input
                      className={styles.input}
                      value={form.currency}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))
                      }
                      placeholder="NGN"
                      disabled={busy}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Status</label>
                    <div className={styles.switchRow}>
                      <button
                        type="button"
                        className={`${styles.toggle} ${form.is_active ? styles.toggleOn : ""}`}
                        disabled={busy}
                        onClick={() => setForm((p) => ({ ...p, is_active: true }))}
                        title="Enable pay account"
                      >
                        <FiCheckCircle /> Active
                      </button>

                      <button
                        type="button"
                        className={`${styles.toggle} ${!form.is_active ? styles.toggleOff : ""}`}
                        disabled={busy}
                        onClick={() => setForm((p) => ({ ...p, is_active: false }))}
                        title="Disable pay account"
                      >
                        <FiXCircle /> Disabled
                      </button>
                    </div>
                  </div>

                  <div className={styles.fieldFull}>
                    <label className={styles.label}>Notes</label>
                    <textarea
                      className={styles.textarea}
                      rows={4}
                      value={form.notes}
                      onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Admin notes (optional)…"
                      disabled={busy}
                    />
                  </div>
                </div>

                <div className={styles.actions}>
                  <button
                    className={styles.primaryBtn}
                    type="submit"
                    disabled={busy || loading || !canSave}
                  >
                    <FiEdit3 /> {busy ? "Saving…" : "Save Changes"}
                  </button>

                  <button
                    className={styles.softBtn}
                    type="button"
                    onClick={resetToCurrent}
                    disabled={busy}
                  >
                    Reset
                  </button>
                </div>

                <div className={styles.preview}>
                  <div className={styles.previewTitle}>Preview</div>
                  <div className={styles.previewLine}>
                    <span className={styles.badgeSoft}>bank</span>{" "}
                    <span className={styles.mono}>{form.bank_name || "—"}</span>
                  </div>
                  <div className={styles.previewLine}>
                    <span className={styles.badgeSoft}>name</span>{" "}
                    <span className={styles.mono}>{form.account_name || "—"}</span>
                  </div>
                  <div className={styles.previewLine}>
                    <span className={styles.badgeSoft}>number</span>{" "}
                    <span className={styles.mono}>{form.account_number || "—"}</span>
                  </div>
                  <div className={styles.previewLine}>
                    <span className={styles.badgeSoft}>currency</span>{" "}
                    <span className={styles.badge}>{toUpper3(form.currency, "NGN")}</span>
                    <span className={styles.dot}>•</span>
                    <span className={styles.badgeSoft}>active</span>{" "}
                    <span className={styles.mono}>{form.is_active ? "1" : "0"}</span>
                  </div>
                </div>
              </form>
            </div>
          </section>
        </div>

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
                className={styles.warnBtn}
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
              PATCH will update only provided fields. First-time setup requires bank_name, account_name, account_number.
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}