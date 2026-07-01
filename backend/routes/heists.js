"use strict";

const express = require("express");
const router = express.Router();

const { pool } = require("../db");
const { authenticateToken, authenticateAdmin } = require("../middleware/auth");
const moment = require("moment");
const { upload, absUrl } = require("../middleware/upload");
// ✅ CopUpBot Service (AI isolated here)
const {
  openaiConfigured,
  safeJsonParse,
  toOneWord,
  enforceOneWordVariants,
  generateVariantsFromStory,
} = require("../services/copupbot");

// ======================================================================
// ✅ Heist Helpers (moved into its own file)
// Path: /utils/heistHelpers.js
// ======================================================================
const {
  normalizeAnswer,
  nowSql,
  addMinutesSql,
  pickVariant,
  pickVariantForUser,
  finalizeHeistIfEnded,
  startCountdownIfReady,
} = require("../utils/heistHelpers");

/**
 * Helper: build leaderboard preview (top 10)
 */
async function buildLeaderboardPreview(req, heistId) {
  const [lbRows] = await pool.query(
    `
    SELECT
      a.user_id,
      MIN(a.total_time_seconds) AS best_time
    FROM heist_attempts a
    WHERE a.heist_id = ?
      AND a.is_correct = 1
      AND a.total_time_seconds IS NOT NULL
    GROUP BY a.user_id
    ORDER BY best_time ASC
    LIMIT 10
    `,
    [heistId]
  );

  if (!lbRows.length) return [];

  const userIds = lbRows.map((r) => r.user_id);
  const [uRows] = await pool.query(
    `SELECT id, username, full_name, profile FROM users WHERE id IN (${userIds
      .map(() => "?")
      .join(",")})`,
    userIds
  );

  const map = new Map(uRows.map((u) => [String(u.id), u]));

  return lbRows.map((r) => {
    const u = map.get(String(r.user_id));
    return {
      user_id: r.user_id,
      best_time: Number(r.best_time),
      username: u?.username || null,
      full_name: u?.full_name || null,
      image: u?.profile ? absUrl(req, u.profile) : null,
    };
  });
}


// ======================================================================
// USER ROUTES
// ======================================================================

