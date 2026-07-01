import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./CategoryChips.module.css";
import { FiChevronDown, FiSearch } from "react-icons/fi";

function getCategoryId(c) {
  // supports different backend shapes: {id}, {category_id}, {categoryId}
  const raw = c?.id ?? c?.category_id ?? c?.categoryId;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function toNumberOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function CategoryChips({
  categories,
  selectedCategoryId,
  onSelect,
  mode = "select",

  status = "",
  loading = false,

  searchQuery = "",
  onSearchChange,
  sortMode = "name_asc",
  onSortChange,
}) {
  const selectedId = toNumberOrNull(selectedCategoryId);

  // ===== Chips mode (simple row) =====
  if (mode !== "select") {
    return (
      <section className={styles.wrap}>
        <div className={styles.chips}>
          <button
            type="button"
            className={`${styles.chip} ${selectedId === null ? styles.active : ""}`}
            onClick={() => onSelect?.(null)}
          >
            All
          </button>

          {(Array.isArray(categories) ? categories : []).map((c) => {
            const cid = getCategoryId(c);
            return (
              <button
                key={cid ?? c?.name ?? Math.random()}
                type="button"
                className={`${styles.chip} ${
                  selectedId !== null && cid !== null && selectedId === cid
                    ? styles.active
                    : ""
                }`}
                onClick={() => onSelect?.(cid)}
              >
                {c?.name || "Category"}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  // ===== Select dropdown mode =====
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selectedLabel = useMemo(() => {
    if (selectedId === null) return "All Categories";
    const found = (Array.isArray(categories) ? categories : []).find(
      (c) => getCategoryId(c) === selectedId
    );
    return found?.name || "All Categories";
  }, [categories, selectedId]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return Array.isArray(categories) ? categories : [];
    return (Array.isArray(categories) ? categories : []).filter((c) =>
      String(c?.name || "").toLowerCase().includes(t)
    );
  }, [categories, q]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {/* TOP ROW */}
      <div className={styles.topRow}>
        <button
          type="button"
          className={styles.selectBtn}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={styles.selectLabel}>{selectedLabel}</span>
          <FiChevronDown
            className={`${styles.chev} ${open ? styles.chevUp : ""}`}
          />
        </button>

        <div className={styles.topRightGroup}>
          <div className={styles.livePill} title={status}>
            <span className={styles.dot} />
            <span className={styles.liveText}>
              {loading ? "Loading…" : "Live"}
            </span>
          </div>
        </div>
      </div>

      {/* Dropdown menu */}
      {open ? (
        <div className={styles.menu}>
          <div className={styles.searchRow}>
            <FiSearch className={styles.searchIcon} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={styles.searchInput}
              placeholder="Search categories..."
            />
          </div>

          <div className={styles.list}>
            <button
              type="button"
              className={`${styles.option} ${
                selectedId === null ? styles.optionActive : ""
              }`}
              onClick={() => {
                onSelect?.(null);
                setOpen(false);
                setQ("");
              }}
            >
              All Categories
            </button>

            {filtered.map((c) => {
              const cid = getCategoryId(c);
              const active =
                selectedId !== null && cid !== null && selectedId === cid;

              return (
                <button
                  key={cid ?? c?.name ?? Math.random()}
                  type="button"
                  className={`${styles.option} ${
                    active ? styles.optionActive : ""
                  }`}
                  onClick={() => {
                    onSelect?.(cid);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  {c?.name || "Category"}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* SECOND ROW: Search + Sort */}
      <div className={styles.controls}>
        <div className={styles.searchWrap2}>
          <FiSearch className={styles.searchIcon2} />
          <input
            id="shopSearchInput"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search products (name, categories)..."
            className={styles.search2}
          />
          <div className={styles.kbd}>⌘K</div>
        </div>

        <select
          className={styles.select2}
          value={sortMode}
          onChange={(e) => onSortChange?.(e.target.value)}
        >
          <option value="name_asc">Sort: Name (A-Z)</option>
          <option value="cash_low">Sort: Cash Price (Low)</option>
          <option value="cash_high">Sort: Cash Price (High)</option>
          <option value="auction_low">Sort: Auction Price (Low)</option>
          <option value="auction_high">Sort: Auction Price (High)</option>
        </select>
      </div>

      {status ? <div className={styles.statusLine}>{status}</div> : null}
    </div>
  );
}