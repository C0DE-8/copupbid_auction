'use strict';

const cron = require('node-cron');
const { pool } = require('../db'); 

// Winner -> 'won'; all other participants -> 'fulfilled'
async function applyOutcomeForEvent(conn, { productId, mode, winnerId, participantIds }) {
  if (!participantIds || participantIds.length === 0) return;

  // 1) Winner row -> 'won'
  if (Number.isFinite(winnerId)) {
    await conn.query(
      `UPDATE bids_waitlist
          SET status = 'won'
        WHERE product_id = ?
          AND mode = ?
          AND user_id = ?
          AND status <> 'won'
        LIMIT 1`,
      [productId, mode, winnerId]
    );
  }

  // 2) Non-winners -> 'fulfilled'
  const nonWinners = participantIds
    .map(Number)
    .filter((uid) => Number.isFinite(uid) && uid !== Number(winnerId));

  if (nonWinners.length > 0) {
    // make placeholders (?, ?, ?, ...)
    const placeholders = nonWinners.map(() => '?').join(',');
    await conn.query(
      `UPDATE bids_waitlist
          SET status = 'fulfilled'
        WHERE product_id = ?
          AND mode = ?
          AND user_id IN (${placeholders})
          AND status NOT IN ('fulfilled','won')`,
      [productId, mode, ...nonWinners]
    );
  }
}

async function scanAndFulfillWinners() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // -------- Auctions with a winner_id --------
    const [auctions] = await conn.query(
      `SELECT id, product_id, winner_id
         FROM auctions
        WHERE winner_id IS NOT NULL`
    );

    for (const a of auctions) {
      const auctionId = Number(a.id);
      const productId = Number(a.product_id);
      const winnerId  = Number(a.winner_id);

      if (!Number.isFinite(auctionId) || !Number.isFinite(productId) || !Number.isFinite(winnerId)) continue;

      // Fetch participant user_ids for this auction
      const [parts] = await conn.query(
        `SELECT DISTINCT user_id
           FROM auction_participants
          WHERE auction_id = ?`,
        [auctionId]
      );
      const participantIds = parts.map(r => Number(r.user_id)).filter(Number.isFinite);

      await applyOutcomeForEvent(conn, {
        productId,
        mode: 'auction',
        winnerId,
        participantIds
      });
    }

    // -------- Heists with a winner_id --------
    const [heists] = await conn.query(
      `SELECT id, product_id, winner_id
         FROM heist
        WHERE winner_id IS NOT NULL`
    );

    for (const h of heists) {
      const heistId   = Number(h.id);
      const productId = Number(h.product_id);
      const winnerId  = Number(h.winner_id);

      if (!Number.isFinite(heistId) || !Number.isFinite(productId) || !Number.isFinite(winnerId)) continue;

      // Fetch participant user_ids for this heist
      const [parts] = await conn.query(
        `SELECT DISTINCT user_id
           FROM heist_participants
          WHERE heist_id = ?`,
        [heistId]
      );
      const participantIds = parts.map(r => Number(r.user_id)).filter(Number.isFinite);

      await applyOutcomeForEvent(conn, {
        productId,
        mode: 'heist',
        winnerId,
        participantIds
      });
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.error('[cron] fulfill winners error:', err);
  } finally {
    conn.release();
  }
}

// Run every second
function start() {
  // node-cron with seconds: '* * * * * *' = every second
  cron.schedule('* * * * * *', () => {
    scanAndFulfillWinners().catch((e) => console.error('[cron] task error:', e));
  });
  console.log('[cron] winners cron scheduled: every 1 second');
}

module.exports = { start };
