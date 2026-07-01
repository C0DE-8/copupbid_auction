import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiChevronLeft,
  FiChevronRight,
  FiExternalLink,
  FiGrid,
} from "react-icons/fi";
import styles from "./BannerCarousel.module.css";

export default function BannerCarousel({
  banners = [],
  loading = false,
  brand = "CopUpBidShop",
  subtitle = "Discover featured drops, limited stock, and premium deals.",
  autoPlay = true,
  intervalMs = 5500,
  onBrowse = null,

  // ✅ NEW (defaults hide the unwanted text)
  showSubtitle = false,
  showStatusHint = false, // Paused / Auto
  showCounter = true, // 1/5 pill
}) {
  const list = useMemo(() => (Array.isArray(banners) ? banners : []), [banners]);
  const hasBanners = list.length > 0;

  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);

  const timerRef = useRef(null);

  const clampIndex = useCallback(
    (i) => {
      if (!hasBanners) return 0;
      const n = list.length;
      return (i % n + n) % n;
    },
    [hasBanners, list.length]
  );

  const goTo = useCallback(
    (i, nextDir = 1) => {
      if (!hasBanners) return;
      setDir(nextDir);
      setIndex(clampIndex(i));
    },
    [clampIndex, hasBanners]
  );

  const next = useCallback(() => goTo(index + 1, 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1, -1), [goTo, index]);

  useEffect(() => {
    if (!hasBanners) return;
    setIndex((prevI) => clampIndex(prevI));
  }, [hasBanners, clampIndex]);

  useEffect(() => {
    if (!autoPlay || paused || loading || !hasBanners) return;

    timerRef.current = setInterval(() => {
      setDir(1);
      setIndex((prevI) => clampIndex(prevI + 1));
    }, Math.max(2500, Number(intervalMs) || 5500));

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoPlay, paused, loading, hasBanners, clampIndex, intervalMs]);

  const active = hasBanners ? list[index] : null;

  const onCtaClick = useCallback(() => {
    if (active?.action_url) {
      window.open(active.action_url, "_blank", "noreferrer");
      return;
    }
    if (typeof onBrowse === "function") onBrowse();
  }, [active, onBrowse]);

  const variants = {
    enter: (direction) => ({
      opacity: 0,
      x: direction > 0 ? 30 : -30,
      scale: 0.995,
    }),
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    },
    exit: (direction) => ({
      opacity: 0,
      x: direction > 0 ? -30 : 30,
      scale: 0.995,
      transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  if (loading) {
    return (
      <div className={styles.wrap}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (!hasBanners) {
    return (
      <div className={styles.wrap}>
        <div className={styles.fallback}>
          <div className={styles.fallbackTop}>{brand}</div>
          <div className={styles.fallbackTitle}>Shop • Bid • Heist</div>
          <div className={styles.fallbackSub}>No banner is active yet.</div>

          <button className={styles.cta} type="button" onClick={onCtaClick}>
            <FiGrid style={{ marginRight: 8 }} />
            Browse products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.wrap}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={styles.frame}>
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={active?.id || index}
            className={styles.slide}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              const offset = info.offset.x;
              const velocity = info.velocity.x;
              const swipe = Math.abs(offset) * (velocity ? Math.abs(velocity) : 1);

              if (offset < -60 || swipe > 14000) next();
              else if (offset > 60 || swipe > 14000) prev();
            }}
            style={{ backgroundImage: `url(${active?.image_url})` }}
          >
            {/* ✅ NEW: clearer image overlay system */}
            <div className={styles.overlayTop} />
            <div className={styles.overlayBottom} />

            <div className={styles.inner}>
              <div className={styles.badge}>{brand}</div>

              <div className={styles.title}>
                {active?.action_name || "Shop • Bid • Heist"}
              </div>

              {/* ✅ subtitle hidden by default */}
              {showSubtitle && subtitle ? (
                <div className={styles.sub}>{subtitle}</div>
              ) : null}

              <div className={styles.actions}>
                <button className={styles.cta} type="button" onClick={onCtaClick}>
                  {active?.action_url ? (
                    <>
                      <FiExternalLink style={{ marginRight: 8 }} />
                      Explore now
                    </>
                  ) : (
                    <>
                      <FiGrid style={{ marginRight: 8 }} />
                      Browse products
                    </>
                  )}
                </button>

                {/* ✅ meta cleaned */}
                {/* Status hint only (no counter anymore) */}
                {showStatusHint && (
                  <div className={styles.meta}>
                    <span className={styles.metaHint}>
                      {paused ? "Paused" : autoPlay ? "Auto" : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {list.length > 1 ? (
          <>
            <button
              type="button"
              className={`${styles.arrow} ${styles.left}`}
              onClick={prev}
              aria-label="Previous banner"
              title="Previous"
            >
              <FiChevronLeft />
            </button>
            <button
              type="button"
              className={`${styles.arrow} ${styles.right}`}
              onClick={next}
              aria-label="Next banner"
              title="Next"
            >
              <FiChevronRight />
            </button>
          </>
        ) : null}
      </div>

      {list.length > 1 ? (
        <div className={styles.dots}>
          {list.map((b, i) => (
            <button
              key={b?.id ?? i}
              type="button"
              className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
              onClick={() => goTo(i, i > index ? 1 : -1)}
              aria-label={`Go to banner ${i + 1}`}
              title={`Banner ${i + 1}`}
            />
          ))}
        </div>
      ) : null}

      {list.length > 1 ? (
        <div className={styles.thumbs}>
          {list.map((b, i) => (
            <button
              key={b?.id ?? i}
              type="button"
              className={`${styles.thumb} ${i === index ? styles.thumbActive : ""}`}
              onClick={() => goTo(i, i > index ? 1 : -1)}
              title={b?.action_name || `Banner ${i + 1}`}
            >
              <div
                className={styles.thumbImg}
                style={{ backgroundImage: `url(${b?.image_url})` }}
              />
              <div className={styles.thumbText}>
                <div className={styles.thumbTitle}>
                  {b?.action_name || `Banner ${i + 1}`}
                </div>
                <div className={styles.thumbSub}>
                  {b?.action_url ? "Tap to open link" : "Tap to browse"}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}