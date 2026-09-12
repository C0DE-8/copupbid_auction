import React, { useEffect, useRef } from "react";
import styles from "./CategoryChips.module.css";
import { FiSearch } from "react-icons/fi";

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
  const searchRef = useRef(null);
  useEffect(() => {
    const handleShortcut = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !document.querySelector('[role="dialog"]')) {
        event.preventDefault(); searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);
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

          {(Array.isArray(categories) ? categories : []).map((c, index) => {
            const cid = getCategoryId(c);
            return (
              <button
                key={cid ?? c?.name ?? index}
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

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <div className={styles.searchWrap2}>
          <FiSearch className={styles.searchIcon2} />
          <input
            id="shopSearchInput"
            ref={searchRef}
            type="search"
            aria-label="Search products"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search products…"
            className={styles.search2}
          />
          <div className={styles.kbd}>⌘K</div>
        </div>

        <select className={styles.select2} aria-label="Product category" value={selectedId ?? ""} onChange={event => onSelect?.(toNumberOrNull(event.target.value))}>
          <option value="">All categories</option>
          {(Array.isArray(categories) ? categories : []).filter(c => getCategoryId(c) !== null).map(c => <option key={getCategoryId(c)} value={getCategoryId(c)}>{c.name}</option>)}
        </select>
        <select
          aria-label="Sort products"
          className={styles.select2}
          value={sortMode}
          onChange={(e) => onSortChange?.(e.target.value)}
        >
          <option value="name_asc">Name: A–Z</option>
          <option value="cash_low">Price: low to high</option>
          <option value="cash_high">Price: high to low</option>
          <option value="auction_low">Sort: Auction Price (Low)</option>
          <option value="auction_high">Sort: Auction Price (High)</option>
        </select>
      </div>
      <span className="sr-only" role="status">{loading ? "Loading products" : status}</span>
    </div>
  );
}
