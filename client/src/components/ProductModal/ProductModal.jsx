// ProductModal.jsx (UPDATED: BUY ONLY)

import React, { useEffect, useMemo, useState } from "react";
import styles from "./ProductModal.module.css";
import coinImg from "../../assets/copupcoin.png";
import coinGif from "../../assets/copup.gif";
import { Store, X } from "lucide-react";

const coin = (n) => {
  const val = Number(n);
  if (!Number.isFinite(val)) return "—";
  return `${val.toLocaleString()} COIN`;
};

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString();
}

const safeDate = (v) => {
  try {
    if (!v) return "—";
    return new Date(v).toLocaleDateString();
  } catch {
    return "—";
  }
};

export default function ProductModal({
  isOpen,
  onClose,
  loading,
  error,
  product,

  // ✅ BUY ONLY
  onBuy,

  buyLoading = false,
  buyError = "",
  buyInfo = null,

  cashQty = 1,
  onCashQtyChange,
}) {
  const [activeImg, setActiveImg] = useState(0);
  const [imgReady, setImgReady] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setActiveImg(0);
    setImgReady(false);
    setImgFailed(false);
  }, [isOpen, product?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add(styles.noScroll);
    return () => document.body.classList.remove(styles.noScroll);
  }, [isOpen]);

  const categoriesText = useMemo(() => {
    if (!product) return "—";
    if (typeof product?.categories === "string") return product.categories;
    if (Array.isArray(product?.categories)) return product.categories.map((c) => c.name).join(", ");
    return product?.category_name || "—";
  }, [product]);

  const images = useMemo(() => {
    if (!product) return [];
    const gallery = Array.isArray(product?.gallery) ? product.gallery : [];
    const all = [
      ...(product?.image_url ? [{ image_url: product.image_url, is_primary: true }] : []),
      ...gallery.map((g) => ({ image_url: g.image_url, is_primary: false })),
    ].filter((x) => !!x?.image_url);
    return all;
  }, [product]);

  const activeImageUrl = images?.[activeImg]?.image_url || product?.image_url || "";
  const modalHasImage = !!activeImageUrl;
  const showLoader = modalHasImage && !imgReady && !imgFailed;
  const showFallback = !modalHasImage || imgFailed;

  const stockStatus =
    buyInfo?.product?.stock_status ||
    product?.stock_status ||
    "in_stock";

  const isOut = String(stockStatus).toLowerCase() === "out_of_stock";

  const created = buyInfo?.created || null;

  if (!isOpen) return null;

  return (
    <div className={styles.modalWrap} role="dialog" aria-modal="true">
      <div className={styles.modalOverlay} onClick={onClose} />

      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeadLeft}>
            <img src={coinImg} alt="coin" />
            <div>
              <div className={styles.modalTitle}>
                {product?.name || "Product"}
                {isOut ? <span style={{ marginLeft: 8, opacity: 0.75 }}>(Out of stock)</span> : null}
              </div>
              <div className={styles.modalCats}>
                {error ? "Failed to load product details" : categoriesText || "Categories"}
              </div>
            </div>
          </div>

          <button type="button" className={styles.btnGhost} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div>
            <div className={styles.modalImgWrap}>
              {showLoader ? (
                <div className={styles.modalLoader}>
                  <img src={coinGif} alt="Loading..." />
                </div>
              ) : null}

              {modalHasImage ? (
                <img
                  className={`${styles.modalMainImg} ${imgReady ? styles.imgReady : ""}`}
                  src={activeImageUrl}
                  alt={product?.name || "product"}
                  onLoad={() => setImgReady(true)}
                  onError={() => setImgFailed(true)}
                />
              ) : null}

              {showFallback ? (
                <div className={styles.modalImgFallback}>
                  <div className={styles.fallbackInner}>
                    <div className={styles.fallbackIcon}>
                      <img src={coinImg} alt="coin" />
                    </div>
                    <div className={styles.fallbackName}>
                      {product?.name || "Image not available"}
                    </div>
                    <div className={styles.fallbackSub}>This product has no image yet.</div>
                  </div>
                </div>
              ) : null}
            </div>

            {images.length > 1 ? (
              <div className={styles.galleryRow}>
                {images.map((g, idx) => (
                  <button
                    key={`${g.image_url}_${idx}`}
                    type="button"
                    className={`${styles.galleryThumb} ${idx === activeImg ? styles.galleryActive : ""}`}
                    onClick={() => {
                      setImgReady(false);
                      setImgFailed(false);
                      setActiveImg(idx);
                    }}
                    title={`Image ${idx + 1}`}
                  >
                    <img src={g.image_url} alt={`thumb-${idx + 1}`} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <div className={styles.modalInfoGrid}>
              <div className={styles.infoPill}>
                <Store size={14} />
                <span>{product?.vendor_name || "CopUp"}</span>
              </div>

              <div className={styles.infoPill}>
                <span className={styles.infoKey}>Shipping:</span>
                <span>{money(product?.shipping_cost)}</span>
              </div>

              <div className={styles.infoPill}>
                <span className={styles.infoKey}>Listed:</span>
                <span>{safeDate(product?.created_at)}</span>
              </div>

              <div className={styles.infoPill}>
                <span className={styles.infoKey}>Stock:</span>
                <span>{String(stockStatus)}</span>
              </div>
            </div>

            {product?.short_description ? (
              <div className={styles.descBlock}>
                <div className={styles.descTitle}>Quick info</div>
                <div className={styles.descText}>{product.short_description}</div>
              </div>
            ) : null}

            {product?.description ? (
              <div className={styles.descBlock}>
                <div className={styles.descTitle}>Description</div>
                <div className={styles.descText}>{product.description}</div>
              </div>
            ) : null}

            {/* ✅ BUY ONLY pricing */}
            <div className={styles.modalPricing}>
              <div className={styles.modalPricingLabel}>Pricing</div>

              <div className={styles.modalPriceRows}>
                <div className={styles.modalRow}>
                  <span>Cash</span>
                  <span className={styles.modalCash}>{coin(product?.cash_price)}</span>
                </div>
              </div>

              {loading ? <div className={styles.modalLoading}>Loading…</div> : null}
            </div>

            {/* Qty affects BUY */}
            <div className={styles.qtyRow}>
              <div className={styles.qtyLabel}>Quantity</div>
              <div className={styles.qtyControls}>
                <button
                  type="button"
                  className={styles.qtyBtn}
                  onClick={() => onCashQtyChange?.(Math.max(1, Number(cashQty) - 1))}
                  disabled={buyLoading || isOut}
                >
                  −
                </button>
                <input
                  className={styles.qtyInput}
                  value={cashQty}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    onCashQtyChange?.(Number.isFinite(n) && n > 0 ? n : 1);
                  }}
                  disabled={buyLoading || isOut}
                  inputMode="numeric"
                />
                <button
                  type="button"
                  className={styles.qtyBtn}
                  onClick={() => onCashQtyChange?.(Number(cashQty) + 1)}
                  disabled={buyLoading || isOut}
                >
                  +
                </button>
              </div>
            </div>

            {/* ✅ BUY ONLY button */}
            <div className={styles.modalBtns}>
              <button
                type="button"
                className={styles.btnGhost2}
                onClick={onBuy}
                disabled={buyLoading || isOut}
              >
                {buyLoading ? "Processing..." : "Buy"}
              </button>
            </div>

            {/* errors */}
            {buyError ? <div className={styles.modalErr}>{buyError}</div> : null}
            {error ? <div className={styles.modalErr}>{error}</div> : null}

            {/* success payload */}
            {buyInfo?.message ? (
              <div className={styles.payInfo}>
                <div className={styles.payInfoRow}>
                  <span>Result:</span>
                  <b>{buyInfo.message}</b>
                </div>

                {created?.id ? (
                  <div className={styles.payInfoRow}>
                    <span>Cart item ID:</span>
                    <b>#{created.id}</b>
                  </div>
                ) : null}

                {buyInfo?.balance?.bid_points !== undefined ? (
                  <div className={styles.payInfoRow}>
                    <span>New balance:</span>
                    <b>{Number(buyInfo.balance.bid_points).toLocaleString()} COIN</b>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}