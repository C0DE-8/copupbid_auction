// jobs/heistStatus.cron.js
const cron = require("node-cron");
const { pool } = require("../db");
const moment = require("moment");

let isHeistStatusJobRunning = false;

function nowSql() {
  return moment().format("YYYY-MM-DD HH:mm:ss");
}

function addMinutesSql(minutes) {
  return moment().add(Number(minutes || 0), "minutes").format("YYYY-MM-DD HH:mm:ss");
}

/**
 * Finalize winner if ended (CASH ONLY)
 * Must be called inside transaction with heist row locked FOR UPDATE
 */
async function finalizeHeistIfEnded(conn, heistId) {
  const [hRows] = await conn.query("SELECT * FROM heist WHERE id = ? FOR UPDATE", [heistId]);
  const heist = hRows[0];
  if (!heist) return { finalized: false, reason: "not_found" };

  if (heist.status === "completed") return { finalized: true, reason: "already_completed", heist };

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
  return { finalized: true, reason: "finalized", heist: finalRows[0] };
}

/**
 * Every minute:
 *  1) (Backup) pending -> started if participants >= min_users and countdown not set
 *  2) started -> completed when countdown ended (or submissions_locked)
 */
const startHeistStatusJob = () => {
  cron.schedule("*/1 * * * *", async () => {
    if (isHeistStatusJobRunning) return;
    isHeistStatusJobRunning = true;

    const conn = await pool.getConnection();
    try {
      // ----------------------------------------------------------------
      // 1) ✅ BACKUP AUTO-START (in case router didn’t start it)
      // pending -> started when participants >= min_users AND countdown not started
      // ----------------------------------------------------------------
      const startedAt = nowSql();

      const [pendingReady] = await conn.query(
        `
        SELECT h.id, h.countdown_duration_minutes
        FROM heist h
        LEFT JOIN (
          SELECT heist_id, COUNT(*) AS cnt
          FROM heist_participants
          GROUP BY heist_id
        ) hp ON hp.heist_id = h.id
        WHERE h.status = 'pending'
          AND h.countdown_started_at IS NULL
          AND COALESCE(hp.cnt, 0) >= h.min_users
        LIMIT 200
        `
      );

      let startedCount = 0;
      for (const h of pendingReady) {
        const endsAt = addMinutesSql(Number(h.countdown_duration_minutes || 10));
        const [r] = await conn.query(
          `
          UPDATE heist
          SET
            status = 'started',
            countdown_started_at = ?,
            countdown_ends_at = ?,
            submissions_locked = 0,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
            AND status = 'pending'
            AND countdown_started_at IS NULL
          `,
          [startedAt, endsAt, h.id]
        );
        if (r.affectedRows) startedCount += 1;
      }

      if (startedCount) {
        console.log(`[cron][heist] started ${startedCount} pending heist(s) (backup auto-start)`);
      }

      // ----------------------------------------------------------------
      // 2) ✅ FINALIZE (started -> completed)
      // ----------------------------------------------------------------
      const [toFinalize] = await conn.query(
        `
        SELECT id
        FROM heist
        WHERE status != 'completed'
          AND (
            (countdown_ends_at IS NOT NULL AND countdown_ends_at <= NOW())
            OR submissions_locked = 1
          )
        LIMIT 200
        `
      );

      let finalizedCount = 0;
      for (const row of toFinalize) {
        try {
          await conn.beginTransaction();
          const fin = await finalizeHeistIfEnded(conn, row.id);
          await conn.commit();
          if (fin.finalized && fin.reason === "finalized") finalizedCount += 1;
        } catch (e) {
          try {
            await conn.rollback();
          } catch {}
          console.error(`[cron][heist] finalize error (heist ${row.id}):`, e.message);
        }
      }

      if (finalizedCount) {
        console.log(`[cron][heist] finalized ${finalizedCount} heist(s)`);
      }
    } catch (err) {
      console.error("[cron][heist] status job error:", err.message);
    } finally {
      conn.release();
      isHeistStatusJobRunning = false;
    }
  });
};

module.exports = { startHeistStatusJob };