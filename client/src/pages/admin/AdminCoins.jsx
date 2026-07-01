// src/pages/admin/AdminCoins.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import styles from "./AdminCoins.module.css";
import AdminNavbar from "../../components/admin/Navbar";
import { ToastProvider, useToast } from "../../components/ui/Toaster";
import Modal from "../../components/ui/Modal";

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

/** ✅ Wrapper so this page can use toasts without touching App.jsx yet */
export default function AdminCoins() {
  return (
    <ToastProvider>
      <AdminCoinsInner />
    </ToastProvider>
  );
}

function AdminCoinsInner() {
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [rate, setRate] = useState({
    unit: 0,
    price: 0,
    currency: "USD",
    updated_at: null,
  });

  const [form, setForm] = useState({
    unit: "",
    price: "",
    currency: "USD",
  });

  // confirm modal
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    subtitle: "",
    message: "",
    tone: "primary", // primary | warn | danger
    confirmText: "Confirm",
    cancelText: "Cancel",
    action: null,
  });

  const openConfirm = (cfg) => {
    setConfirm({
      open: true,
      title: cfg.title || "Are you sure?",
      subtitle: cfg.subtitle || "",
      message: cfg.message || "Proceed with this action?",
      tone: cfg.tone || "primary",
      confirmText: cfg.confirmText || "Confirm",
      cancelText: cfg.cancelText || "Cancel",
      action: typeof cfg.action === "function" ? cfg.action : null,
    });
  };

  const closeConfirm = () => {
    if (busy) return;
    setConfirm((p) => ({ ...p, open: false, action: null }));
  };

  const fetchRate = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/coin-rate");

      const payload = res.data || {};
      const next = {
        unit: safeNum(payload.unit, 0),
        price: safeNum(payload.price, 0),
        currency: String(payload.currency || "USD").toUpperCase(),
        updated_at: payload.updated_at || null,
      };

      setRate(next);
      setForm({
        unit: next.unit ? String(next.unit) : "",
        price: next.price ? String(next.price) : "",
        currency: next.currency || "USD",
      });
    } catch (err) {
      console.error("Fetch coin rate error:", err);
      toast.error(err?.response?.data?.message || "Failed to fetch coin rate");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formValid = useMemo(() => {
    const unit = Number(form.unit);
    const price = Number(form.price);
    return Number.isFinite(unit) && unit > 0 && Number.isFinite(price) && price > 0;
  }, [form.unit, form.price]);

  const saveRate = async () => {
    const unit = Number(form.unit);
    const price = Number(form.price);
    const currency = String(form.currency || "USD").toUpperCase();

    if (!(unit > 0)) return toast.warn("unit must be a positive number");
    if (!(price > 0)) return toast.warn("price must be a positive number");

    // ✅ backend expects: { unit, price, currency }
    try {
      setBusy(true);
      await api.put("/admin/coin-rate", { unit, price, currency });
      toast.success("Coin rate updated");
      await fetchRate();
    } catch (err) {
      console.error("Save coin rate error:", err);
      toast.error(err?.response?.data?.message || "Failed to update coin rate");
    } finally {
      setBusy(false);
      closeConfirm();
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();

    openConfirm({
      title: "Update coin rate?",
      subtitle: "PUT /api/admin/coin-rate",
      message: `Set rate to: ${form.unit} unit = ${form.price} ${String(
        form.currency || "USD"
      ).toUpperCase()}`,
      tone: "warn",
      confirmText: "Yes, update",
      cancelText: "Cancel",
      action: saveRate,
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
              <button
                className={styles.backBtn}
                type="button"
                onClick={() => window.history.back()}
              >
                ← Back
              </button>

              <div>
                <h2 className={styles.title}>Coin Rate</h2>
                <p className={styles.sub}>
                  Configure how many coins a user gets per price unit.
                </p>
              </div>
            </div>

            <div className={styles.headerActions}>
              <button
                className={styles.softBtn}
                type="button"
                onClick={fetchRate}
                disabled={busy || loading}
              >
                ↻ Refresh
              </button>
            </div>
          </header>

          <section className={styles.grid}>
            {/* Current */}
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>Current Rate</div>
                <div className={styles.mutedSmall}>
                  {loading ? "Loading…" : `Updated: ${fmtDate(rate.updated_at)}`}
                </div>
              </div>

              <div className={styles.statRow}>
                <div className={styles.statBox}>
                  <div className={styles.statLabel}>Unit (Coins)</div>
                  <div className={styles.statValue}>{safeNum(rate.unit, 0)}</div>
                </div>

                <div className={styles.statBox}>
                  <div className={styles.statLabel}>Price</div>
                  <div className={styles.statValue}>
                    {safeNum(rate.price, 0)}{" "}
                    <span className={styles.badge}>{rate.currency || "USD"}</span>
                  </div>
                </div>
              </div>

              <div className={styles.hint}>
                Example: if unit=100 and price=1 USD → user gets 100 coins per $1.
              </div>
            </div>

            {/* Edit */}
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>Update Rate</div>
                <div className={styles.mutedSmall}>Admin only</div>
              </div>

              <form className={styles.form} onSubmit={onSubmit}>
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label className={styles.label}>Unit (coins) *</label>
                    <input
                      className={styles.input}
                      type="number"
                      min="1"
                      step="1"
                      value={form.unit}
                      onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                      placeholder="e.g. 100"
                      disabled={busy}
                      required
                    />
                    <div className={styles.help}>How many coins the user receives.</div>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>Price *</label>
                    <input
                      className={styles.input}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                      placeholder="e.g. 1"
                      disabled={busy}
                      required
                    />
                    <div className={styles.help}>How much that unit costs.</div>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.label}>Currency</label>
                    <input
                      className={styles.input}
                      value={form.currency}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))
                      }
                      placeholder="USD"
                      disabled={busy}
                    />
                    <div className={styles.help}>Stored uppercase (USD, NGN, EUR…)</div>
                  </div>
                </div>

                <div className={styles.actions}>
                  <button
                    className={styles.primaryBtn}
                    type="submit"
                    disabled={busy || !formValid}
                    title={!formValid ? "Enter valid unit and price" : ""}
                  >
                    {busy ? "Saving…" : "Save Rate"}
                  </button>

                  <button
                    className={styles.softBtn}
                    type="button"
                    onClick={() =>
                      setForm({
                        unit: rate.unit ? String(rate.unit) : "",
                        price: rate.price ? String(rate.price) : "",
                        currency: String(rate.currency || "USD").toUpperCase(),
                      })
                    }
                    disabled={busy}
                  >
                    Reset
                  </button>
                </div>
              </form>

              <div className={styles.preview}>
                <div className={styles.previewTitle}>Preview</div>
                <div className={styles.previewLine}>
                  <span className={styles.badgeSoft}>unit</span>{" "}
                  <span className={styles.mono}>{form.unit || "—"}</span>
                  <span className={styles.dot}>•</span>
                  <span className={styles.badgeSoft}>price</span>{" "}
                  <span className={styles.mono}>{form.price || "—"}</span>{" "}
                  <span className={styles.badge}>{String(form.currency || "USD").toUpperCase()}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ✅ CONFIRM MODAL */}
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
              <button
                className={styles.softBtn}
                type="button"
                onClick={closeConfirm}
                disabled={busy}
              >
                {confirm.cancelText}
              </button>

              <button
                className={confirm.tone === "warn" ? styles.warnBtn : styles.primaryBtn}
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
              This will update the live rate used for coin purchases.
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}