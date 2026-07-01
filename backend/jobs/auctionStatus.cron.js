// jobs/auctionStatus.cron.js
const cron = require("node-cron");
const { pool } = require("../db");

let isPendingToHoldRunning = false;
let isClosingJobRunning = false;

// lightweight runtime status you can read from elsewhere
const cronStatus = {
  pendingToHold: {
    running: false,
    lastRunAt: null,
    lastUpdated: 0,
  },
  closeAuctions: {
    running: false,
    lastRunAt: null,
    lastCandidates: 0,
    lastCompleted: 0,
    lastCancelled: 0,
    lastRefundedUsers: 0,
    lastRefundedPoints: 0,
  },
};

/* -------------------------------------------------------------------------- */
/*   If participants >= minimum_users → set status = 'hold' (every 10 sec)    */
/* -------------------------------------------------------------------------- */
const startAuctionPendingToHoldJob = () => {
  cron.schedule("*/10 * * * * *", async () => {
    if (isPendingToHoldRunning) return;
    isPendingToHoldRunning = true;
    cronStatus.pendingToHold.running = true;

    const conn = await pool.getConnection();
    try {
      const [result] = await conn.query(`
        UPDATE auctions a
        JOIN (
          SELECT auction_id, COUNT(*) AS cnt
          FROM auction_participants
          GROUP BY auction_id
        ) ap ON ap.auction_id = a.id
        SET a.status = 'hold',
            a.updated_at = CURRENT_TIMESTAMP
        WHERE a.status = 'pending'
          AND ap.cnt >= a.minimum_users
      `);

      cronStatus.pendingToHold.lastRunAt = new Date().toISOString();
      cronStatus.pendingToHold.lastUpdated = result?.affectedRows || 0;
    } catch (_) {
      // silent by design
    } finally {
      conn.release();
      isPendingToHoldRunning = false;
      cronStatus.pendingToHold.running = false;
    }
  });
};

/* -------------------------------------------------------------------------- */
/* Close expired ACTIVE auctions every SECOND                                 */
/*   - If no bids → cancel                                                    */
/*   - Else: winner set, final price saved                                    */
/*   - Refund ONLY non-winners' bid_points spent in this auction              */
/*   - Winner gets cart item marked 'paid'                                    */
/* -------------------------------------------------------------------------- */
const startAuctionCloseJob = () => {
  // Runs every second now
  cron.schedule("* * * * * *", async () => {
    if (isClosingJobRunning) return;
    isClosingJobRunning = true;
    cronStatus.closeAuctions.running = true;

    const conn = await pool.getConnection();
    try {
      const [ids] = await conn.query(`
        SELECT id
        FROM auctions
        WHERE status = 'active'
          AND end_date IS NOT NULL
          AND end_date <= NOW()
        LIMIT 100
      `);

      // reset per-tick counters
      cronStatus.closeAuctions.lastRunAt = new Date().toISOString();
      cronStatus.closeAuctions.lastCandidates = ids.length || 0;
      cronStatus.closeAuctions.lastCompleted = 0;
      cronStatus.closeAuctions.lastCancelled = 0;
      cronStatus.closeAuctions.lastRefundedUsers = 0;
      cronStatus.closeAuctions.lastRefundedPoints = 0;

      for (const { id: auctionId } of ids) {
        await conn.beginTransaction();
        try {
          const [aRows] = await conn.query(
            `SELECT id, highest_bidder, current_bid_amount, status, end_date
               FROM auctions
              WHERE id = ?
              FOR UPDATE`,
            [auctionId]
          );
          if (!aRows.length) { await conn.rollback(); continue; }
          const a = aRows[0];

          if (a.status !== "active" || !a.end_date || new Date(a.end_date) > new Date()) {
            await conn.rollback();
            continue;
          }

          if (!a.highest_bidder) {
            await conn.query(
              `UPDATE auctions
                 SET status = 'cancelled',
                     updated_at = CURRENT_TIMESTAMP
               WHERE id = ? AND status = 'active'`,
              [auctionId]
            );
            await conn.commit();
            cronStatus.closeAuctions.lastCancelled += 1;
            continue;
          }

          const finalPrice = a.current_bid_amount || 0;
          await conn.query(
            `UPDATE auctions
                SET status = 'completed',
                    winner_id = ?,
                    final_price = ?,
                    updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND status = 'active'`,
            [a.highest_bidder, finalPrice, auctionId]
          );

          const [nonWinRows] = await conn.query(
            `SELECT user_id, bid_points
               FROM auction_bid_points
              WHERE auction_id = ?
                AND user_id <> ?`,
            [auctionId, a.highest_bidder]
          );

          for (const r of nonWinRows) {
            const pts = Math.max(0, parseInt(r.bid_points, 10) || 0);
            if (!pts) continue;
            await conn.query(
              "UPDATE users SET bid_points = bid_points + ? WHERE id = ?",
              [pts, r.user_id]
            );
            cronStatus.closeAuctions.lastRefundedUsers += 1;
            cronStatus.closeAuctions.lastRefundedPoints += pts;
          }

          await conn.query(
            `INSERT INTO cart (user_id, auction_id, price, status)
             VALUES (?, ?, ?, 'paid')
             ON DUPLICATE KEY UPDATE price = VALUES(price), status = 'paid'`,
            [a.highest_bidder, auctionId, finalPrice]
          );

          await conn.commit();
          cronStatus.closeAuctions.lastCompleted += 1;
        } catch (_) {
          try { await conn.rollback(); } catch {}
          // silent by design
        }
      }
    } catch (_) {
      // silent by design
    } finally {
      conn.release();
      isClosingJobRunning = false;
      cronStatus.closeAuctions.running = false;
    }
  });
};


/** Optional: expose a simple getter so you can check job health from a route */
const getAuctionCronStatus = () => ({ ...cronStatus });

module.exports = {
  startAuctionPendingToHoldJob,
  startAuctionCloseJob,
  getAuctionCronStatus, // call this in an admin route to verify it's running
};
