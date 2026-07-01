// src/components/ProductCard/ProductCard.jsx

import React, { useCallback, useMemo, useState } from "react";
import styles from "./ProductCard.module.css";
import coinImg from "../../assets/copupcoin.png";
import coinGif from "../../assets/copup.gif";
import { Heart, HeartOff, Store } from "lucide-react";

const coin = (n) => {
  const val = Number(n);
  if (!Number.isFinite(val)) return "—";
  return `${val.toLocaleString()} COIN`;
};

const safeDate = (v) => {
  try {
    if (!v) return "—";
    return new Date(v).toLocaleDateString();
  } catch {
    return "—";
  }
};

function normStock(v) {
  const s = String(v || "").toLowerCase();
  if (s.includes("out")) return "out_of_stock";
  return "in_stock";
}

function getAuthToken() {
  return localStorage.getItem("token") || localStorage.getItem("accessToken");
}

export default function ProductCard({
  product,
  onOpen,
  isFav = false,
  onToggleFav,
  favLoadingId = null,
  onBuyPay,
  variant = "default",
}) {
  const [imgReady, setImgReady] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const categoryLabel = useMemo(() => {
    return product?.categories || product?.category_name || "Uncategorized";
  }, [product]);

  const stock = useMemo(() => normStock(product?.stock_status), [product]);
  const showFallback = !product?.image_url || imgFailed;

  const open = useCallback(() => {
    if (!product?.id) return;
    if (typeof onOpen !== "function") return;
    onOpen(product.id, product);
  }, [product, onOpen]);

  const toggleFav = useCallback(
    async (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      const token = getAuthToken();
      if (!token) return;
      if (!product?.id) return;
      if (typeof onToggleFav !== "function") return;
      await onToggleFav(product.id);
    },
    [product?.id, onToggleFav]
  );

  const isFavBusy = Number(favLoadingId) === Number(product?.id);
  const isOut = stock === "out_of_stock";

  const onBuy = useCallback(
    async (e) => {
      e?.stopPropagation?.();
      if (!product?.id) return;
      if (typeof onBuyPay !== "function") return;
      await onBuyPay(product.id, product);
    },
    [product, onBuyPay]
  );

  return (
    <article
      className={`${styles.card} ${variant === "home" ? styles.homeCard : ""}`}
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
    >
      <div className={styles.cardImg}>
        {!imgReady && !showFallback ? (
          <div className={styles.imgLoader}>
            <img src={coinGif} alt="Loading..." />
          </div>
        ) : null}

        {product?.image_url ? (
          <img
            className={`${styles.mainImg} ${imgReady ? styles.imgReady : ""}`}
            src={product.image_url}
            alt={product?.name || "Product"}
            loading="lazy"
            onLoad={() => setImgReady(true)}
            onError={() => setImgFailed(true)}
          />
        ) : null}

        {showFallback ? (
          <div className={styles.imgFallback}>
            <div className={styles.fallbackInner}>
              <div className={styles.fallbackIcon}>
                <img src={coinImg} alt="coin" />
              </div>
              <div className={styles.fallbackName}>{product?.name}</div>
              <div className={styles.fallbackSub}>No image available</div>
            </div>
          </div>
        ) : null}

        <div className={styles.imgOverlay} />

        <button
          type="button"
          className={`${styles.favBtn} ${isFav ? styles.favOn : ""}`}
          onClick={toggleFav}
          disabled={isFavBusy}
          title={isFav ? "Remove from favorites" : "Add to favorites"}
          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          {isFav ? <Heart size={18} fill="currentColor" /> : <HeartOff size={18} />}
        </button>

        <div className={styles.topLeftChip}>
          <img src={coinImg} alt="coin" />
          <span>CopUpCoin</span>
        </div>

        <div className={styles.topRightChip}>{categoryLabel}</div>

        <div className={styles.bottomBar}>
          <div className={styles.bottomBarInner}>
            <div className={styles.bottomInfo}>
              <div className={styles.cardTitle}>
                {product?.name}
                {isOut ? (
                  <span style={{ marginLeft: 8, opacity: 0.75 }}>(Out)</span>
                ) : null}
              </div>
              <div className={styles.cardSub}>
                Listed {safeDate(product?.created_at)}
              </div>
              {product?.short_description ? (
                <div className={styles.cardDesc}>{product.short_description}</div>
              ) : null}
            </div>

            <div className={styles.viewPill}>View</div>
          </div>
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.metaRow}>
          <div className={styles.metaPill}>
            <Store size={14} />
            <span>{product?.vendor_name || "CopUp"}</span>
          </div>
        </div>

        <div className={styles.priceGrid}>
          <div className={styles.priceBox}>
            <div className={styles.priceLabel}>Cash</div>
            <div className={styles.priceCash}>{coin(product?.cash_price)}</div>
          </div>
        </div>

        <div className={styles.actionsRow} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={onBuy}
            disabled={isOut}
          >
            Buy
          </button>
        </div>
      </div>
    </article>
  );
}
