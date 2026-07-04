import React from "react";
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

  return (
    <div className={styles.wrap}>
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
    </div>
  );
}
