// utils/heistHelpers.js
"use strict";

const moment = require("moment");

/**
 * ✅ ONE WORD, lowercase normalize (must match CopUpBot service rule)
 * We accept toOneWord as dependency to avoid circular imports.
 */
function normalizeAnswer(v, toOneWord) {
  return String((toOneWord ? toOneWord(v ?? "") : v ?? "") || "")
    .trim()
    .toLowerCase();
}

function nowSql() {
  return moment().format("YYYY-MM-DD HH:mm:ss");
}

function addMinutesSql(minutes) {
  return moment()
    .add(Number(minutes || 0), "minutes")
    .format("YYYY-MM-DD HH:mm:ss");
}

/**
 * Pick a random Q/A variant from heist.question_variants
 * We accept safeJsonParse + toOneWord as dependencies.
 */
function pickVariant(heistRow, safeJsonParse, toOneWord) {
  const variants = safeJsonParse ? safeJsonParse(heistRow.question_variants, null) : null;

  if (Array.isArray(variants) && variants.length) {
    const idx = Math.floor(Math.random() * variants.length);
    const v = variants[idx] || {};
    return {
      question_variant: String(v.question ?? heistRow.question ?? ""),
      correct_answer: toOneWord ? toOneWord(v.answer ?? heistRow.answer ?? "") : String(v.answer ?? ""),
    };
  }

  return {
    question_variant: String(heistRow.question ?? ""),
    correct_answer: toOneWord ? toOneWord(heistRow.answer ?? "") : String(heistRow.answer ?? ""),
  };
}

/**
 * Finalize winner if ended and not completed yet (CASH ONLY).
 * Winner = fastest correct attempt across ALL players.
 * Must be called inside a transaction with heist row locked FOR UPDATE.
 */
async function finalizeHeistIfEnded(conn, heistId) {
  const [hRows] = await conn.query("SELECT * FROM heist WHERE id = ? FOR UPDATE", [heistId]);
  const heist = hRows[0];
  if (!heist) return { finalized: false, reason: "not_found" };

  if (heist.status === "completed") {
    return { finalized: true, reason: "already_completed", heist };
  }

  const ended =
    heist.countdown_ends_at && moment().isSameOrAfter(moment(heist.countdown_ends_at));

  if (!ended && !heist.submissions_locked) {
    return { finalized: false, reason: "not_ended", heist };
  }

  const [winRows] = await conn.query(
    `
    SELECT user_id, total_time_seconds, end_time
    FROM heist_attempts
    WHERE heist_id = ?
      AND is_correct = 1
      AND total_time_seconds IS NOT NULL
    ORDER BY total_time_seconds ASC, end_time ASC
    LIMIT 1
    `,
    [heistId]
  );

  const winnerUserId = winRows[0]?.user_id || null;

  await conn.query(
    `
    UPDATE heist
    SET
      status = 'completed',
      winner_id = ?,
      submissions_locked = 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [winnerUserId ? String(winnerUserId) : null, heistId]
  );

  if (winnerUserId) {
    await conn.query("UPDATE users SET bid_points = bid_points + ? WHERE id = ?", [
      Number(heist.prize || 0),
      winnerUserId,
    ]);
  }

  const [finalRows] = await conn.query("SELECT * FROM heist WHERE id = ? LIMIT 1", [heistId]);

  return {
    finalized: true,
    reason: "finalized",
    winner: winnerUserId
      ? { user_id: winnerUserId, best_time: winRows[0]?.total_time_seconds }
      : null,
    heist: finalRows[0],
  };
}

/**
 * Auto-start countdown when min users reached (CASH FLOW).
 * Must be called inside transaction with heist locked.
 *
 * ✅ FIXED: Safe even if caller forgets to pass heistRow.
 */
async function startCountdownIfReady(conn, heistId, heistRow) {
  // ✅ safety: if heistRow missing, fetch it (still inside same transaction)
  if (!heistRow) {
    const [hRows] = await conn.query("SELECT * FROM heist WHERE id = ? FOR UPDATE", [heistId]);
    heistRow = hRows[0];
    if (!heistRow) return false;
  }

  if (heistRow.countdown_started_at) return false;

  const [[{ cnt }]] = await conn.query(
    "SELECT COUNT(*) AS cnt FROM heist_participants WHERE heist_id = ?",
    [heistId]
  );

  const minUsers = Number(heistRow.min_users || 0);
  const joined = Number(cnt || 0);

  // ✅ if min_users is 0, don’t auto start (your current rule)
  if (!(minUsers > 0)) return false;

  if (joined >= minUsers) {
    const startedAt = nowSql();
    const endsAt = addMinutesSql(Number(heistRow.countdown_duration_minutes || 10));

    await conn.query(
      `
      UPDATE heist
      SET
        status = 'started',
        countdown_started_at = ?,
        countdown_ends_at = ?,
        submissions_locked = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [startedAt, endsAt, heistId]
    );

    return true;
  }

  return false;
}

/**
 * Pick a Q/A variant that the user has NOT seen before in this heist.
 * Only repeats if ALL variants have been used by this user.
 *
 * NOTE:
 * - Uses question text as the uniqueness key (normalized).
 * - Works without DB schema changes.
 */
async function pickVariantForUser(conn, heistRow, userId, safeJsonParse, toOneWord) {
  const variantsRaw = safeJsonParse ? safeJsonParse(heistRow.question_variants, null) : null;

  // If no variants array, fallback to existing behavior (single question)
  if (!Array.isArray(variantsRaw) || !variantsRaw.length) {
    return pickVariant(heistRow, safeJsonParse, toOneWord);
  }

  // Build normalized variant list
  const variants = variantsRaw
    .map((v) => ({
      question_variant: String(v?.question ?? heistRow.question ?? ""),
      correct_answer: toOneWord
        ? toOneWord(v?.answer ?? heistRow.answer ?? "")
        : String(v?.answer ?? ""),
    }))
    .filter((v) => String(v.question_variant || "").trim().length > 0);

  if (!variants.length) {
    return pickVariant(heistRow, safeJsonParse, toOneWord);
  }

  // Get all questions this user has EVER been served for this heist
  // (includes open + finished attempts)
  const [seenRows] = await conn.query(
    `
    SELECT question_variant
    FROM heist_attempts
    WHERE heist_id = ? AND user_id = ?
    `,
    [Number(heistRow.id), userId]
  );

  const seen = new Set(
    (seenRows || [])
      .map((r) => String(r?.question_variant ?? "").trim().toLowerCase())
      .filter(Boolean)
  );

  const unused = variants.filter((v) => {
    const key = String(v.question_variant || "").trim().toLowerCase();
    return key && !seen.has(key);
  });

  // ✅ If there are unused variants, pick from unused
  if (unused.length) {
    const idx = Math.floor(Math.random() * unused.length);
    return unused[idx];
  }

  // ✅ Last resort: user has seen all variants -> randomize from full list
  const idx = Math.floor(Math.random() * variants.length);
  return variants[idx];
}

module.exports = {
  normalizeAnswer,
  nowSql,
  addMinutesSql,
  pickVariant,
  pickVariantForUser,
  finalizeHeistIfEnded,
  startCountdownIfReady,
};