// Get available heists /api/heists/available
router.get("/heists/available", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        h.id,
        h.name,
        h.story,
        h.min_users,
        h.ticket_price,
        h.retry_ticket_price,
        h.prize,
        h.status,
        h.prize_name,
        h.prize_image,
        h.created_at,
        h.updated_at,
        h.countdown_started_at,
        h.countdown_duration_minutes,
        h.countdown_ends_at,
        h.submissions_locked,
        COALESCE(p.cnt, 0) AS participants_count
      FROM heist h
      LEFT JOIN (
        SELECT heist_id, COUNT(*) AS cnt
        FROM heist_participants
        GROUP BY heist_id
      ) p ON p.heist_id = h.id
      WHERE h.status IN ('pending','started')
      ORDER BY FIELD(h.status,'started','pending'), h.id DESC
      `
    );

    const now = moment();

    const data = rows.map((h) => {
      const joined = Number(h.participants_count || 0);
      const min = Number(h.min_users || 0);

      const isStarted = h.status === "started";
      const hasEndsAt = !!h.countdown_ends_at;

      const ended =
        hasEndsAt && moment(h.countdown_ends_at).isValid()
          ? now.isSameOrAfter(moment(h.countdown_ends_at))
          : false;

      const locked = !!h.submissions_locked || ended;

      const canStart = isStarted && !locked;

      return {
        id: h.id,
        name: h.name,

        // ✅ show story only when started (same rule you had)
        story: isStarted ? h.story : null,

        min_users: h.min_users,
        ticket_price: h.ticket_price,
        retry_ticket_price: h.retry_ticket_price,
        prize: h.prize,

        status: h.status,
        prize_name: h.prize_name,
        prize_image: absUrl(req, h.prize_image),

        countdown_started_at: h.countdown_started_at,
        countdown_duration_minutes: h.countdown_duration_minutes,
        countdown_ends_at: h.countdown_ends_at,

        submissions_locked: locked,
        ended,
        canStart,

        created_at: h.created_at,
        updated_at: h.updated_at,

        participantsJoined: joined,
        minUsers: min,
        participantsProgress: `${joined}/${min}`,
        participantsPercent: min > 0 ? Math.min(100, Math.round((joined / min) * 100)) : 0,
      };
    });

    return res.status(200).json({
      server_time: now.format("YYYY-MM-DD HH:mm:ss"),
      heists: data,
    });
  } catch (error) {
    console.error("heists/available error:", error);
    return res.status(500).json({ error: "Error fetching heists.", details: error.message });
  }
});
// POST /api//heists/pay-entry/:id
router.post("/pay-entry/:id", authenticateToken, async (req, res) => {
  const heistId = Number(req.params.id);
  const userId = req.user.id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [hRows] = await conn.query("SELECT * FROM heist WHERE id = ? FOR UPDATE", [heistId]);
    const heist = hRows[0];
    if (!heist) {
      await conn.rollback();
      return res.status(404).json({ message: "Heist not found" });
    }

    if (heist.status === "completed") {
      await conn.rollback();
      return res.status(400).json({ message: "Heist has ended." });
    }

    // prevent double join
    const [pRows] = await conn.query(
      "SELECT 1 FROM heist_participants WHERE heist_id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
      [heistId, userId]
    );
    if (pRows.length) {
      await conn.rollback();
      return res.status(400).json({ message: "Entry fee already paid" });
    }

    const [uRows] = await conn.query("SELECT id, bid_points FROM users WHERE id = ? FOR UPDATE", [
      userId,
    ]);
    const user = uRows[0];
    if (!user) {
      await conn.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    if (Number(user.bid_points) < Number(heist.ticket_price)) {
      await conn.rollback();
      return res.status(400).json({ message: "Insufficient bid points" });
    }

    // deduct + insert participant
    await conn.query("UPDATE users SET bid_points = bid_points - ? WHERE id = ?", [
      Number(heist.ticket_price),
      userId,
    ]);

    await conn.query("INSERT INTO heist_participants (heist_id, user_id) VALUES (?, ?)", [
      heistId,
      userId,
    ]);

    // try start countdown if ready (optional)
    await startCountdownIfReady(conn, heistId);

    const [h2] = await conn.query("SELECT * FROM heist WHERE id = ? LIMIT 1", [heistId]);
    const fresh = h2[0] || heist;

    await conn.commit();
    return res.status(201).json({
      message: "Entry fee paid successfully",
      heistId,
      status: fresh.status,
      countdown_started_at: fresh.countdown_started_at,
      countdown_ends_at: fresh.countdown_ends_at,
    });
  } catch (error) {
    try {
      await conn.rollback();
    } catch {}
    console.error("pay-entry error:", error);
    return res.status(500).json({ message: "Error paying entry fee", error: error.message });
  } finally {
    conn.release();
  }
});
/** * GET /api/heists/heist/:id/play */
router.get("/heist/:id/play", authenticateToken, async (req, res) => {
  const heistId = Number(req.params.id);
  const userId = req.user.id;

  try {
    const [hRows] = await pool.query("SELECT * FROM heist WHERE id = ? LIMIT 1", [heistId]);
    const heist = hRows[0];
    if (!heist) return res.status(404).json({ message: "Heist not found" });

    if (heist.status === "completed") {
      return res.status(400).json({ message: "Heist has ended and is no longer playable." });
    }

    // must have joined
    const [pRows] = await pool.query(
      "SELECT 1 FROM heist_participants WHERE heist_id = ? AND user_id = ? LIMIT 1",
      [heistId, userId]
    );
    if (!pRows.length) {
      return res.status(403).json({ message: "You must pay entry to access this heist." });
    }

    // open attempt (if any) => gives question
    const [openAttemptRows] = await pool.query(
      `
      SELECT id, question_variant, start_time
      FROM heist_attempts
      WHERE heist_id = ? AND user_id = ? AND end_time IS NULL
      ORDER BY id DESC
      LIMIT 1
      `,
      [heistId, userId]
    );
    const openAttempt = openAttemptRows[0] || null;

    // user best time
    const [bestRows] = await pool.query(
      `
      SELECT MIN(total_time_seconds) AS best_time
      FROM heist_attempts
      WHERE heist_id = ?
        AND user_id = ?
        AND is_correct = 1
        AND total_time_seconds IS NOT NULL
      `,
      [heistId, userId]
    );

    const leaderboardPreview = await buildLeaderboardPreview(req, heistId);

    return res.json({
      heist: {
        id: heist.id,
        name: heist.name,
        story: heist.story,
        prize: heist.prize,
        prize_name: heist.prize_name,
        prize_image: absUrl(req, heist.prize_image),
        ticket_price: heist.ticket_price,
        retry_ticket_price: heist.retry_ticket_price,
        min_users: heist.min_users,
        status: heist.status,
        countdown_started_at: heist.countdown_started_at,
        countdown_duration_minutes: heist.countdown_duration_minutes,
        countdown_ends_at: heist.countdown_ends_at,
        submissions_locked: !!heist.submissions_locked,
      },
      openAttempt: openAttempt
        ? {
            attempt_id: openAttempt.id,
            question_variant: openAttempt.question_variant,
            start_time: openAttempt.start_time,
          }
        : null,
      userBestTime: bestRows[0]?.best_time != null ? Number(bestRows[0].best_time) : null,
      leaderboardPreview,
    });
  } catch (err) {
    console.error("heist play error:", err);
    res.status(500).json({ message: "Error fetching heist play view", error: err.message });
  }
});
/** * ✅ POST /api/heists/heist/:id/start */
router.post("/heist/:id/start", authenticateToken, async (req, res) => {
  const heistId = Number(req.params.id);
  const userId = req.user.id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // must be participant
    const [pRows] = await conn.query(
      "SELECT 1 FROM heist_participants WHERE heist_id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
      [heistId, userId]
    );
    if (!pRows.length) {
      await conn.rollback();
      return res.status(403).json({ message: "You have not joined this heist." });
    }

    // lock heist row
    const [hRows] = await conn.query("SELECT * FROM heist WHERE id = ? FOR UPDATE", [heistId]);
    let heist = hRows[0];
    if (!heist) {
      await conn.rollback();
      return res.status(404).json({ message: "Heist not found." });
    }

    // finalize if ended
    const fin = await finalizeHeistIfEnded(conn, heistId);
    if (fin.finalized && fin.heist?.status === "completed") {
      await conn.commit();
      return res.status(200).json({ message: "Heist ended.", status: "completed" });
    }

    // only completed blocks
    if (heist.status === "completed") {
      await conn.rollback();
      return res.status(400).json({ message: "Heist has ended and is no longer playable." });
    }

    // if pending, attempt to start countdown if ready (doesn't block play)
    if (heist.status === "pending") {
      await startCountdownIfReady(conn, heistId);
      const [h2] = await conn.query("SELECT * FROM heist WHERE id = ? FOR UPDATE", [heistId]);
      heist = h2[0] || heist;
    }

    // resume open attempt if exists
    const [openRows] = await conn.query(
      `
      SELECT id, question_variant, start_time
      FROM heist_attempts
      WHERE heist_id = ? AND user_id = ? AND end_time IS NULL
      LIMIT 1
      FOR UPDATE
      `,
      [heistId, userId]
    );

    if (openRows.length) {
      await conn.commit();
      return res.status(200).json({
        message: "Resume your current attempt.",
        attempt_id: openRows[0].id,
        question_variant: openRows[0].question_variant,
        started_at: openRows[0].start_time,
        countdown_ends_at: heist.countdown_ends_at,
        resumed: true,
      });
    }

    // ✅ create new attempt (unique-per-user until variants exhausted)
    const variant = await pickVariantForUser(conn, heist, userId, safeJsonParse, toOneWord);
    const startTime = nowSql();

    const [ins] = await conn.query(
      `
      INSERT INTO heist_attempts
        (heist_id, user_id, question_variant, correct_answer, start_time)
      VALUES (?, ?, ?, ?, ?)
      `,
      [heistId, userId, variant.question_variant, variant.correct_answer, startTime]
    );

    await conn.commit();
    return res.status(201).json({
      attempt_id: ins.insertId,
      question_variant: variant.question_variant,
      countdown_ends_at: heist.countdown_ends_at,
      started_at: startTime,
      heist_status: heist.status,
    });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    console.error("start attempt error:", err);
    return res.status(500).json({ message: "Error starting attempt", error: err.message });
  } finally {
    conn.release();
  }
});
/** * POST /api/heists/heist/:id/submit */
router.post("/heist/:id/submit", authenticateToken, async (req, res) => {
  const heistId = Number(req.params.id);
  const userId = req.user.id;
  const { attempt_id, answer } = req.body || {};

  if (!attempt_id) return res.status(400).json({ message: "attempt_id is required" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [pRows] = await conn.query(
      "SELECT 1 FROM heist_participants WHERE heist_id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
      [heistId, userId]
    );
    if (!pRows.length) {
      await conn.rollback();
      return res.status(403).json({ message: "You have not joined this heist." });
    }

    const [hRows] = await conn.query("SELECT * FROM heist WHERE id = ? FOR UPDATE", [heistId]);
    let heist = hRows[0];
    if (!heist) {
      await conn.rollback();
      return res.status(404).json({ message: "Heist not found." });
    }

    const fin = await finalizeHeistIfEnded(conn, heistId);
    if (fin.finalized && fin.heist?.status === "completed") {
      await conn.commit();
      return res.status(200).json({ message: "Heist ended.", status: "completed" });
    }

    if (heist.status === "completed") {
      await conn.rollback();
      return res.status(400).json({ message: "Heist has ended and is no longer playable." });
    }

    if (heist.status === "pending") {
      await startCountdownIfReady(conn, heistId);
      const [h2] = await conn.query("SELECT * FROM heist WHERE id = ? FOR UPDATE", [heistId]);
      heist = h2[0] || heist;
    }

    // lock attempt
    const [aRows] = await conn.query(
      `
      SELECT *
      FROM heist_attempts
      WHERE id = ? AND heist_id = ? AND user_id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [Number(attempt_id), heistId, userId]
    );

    const attempt = aRows[0];
    if (!attempt) {
      await conn.rollback();
      return res.status(404).json({ message: "Attempt not found." });
    }

    if (attempt.end_time) {
      await conn.rollback();
      return res.status(400).json({ message: "This attempt is already completed." });
    }

    const submitted = normalizeAnswer(answer, toOneWord);
    if (!submitted) {
      await conn.rollback();
      return res.status(400).json({ message: "Answer is required." });
    }

    const correct = normalizeAnswer(attempt.correct_answer, toOneWord);

    // ✅ compute time so far (even if wrong)
    const now = nowSql();
    const startMoment = moment(attempt.start_time);
    const nowMoment = moment(now);
    const timeSoFarSeconds = Math.max(0, nowMoment.diff(startMoment, "seconds"));

    const isCorrect = submitted && correct && submitted === correct ? 1 : 0;

    // wrong => keep open, return time so far
    if (!isCorrect) {
      await conn.query(
        `
        UPDATE heist_attempts
        SET submitted_answer = ?,
            is_correct = 0
        WHERE id = ?
        `,
        [submitted, attempt.id]
      );

      await conn.commit();
      return res.json({
        message: "Incorrect! Try again.",
        is_correct: false,
        attempt_open: true,
        heist_status: heist.status,
        time_so_far_seconds: timeSoFarSeconds, // ✅ ADDED
      });
    }

    // correct => close attempt
    const endTime = now; // reuse computed now
    const totalSeconds = timeSoFarSeconds; // reuse computed elapsed

    await conn.query(
      `
      UPDATE heist_attempts
      SET
        submitted_answer = ?,
        is_correct = 1,
        end_time = ?,
        total_time_seconds = ?
      WHERE id = ?
      `,
      [submitted, endTime, totalSeconds, attempt.id]
    );

    const [bestRows] = await conn.query(
      `
      SELECT MIN(total_time_seconds) AS best_time
      FROM heist_attempts
      WHERE heist_id = ?
        AND user_id = ?
        AND is_correct = 1
        AND total_time_seconds IS NOT NULL
      `,
      [heistId, userId]
    );

    await conn.commit();
    return res.json({
      message: "Correct!",
      is_correct: true,
      total_time_seconds: totalSeconds,
      user_best_time: bestRows[0]?.best_time != null ? Number(bestRows[0].best_time) : null,
      attempt_open: false,
      heist_status: heist.status,
    });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    console.error("submit attempt error:", err);
    return res.status(500).json({ message: "Error submitting attempt", error: err.message });
  } finally {
    conn.release();
  }
});
/** * POST /api/heists/heist/:id/retry */
router.post("/heist/:id/retry", authenticateToken, async (req, res) => {
  const heistId = Number(req.params.id);
  const userId = req.user.id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // must be participant
    const [pRows] = await conn.query(
      "SELECT 1 FROM heist_participants WHERE heist_id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
      [heistId, userId]
    );
    if (!pRows.length) {
      await conn.rollback();
      return res.status(403).json({ message: "You have not joined this heist." });
    }

    // lock heist row
    const [hRows] = await conn.query("SELECT * FROM heist WHERE id = ? FOR UPDATE", [heistId]);
    const heist = hRows[0];
    if (!heist) {
      await conn.rollback();
      return res.status(404).json({ message: "Heist not found." });
    }

    // finalize if ended
    const fin = await finalizeHeistIfEnded(conn, heistId);
    if (fin.finalized && fin.heist?.status === "completed") {
      await conn.commit();
      return res.status(200).json({ message: "Heist ended.", status: "completed" });
    }

    if (heist.status === "completed") {
      await conn.rollback();
      return res.status(400).json({ message: "Heist has ended and is no longer playable." });
    }

    // must not have open attempt
    const [openRows] = await conn.query(
      `
      SELECT 1
      FROM heist_attempts
      WHERE heist_id = ? AND user_id = ? AND end_time IS NULL
      LIMIT 1
      FOR UPDATE
      `,
      [heistId, userId]
    );
    if (openRows.length) {
      await conn.rollback();
      return res.status(400).json({
        message: "Finish your current attempt first (keep submitting until correct).",
      });
    }

    // must have at least one correct completion already
    const [correctRows] = await conn.query(
      `
      SELECT 1
      FROM heist_attempts
      WHERE heist_id = ? AND user_id = ? AND is_correct = 1 AND end_time IS NOT NULL
      LIMIT 1
      FOR UPDATE
      `,
      [heistId, userId]
    );
    if (!correctRows.length) {
      await conn.rollback();
      return res.status(400).json({
        message: "Retry is only available after you get a correct answer at least once.",
      });
    }

    // charge retry fee (optional)
    const retryCost = Number(heist.retry_ticket_price || 0);
    if (retryCost > 0) {
      const [uRows] = await conn.query(
        "SELECT id, bid_points FROM users WHERE id = ? FOR UPDATE",
        [userId]
      );
      const user = uRows[0];
      if (!user) {
        await conn.rollback();
        return res.status(404).json({ message: "User not found." });
      }
      if (Number(user.bid_points) < retryCost) {
        await conn.rollback();
        return res.status(400).json({ message: "Insufficient bid points for retry." });
      }
      await conn.query("UPDATE users SET bid_points = bid_points - ? WHERE id = ?", [
        retryCost,
        userId,
      ]);
    }

    // ✅ create retry attempt (unique-per-user until variants exhausted)
    const variant = await pickVariantForUser(conn, heist, userId, safeJsonParse, toOneWord);
    const startTime = nowSql();

    const [ins] = await conn.query(
      `
      INSERT INTO heist_attempts
        (heist_id, user_id, question_variant, correct_answer, start_time)
      VALUES (?, ?, ?, ?, ?)
      `,
      [heistId, userId, variant.question_variant, variant.correct_answer, startTime]
    );

    await conn.commit();
    return res.status(201).json({
      message: "Retry started",
      retry_cost: retryCost,
      attempt_id: ins.insertId,
      question_variant: variant.question_variant,
      countdown_ends_at: heist.countdown_ends_at,
      started_at: startTime,
    });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    console.error("retry error:", err);
    return res.status(500).json({ message: "Error creating retry attempt", error: err.message });
  } finally {
    conn.release();
  }
});
/** * GET api/heists/heist/:id/leaderboard */
router.get("/heist/:id/leaderboard", authenticateToken, async (req, res) => {
  const heistId = Number(req.params.id);

  const page = Math.max(1, Number(req.query.page || 1) || 1);
  const limitRaw = Number(req.query.limit || 20) || 20;
  const limit = Math.min(100, Math.max(1, limitRaw));
  const offset = (page - 1) * limit;

  try {
    // ✅ total joined users count (for pagination)
    const [[cntRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM heist_participants
       WHERE heist_id = ?`,
      [heistId]
    );
    const total = Number(cntRow?.total || 0);
    const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

    // ✅ Pull ALL joined users, and LEFT JOIN attempts summary
    // - best_time: best correct time (NULL if none)
    // - attempts_count: total attempts
    // - correct_attempts: number of correct attempts
    // Sort keeps real leaderboard behavior but ensures joined users appear.
    const [rows] = await pool.query(
      `
      SELECT
        p.user_id,
        u.username,
        u.full_name,
        u.profile,

        MIN(CASE WHEN a.is_correct = 1 THEN a.total_time_seconds END) AS best_time,
        COUNT(a.id) AS attempts_count,
        SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS correct_attempts

      FROM heist_participants p
      JOIN users u
        ON u.id = p.user_id
      LEFT JOIN heist_attempts a
        ON a.heist_id = p.heist_id
       AND a.user_id = p.user_id

      WHERE p.heist_id = ?

      GROUP BY
        p.user_id,
        u.username,
        u.full_name,
        u.profile

      ORDER BY
        (SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) > 0) DESC,
        MIN(CASE WHEN a.is_correct = 1 THEN a.total_time_seconds END) ASC,
        COUNT(a.id) ASC,
        p.id DESC

      LIMIT ?
      OFFSET ?
      `,
      [heistId, limit, offset]
    );

    const leaderboard = rows.map((r) => ({
      user_id: r.user_id,
      best_time: r.best_time != null ? Number(r.best_time) : null,
      attempts_count: Number(r.attempts_count || 0),
      correct_attempts: Number(r.correct_attempts || 0),
      username: r.username || null,
      full_name: r.full_name || null,
      image: r.profile ? absUrl(req, r.profile) : null,
      joined: true, // ✅ explicitly indicates they joined
    }));

    return res.json({
      heistId,
      page,
      limit,
      total,
      totalPages,
      leaderboard,
    });
  } catch (err) {
    console.error("leaderboard error:", err);
    return res.status(500).json({ message: "Error fetching leaderboard", error: err.message });
  }
});
/** * GET /heist/:id/result */
router.get("/heist/:id/result", authenticateToken, async (req, res) => {
  const heistId = Number(req.params.id);
  const userId = req.user.id;

  try {
    const [hRows] = await pool.query("SELECT * FROM heist WHERE id = ? LIMIT 1", [heistId]);
    const heist = hRows[0];
    if (!heist) return res.status(404).json({ message: "Heist not found" });

    const [bestRows] = await pool.query(
      `
      SELECT MIN(total_time_seconds) AS best_time
      FROM heist_attempts
      WHERE heist_id = ?
        AND user_id = ?
        AND is_correct = 1
        AND total_time_seconds IS NOT NULL
      `,
      [heistId, userId]
    );

    let winner = null;
    if (heist.winner_id) {
      const [uRows] = await pool.query(
        "SELECT id, username, full_name, profile FROM users WHERE id = ? LIMIT 1",
        [Number(heist.winner_id)]
      );
      const u = uRows[0];
      winner = u
        ? {
            id: u.id,
            username: u.username,
            full_name: u.full_name,
            image: u.profile ? absUrl(req, u.profile) : null,
          }
        : { id: heist.winner_id, username: null, full_name: "Unknown", image: null };
    }

    res.json({
      heist: {
        id: heist.id,
        name: heist.name,
        status: heist.status,
        countdown_started_at: heist.countdown_started_at,
        countdown_ends_at: heist.countdown_ends_at,
        submissions_locked: !!heist.submissions_locked,
      },
      userBestTime: bestRows[0]?.best_time != null ? Number(bestRows[0].best_time) : null,
      winner,
    });
  } catch (err) {
    console.error("result error:", err);
    res.status(500).json({ message: "Error fetching result", error: err.message });
  }
});

// ✅ COMPLETED HEISTS SUMMARY (history)
// Shows: heist info + winner + leaderboard (top 20) + ALL attempts for that heist (for summary page)
// GET /api/heists/heists/completed
router.get("/heists/completed", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1) Get completed heists (latest first)
    const [heists] = await pool.query(
      `
      SELECT
        h.id,
        h.name,
        h.story,
        h.prize,
        h.prize_name,
        h.prize_image,
        h.winner_id,
        h.status,
        h.countdown_started_at,
        h.countdown_ends_at,
        h.submissions_locked,
        h.created_at,
        h.updated_at
      FROM heist h
      WHERE h.status = 'completed'
      ORDER BY h.id DESC
      LIMIT 50
      `
    );

    if (!heists.length) {
      return res.json({ completed: [], count: 0 });
    }

    const heistIds = heists.map((h) => Number(h.id)).filter(Boolean);

    // 2) Winner users map (for winner card)
    const winnerIds = [
      ...new Set(
        heists
          .map((h) => (h.winner_id != null ? Number(h.winner_id) : null))
          .filter((v) => Number.isFinite(v))
      ),
    ];

    let winnersMap = new Map();
    if (winnerIds.length) {
      const [uRows] = await pool.query(
        `SELECT id, username, full_name, profile FROM users WHERE id IN (${winnerIds
          .map(() => "?")
          .join(",")})`,
        winnerIds
      );
      winnersMap = new Map(uRows.map((u) => [Number(u.id), u]));
    }

    // 3) Leaderboard per heist (top 20)
    const [lbRows] = await pool.query(
      `
      SELECT
        a.heist_id,
        a.user_id,
        MIN(CASE WHEN a.is_correct = 1 THEN a.total_time_seconds END) AS best_time,
        COUNT(*) AS attempts_count,
        SUM(a.is_correct = 1) AS correct_attempts
      FROM heist_attempts a
      WHERE a.heist_id IN (${heistIds.map(() => "?").join(",")})
      GROUP BY a.heist_id, a.user_id
      ORDER BY a.heist_id DESC
      `,
      heistIds
    );

    const allUserIds = [...new Set(lbRows.map((r) => Number(r.user_id)).filter(Boolean))];

    let usersMap = new Map();
    if (allUserIds.length) {
      const [users] = await pool.query(
        `SELECT id, username, full_name, profile FROM users WHERE id IN (${allUserIds
          .map(() => "?")
          .join(",")})`,
        allUserIds
      );
      usersMap = new Map(users.map((u) => [Number(u.id), u]));
    }

    // Group leaderboard rows by heist_id
    const lbByHeist = new Map();
    for (const r of lbRows) {
      const hid = Number(r.heist_id);
      if (!lbByHeist.has(hid)) lbByHeist.set(hid, []);
      lbByHeist.get(hid).push(r);
    }

    // For each heist: sort to match your /leaderboard logic and keep top 20
    for (const [hid, arr] of lbByHeist.entries()) {
      arr.sort((a, b) => {
        const aHas = Number(a.correct_attempts || 0) > 0 ? 1 : 0;
        const bHas = Number(b.correct_attempts || 0) > 0 ? 1 : 0;
        if (bHas !== aHas) return bHas - aHas;

        const aBest = a.best_time == null ? Number.POSITIVE_INFINITY : Number(a.best_time);
        const bBest = b.best_time == null ? Number.POSITIVE_INFINITY : Number(b.best_time);
        if (aBest !== bBest) return aBest - bBest;

        const aCnt = Number(a.attempts_count || 0);
        const bCnt = Number(b.attempts_count || 0);
        return aCnt - bCnt;
      });

      lbByHeist.set(hid, arr.slice(0, 20));
    }

    // 4) ALL attempts (history) per heist
    // Includes question_variant + correct_answer + submitted_answer + times
    const [attemptRows] = await pool.query(
      `
      SELECT
        a.heist_id,
        a.id AS attempt_id,
        a.user_id,
        a.question_variant,
        a.correct_answer,
        a.submitted_answer,
        a.is_correct,
        a.start_time,
        a.end_time,
        a.total_time_seconds,
        a.created_at
      FROM heist_attempts a
      WHERE a.heist_id IN (${heistIds.map(() => "?").join(",")})
      ORDER BY a.heist_id DESC, a.id ASC
      `,
      heistIds
    );

    const attemptsByHeist = new Map();
    for (const a of attemptRows) {
      const hid = Number(a.heist_id);
      if (!attemptsByHeist.has(hid)) attemptsByHeist.set(hid, []);
      const u = usersMap.get(Number(a.user_id));
      attemptsByHeist.get(hid).push({
        attempt_id: a.attempt_id,
        user_id: a.user_id,
        username: u?.username || null,
        full_name: u?.full_name || null,
        image: u?.profile ? absUrl(req, u.profile) : null,

        question_variant: a.question_variant,
        correct_answer: a.correct_answer,
        submitted_answer: a.submitted_answer,

        is_correct: !!a.is_correct,
        start_time: a.start_time,
        end_time: a.end_time,
        total_time_seconds: a.total_time_seconds != null ? Number(a.total_time_seconds) : null,
        created_at: a.created_at,
      });
    }

    // 5) Build response (each heist includes summary + leaderboard + attempts)
    const completed = heists.map((h) => {
      const hid = Number(h.id);

      const winUser =
        h.winner_id != null ? winnersMap.get(Number(h.winner_id)) : null;

      const leaderboardRaw = lbByHeist.get(hid) || [];
      const leaderboard = leaderboardRaw.map((r) => {
        const u = usersMap.get(Number(r.user_id));
        return {
          user_id: r.user_id,
          best_time: r.best_time != null ? Number(r.best_time) : null,
          attempts_count: Number(r.attempts_count || 0),
          correct_attempts: Number(r.correct_attempts || 0),
          username: u?.username || null,
          full_name: u?.full_name || null,
          image: u?.profile ? absUrl(req, u.profile) : null,
        };
      });

      // Optional: show logged-in user's best time for that heist
      const myBest = leaderboard.find((x) => String(x.user_id) === String(userId))?.best_time ?? null;

      return {
        heist: {
          id: h.id,
          name: h.name,
          story: h.story, // ✅ completed: show story fully
          prize: h.prize,
          prize_name: h.prize_name,
          prize_image: absUrl(req, h.prize_image),
          status: h.status,
          countdown_started_at: h.countdown_started_at,
          countdown_ends_at: h.countdown_ends_at,
          submissions_locked: !!h.submissions_locked,
          created_at: h.created_at,
          updated_at: h.updated_at,
        },
        winner: h.winner_id
          ? {
              id: h.winner_id,
              username: winUser?.username || null,
              full_name: winUser?.full_name || "Unknown",
              image: winUser?.profile ? absUrl(req, winUser.profile) : null,
            }
          : null,
        userBestTime: myBest,
        leaderboard, // ✅ aligns with /heist/:id/leaderboard output structure
        attempts: attemptsByHeist.get(hid) || [], // ✅ full Q/A + timing history
      };
    });

    return res.json({
      count: completed.length,
      completed,
    });
  } catch (err) {
    console.error("completed heists error:", err);
    return res.status(500).json({ message: "Error fetching completed heists", error: err.message });
  }
});

module.exports = router;