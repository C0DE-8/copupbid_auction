// routes/users.js (CommonJS)
const express = require("express");
const { pool } = require("../db");
const moment = require("moment-timezone");
const { authenticateToken } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const { absUrl } = require('../middleware/upload');

const { sendTelegramNotification } = require("../lib/telegram");

const router = express.Router();

/* ---------- Helper ID Checkers (HEIST) ---------- */
function isCopId(val) {
  return typeof val === "string" && val.startsWith("cop_");
}
function isNumericId(val) {
  // allows "12" or 12
  const n = Number(val);
  return Number.isInteger(n) && String(val).trim() !== "" && n >= 0;
}

// GET /api/users/profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT
          id,
          full_name,
          username,
          email,
          profile,
          wallet_address,
          referral_code,
          game_id,
          bid_points,
          task_coin,
          created_at,
          -- expose only whether a PIN exists (assuming we store a hash in users.pin)
          CASE WHEN pin IS NULL OR pin = '' THEN 0 ELSE 1 END AS has_pin
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    // Do NOT include the actual pin (or pin hash) in the response
    const {
      pin, // ignore if present
      ...safeProfile
    } = rows[0];

    res.status(200).json(safeProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Error fetching user profile" });
  }
});
// PUT /api/users/profile
router.put("/profile", authenticateToken,
  upload.single("profile"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      let { full_name, username } = req.body || {};

      // normalize inputs
      full_name = full_name !== undefined ? String(full_name).trim() : undefined;
      username  = username  !== undefined ? String(username).trim()  : undefined;

      // must update at least one thing (non-empty)
      if (
        (!req.file) &&
        (full_name === undefined || full_name === "") &&
        (username === undefined || username === "")
      ) {
        return res.status(400).json({
          message: "Provide non-empty full_name, username, or profile image to update.",
        });
      }

      const fields = [];
      const values = [];

      // full_name validation
      if (full_name !== undefined) {
        if (full_name.length < 2) {
          return res.status(400).json({
            message: "full_name must be at least 2 characters.",
          });
        }
        fields.push("full_name = ?");
        values.push(full_name);
      }

      // username validation + uniqueness
      if (username !== undefined) {
        if (username.length < 3) {
          return res.status(400).json({
            message: "Username must be at least 3 characters.",
          });
        }

        // allow only safe chars
        if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
          return res.status(400).json({
            message: "Username contains invalid characters.",
          });
        }

        // check if username already exists for another user
        const [uRows] = await pool.query(
          "SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1",
          [username, userId]
        );
        if (uRows.length) {
          return res.status(409).json({
            message: "Username already taken.",
          });
        }

        fields.push("username = ?");
        values.push(username);
      }

      // profile image
      if (req.file) {
        fields.push("profile = ?");
        values.push(`uploads/${req.file.filename}`);
      }

      // final safety
      if (!fields.length) {
        return res.status(400).json({
          message: "No valid data provided for update.",
        });
      }

      values.push(userId);

      await pool.query(
        `
        UPDATE users
           SET ${fields.join(", ")},
               updated_at = NOW()
         WHERE id = ?
        `,
        values
      );

      // return updated profile
      const [rows] = await pool.query(
        `SELECT id, full_name, username, profile
           FROM users
          WHERE id = ?
          LIMIT 1`,
        [userId]
      );

      return res.status(200).json({
        message: "Profile updated successfully.",
        user: {
          id: rows[0].id,
          full_name: rows[0].full_name,
          username: rows[0].username,
          profile: rows[0].profile ? absUrl(req, rows[0].profile) : null,
        },
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({
        message: "Error updating profile",
        error: error.message,
      });
    }
  }
);

/* ─────────────────────────── GET referrals ─────────────────────────── */
router.get("/referrals", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.email, u.created_at
         FROM referrals r
         JOIN users u ON r.referred_id = u.id
        WHERE r.referrer_id = ?
        ORDER BY u.created_at DESC`,
      [userId]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching referrals:", error);
    res.status(500).json({ message: "Error fetching referrals", error: error.message });
  }
});


/* ───────────────────────────── GET ALL AUCTION ───────────────────────────── */
router.get("/auctions",authenticateToken,
  async (req, res) => {
    try {
      const { q, category, status, page = 1, limit = 50 } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const offset = (pageNum - 1) * lim;

      const where = [];
      const params = [];

      if (q) {
        where.push("(name LIKE ? OR description LIKE ?)");
        const term = `%${q}%`;
        params.push(term, term);
      }
      if (category && ["cash", "product", "coupon"].includes(String(category).toLowerCase())) {
        where.push("category = ?");
        params.push(String(category).toLowerCase());
      }
      if (status && ["pending", "active", "completed", "cancelled"].includes(String(status).toLowerCase())) {
        where.push("status = ?");
        params.push(String(status).toLowerCase());
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM auctions ${whereSql}`,
        params
      );

      const [rows] = await pool.query(
        `SELECT id, name, description, image, entry_bid_points, minimum_users,
                category, status, created_by, created_at, updated_at
         FROM auctions
         ${whereSql}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [...params, lim, offset]
      );

      const data = rows.map(r => ({
        ...r,
        image_url: absUrl(req, r.image),
      }));

      res.json({ page: pageNum, limit: lim, total, data });
    } catch (err) {
      console.error("admin/auctions list error:", err);
      res.status(500).json({ message: "Error fetching auctions" });
    }
  }
);
/* ────────────────────────── PAY ENTRY FEE 4 AUCTION ────────────────────────── */
router.post("/pay-entry/:id", authenticateToken, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const auctionId = Number(req.params.id);
    const userId = req.user.id;

    await conn.beginTransaction();

    // Lock auction row
    const [aRows] = await conn.query(
      "SELECT id, entry_bid_points, status FROM auctions WHERE id = ? FOR UPDATE",
      [auctionId]
    );
    const auction = aRows[0];
    if (!auction) {
      await conn.rollback();
      return res.status(404).json({ message: "Auction not found" });
    }

    // Already paid?
    const [pRows] = await conn.query(
      "SELECT 1 FROM auction_participants WHERE auction_id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
      [auctionId, userId]
    );
    if (pRows.length) {
      await conn.rollback();
      return res.status(400).json({ message: "Entry fee already paid" });
    }

    // Lock user
    const [uRows] = await conn.query(
      "SELECT id, bid_points FROM users WHERE id = ? FOR UPDATE",
      [userId]
    );
    const user = uRows[0];
    if (!user) {
      await conn.rollback();
      return res.status(404).json({ message: "User not found" });
    }
    if (user.bid_points < auction.entry_bid_points) {
      await conn.rollback();
      return res.status(400).json({ message: "Insufficient bid points" });
    }

    // Deduct entry points
    await conn.query(
      "UPDATE users SET bid_points = bid_points - ? WHERE id = ?",
      [auction.entry_bid_points, userId]
    );

    // Add participant
    await conn.query(
      "INSERT INTO auction_participants (auction_id, user_id) VALUES (?, ?)",
      [auctionId, userId]
    );

    await conn.commit();
    return res.status(201).json({ message: "Entry fee paid successfully" });
  } catch (err) {
    console.error("pay-entry error:", err);
    try { await conn.rollback(); } catch {}
    return res.status(500).json({ message: "Error paying entry fee", error: err.message });
  } finally {
    conn.release();
  }
});
/* ────────────────────────────── PLACE BID on AUCTION ───────────────────────────── */
router.post("/bid/:id", authenticateToken, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const auctionId = Number(req.params.id);
    const userId = req.user.id;
    const bidIncrement = 5; // fixed increment

    await conn.beginTransaction();

    // Lock auction
    const [aRows] = await conn.query(
      "SELECT id, status, highest_bidder, current_bid_amount, end_date FROM auctions WHERE id = ? FOR UPDATE",
      [auctionId]
    );
    const auction = aRows[0];
    if (!auction) {
      await conn.rollback();
      return res.status(404).json({ message: "Auction not found" });
    }
    if (auction.status !== "active") {
      await conn.rollback();
      return res.status(400).json({ message: "Auction is not active" });
    }

    // Lock user
    const [uRows] = await conn.query(
      "SELECT id, username, bid_points FROM users WHERE id = ? FOR UPDATE",
      [userId]
    );
    const user = uRows[0];
    if (!user) {
      await conn.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    // Must have paid entry
    const [pRows] = await conn.query(
      "SELECT 1 FROM auction_participants WHERE auction_id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
      [auctionId, userId]
    );
    if (!pRows.length) {
      await conn.rollback();
      return res.status(400).json({ message: "User has not paid entry fee" });
    }

    // Prevent consecutive bids by same highest bidder
    if (userId === auction.highest_bidder) {
      await conn.rollback();
      return res.status(400).json({ message: "You cannot bid again until another user bids" });
    }

    const proposedBidAmount = (auction.current_bid_amount || 0) + bidIncrement;

    // Enough points?
    if (user.bid_points < proposedBidAmount) {
      await conn.rollback();
      return res.status(400).json({ message: "Insufficient bid points" });
    }

    // Deduct user's points
    await conn.query(
      "UPDATE users SET bid_points = bid_points - ? WHERE id = ?",
      [proposedBidAmount, userId]
    );

    // Track bid spend per user (upsert)
    await conn.query(
      `INSERT INTO auction_bid_points (auction_id, user_id, bid_points)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE bid_points = bid_points + VALUES(bid_points)`,
      [auctionId, userId, proposedBidAmount]
    );

    // Unique bidders count (for timer)
    const [[{ uniqueBidders }]] = await conn.query(
      "SELECT COUNT(DISTINCT user_id) AS uniqueBidders FROM auction_bid_points WHERE auction_id = ?",
      [auctionId]
    );

    let timerDuration;
    if (uniqueBidders <= 2) {
      timerDuration = 5 * 60; // 5 minutes
    } else {
      timerDuration = 15; // 15 seconds
    }

    // Update auction with new highest/current and timer
    await conn.query(
      `UPDATE auctions
         SET highest_bidder = ?, current_bid_amount = ?, current_bidder = ?,
             end_date = DATE_ADD(NOW(), INTERVAL ? SECOND)
       WHERE id = ? AND status = 'active'`,
      [userId, proposedBidAmount, userId, timerDuration, auctionId]
    );

    // Fetch updated auction
    const [updatedRows] = await conn.query("SELECT * FROM auctions WHERE id = ?", [auctionId]);
    const updated = updatedRows[0];

    await conn.commit();
    return res.status(201).json({
      message: "Bid placed successfully",
      timerDuration,
      currentBidder: user.username,
      currentBidAmount: updated.current_bid_amount,
      highestBidder: updated.highest_bidder,
      endDate: updated.end_date,
    });
  } catch (err) {
    console.error("place bid error:", err);
    try { await conn.rollback(); } catch {}
    return res.status(500).json({ message: "Error placing bid", error: err.message });
  } finally {
    conn.release();
  }
});
/* ─────────────────────────── GET AUCTION BY ID ─────────────────────────── */
router.get("/auction/:id", authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [rows] = await pool.query(
      `SELECT a.*, u.username AS highestBidderName, u.profile AS highestBidderProfile
       FROM auctions a
       LEFT JOIN users u ON a.highest_bidder = u.id
       WHERE a.id = ?`,
      [id]
    );

    const auction = rows[0];
    if (!auction) return res.status(404).json({ message: "Auction not found" });

    if (auction.image) auction.image = absUrl(req, auction.image);
    if (auction.highestBidderProfile) {
      auction.highestBidderProfile = absUrl(req, auction.highestBidderProfile);
    }

    res.json({
      ...auction,
      highestBidderName: auction.highestBidderName || null,
      highestBidderProfile: auction.highestBidderProfile || null,
    });
  } catch (err) {
    console.error("get auction error:", err);
    res.status(500).json({ message: "Error fetching auction details", error: err.message });
  }
});

/* ────────────────────────────── SEARCH AUCTION ────────────────────────────── */
router.get("/search", authenticateToken, async (req, res) => {
  try {
    const { keyword, category } = req.query;

    let sql = "SELECT * FROM auctions WHERE status IN ('active','pending')";
    const params = [];

    if (keyword) {
      sql += " AND (name LIKE ? OR description LIKE ?)";
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }

    if (category) {
      sql += " AND category = ?";
      params.push(String(category).toLowerCase());
    }

    const [rows] = await pool.query(sql, params);

    // Absolute image URLs
    rows.forEach(a => {
      if (a.image) a.image = absUrl(req, a.image);
    });

    if (!rows.length) return res.status(404).json({ message: "No auctions found" });
    res.json(rows);
  } catch (err) {
    console.error("search auctions error:", err);
    res.status(500).json({ message: "Error searching for auctions", error: err.message });
  }
});
/* ─────────────────────────── AUCTION STATS ─────────────────────────── */
router.get("/:id/stats", authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid auction id" });
    }

    // 1) Core auction row + usernames for current/highest bidder
    const [aRows] = await pool.query(
      `SELECT a.*,
              (SELECT username FROM users WHERE id = a.highest_bidder) AS highest_bidder_username,
              (SELECT username FROM users WHERE id = a.current_bidder) AS current_bidder_username
         FROM auctions a
        WHERE a.id = ?`,
      [id]
    );
    const a = aRows[0];
    if (!a) return res.status(404).json({ message: "Auction not found" });

    // Remaining seconds (from end_date)
    const now = new Date();
    const end = a.end_date ? new Date(a.end_date) : null;
    const remainingSeconds = end ? Math.max(0, Math.floor((end - now) / 1000)) : 0;

    // 2) Participants count
    const [[{ participants }]] = await pool.query(
      "SELECT COUNT(*) AS participants FROM auction_participants WHERE auction_id = ?",
      [id]
    );

    // 3) Unique bidders + total spent
    const [[agg]] = await pool.query(
      "SELECT COUNT(DISTINCT user_id) AS uniqueBidders, COALESCE(SUM(bid_points),0) AS totalSpent FROM auction_bid_points WHERE auction_id = ?",
      [id]
    );
    const uniqueBidders = agg.uniqueBidders || 0;
    const totalSpent = agg.totalSpent || 0;

    // 4) Highest spender
    const [top1Rows] = await pool.query(
      `SELECT abp.user_id, u.username, abp.bid_points AS total_spent
         FROM auction_bid_points abp
         JOIN users u ON u.id = abp.user_id
        WHERE abp.auction_id = ?
        ORDER BY abp.bid_points DESC
        LIMIT 1`,
      [id]
    );
    const highestSpender = top1Rows[0]
      ? {
          userId: top1Rows[0].user_id,
          username: top1Rows[0].username,
          totalSpent: top1Rows[0].total_spent,
        }
      : null;

    // 5) Leaderboard (top N)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 5));
    const [boardRows] = await pool.query(
      `SELECT abp.user_id, u.username, abp.bid_points AS total_spent
         FROM auction_bid_points abp
         JOIN users u ON u.id = abp.user_id
        WHERE abp.auction_id = ?
        ORDER BY abp.bid_points DESC
        LIMIT ?`,
      [id, limit]
    );
    const leaderboard = boardRows.map(r => ({
      userId: r.user_id,
      username: r.username,
      totalSpent: r.total_spent,
    }));

    // Build response (keep your requested keys + extras)
    return res.json({
      // requested keys
      timerDuration: remainingSeconds,                      // seconds left
      currentBidder: a.current_bidder_username || null,     // username
      currentBidAmount: a.current_bid_amount || 0,
      highestBidder: a.highest_bidder || null,              // id

      // extras
      auctionId: a.id,
      name: a.name,
      status: a.status,
      category: a.category,
      entryBidPoints: a.entry_bid_points,
      minimumUsers: a.minimum_users,
      image: absUrl(req, a.image),
      endDate: a.end_date, // server time (MySQL DATETIME)
      remainingSeconds,
      participants,
      uniqueBidders,
      totalSpent,
      highestSpender,
      leaderboard,
    });
  } catch (err) {
    console.error("auction stats error:", err);
    return res.status(500).json({ message: "Error fetching auction stats", error: err.message });
  }
});

/* ───────────────────────── CHECKOUT (auction prizes) ───────────────────────── */
router.post("/auction/checkout", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { address, phone } = req.body || {};

  if (!address) return res.status(400).json({ message: "Address is required" });
  if (!phone) return res.status(400).json({ message: "Phone is required" });
  const phoneStr = String(phone).trim();
  if (!/^[\d+\-\s()]{7,20}$/.test(phoneStr)) {
    return res.status(400).json({ message: "Invalid phone format" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // lock cart items for this user (product-only)
    const [items] = await conn.query(
      `SELECT c.auction_id
         FROM cart c
         JOIN auctions a ON a.id = c.auction_id
        WHERE c.user_id = ? AND a.category = 'product'
        FOR UPDATE`,
      [userId]
    );

    if (!items.length) {
      await conn.rollback();
      return res.status(400).json({ message: "No product items in your auction cart" });
    }

    // create order (with phone)
    const [orderRes] = await conn.query(
      `INSERT INTO auction_orders (user_id, address, phone)
       VALUES (?, ?, ?)`,
      [userId, address, phoneStr]
    );
    const auctionOrderId = orderRes.insertId;

    // insert order items (bulk)
    const values = items.map(r => [auctionOrderId, r.auction_id]);
    const placeholders = values.map(() => "(?, ?)").join(",");
    const flat = values.flat();
    await conn.query(
      `INSERT INTO auction_order_items (auction_order_id, auction_id) VALUES ${placeholders}`,
      flat
    );

    // clear checked-out items from cart (product-only)
    await conn.query(
      `DELETE c
         FROM cart c
         JOIN auctions a ON a.id = c.auction_id
        WHERE c.user_id = ? AND a.category = 'product'`,
      [userId]
    );

    await conn.commit();
    return res.status(201).json({
      message: "Product order placed successfully",
      auctionOrderId,
      items: items.length,
    });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    console.error("auction checkout error:", err);
    return res.status(500).json({ message: "Error during auction checkout", error: err.message });
  } finally {
    conn.release();
  }
});
/* ─────────────────────────── GET CART ─────────────────────────── */
router.get("/cart", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT
          c.id,
          c.status            AS cart_status,
          c.price             AS cart_price,
          a.id                AS auction_id,
          a.name,
          a.description,
          a.image,
          a.final_price       AS auction_final_price,
          a.current_bid_amount,
          a.category,
          a.status            AS auction_status,
          a.created_at,
          abp.bid_points      AS points_spent
       FROM cart c
       JOIN auctions a
         ON a.id = c.auction_id
       LEFT JOIN auction_bid_points abp
         ON abp.auction_id = a.id
        AND abp.user_id = c.user_id
       WHERE c.user_id = ?
       ORDER BY c.id DESC`,
      [userId]
    );

    const data = rows.map(r => ({
      id: r.id,
      auctionId: r.auction_id,
      name: r.name,
      description: r.description,
      image: absUrl(req, r.image),
      cartStatus: r.cart_status,
      auctionStatus: r.auction_status,
      category: r.category,
      createdAt: r.created_at,

      // Pricing-related
      finalPrice: r.auction_final_price,    // the auction's final price
      price: r.cart_price,                  // what's recorded in the cart (we set 'paid' in the cron)
      pointsSpent: r.points_spent || 0,     // total bid points this user spent bidding in this auction

      // Optional convenience fields for your UI
      displayPricePoints: r.points_spent || r.cart_price, // if you want a single "points used" number
    }));

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching cart items:", error);
    res.status(500).json({ message: "Error fetching cart items", error: error.message });
  }
});
/* ───────────────────────── LIST MY AUCTION ORDERS ───────────────────────── */
router.get("/auction-orders", authenticateToken, async (req, res) => {
  const userId = req.user.id; // use from auth middleware

  try {
    const [rows] = await pool.query(
      `SELECT
         ao.id                 AS order_id,
         ao.address,
         ao.phone,
         ao.order_status,
         ao.tracking_number,
         ao.created_at,
         ao.updated_at,
         ao.shipped_at,
         ao.delivered_at,
         aoi.id                AS item_id,
         aoi.auction_id,
         a.name,
         a.description,
         a.image,
         a.category,
         a.final_price
       FROM auction_orders ao
       JOIN auction_order_items aoi
         ON aoi.auction_order_id = ao.id
       JOIN auctions a
         ON a.id = aoi.auction_id
      WHERE ao.user_id = ?
      ORDER BY ao.id DESC, aoi.id ASC`,
      [userId]
    );

    if (!rows.length) return res.json([]); // no orders yet

    // Group rows by order_id
    const byOrder = new Map();
    for (const r of rows) {
      if (!byOrder.has(r.order_id)) {
        byOrder.set(r.order_id, {
          orderId: r.order_id,
          address: r.address,
          phone: r.phone,
          status: r.order_status,
          trackingNumber: r.tracking_number,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          shippedAt: r.shipped_at,
          deliveredAt: r.delivered_at,
          items: [],
        });
      }
      byOrder.get(r.order_id).items.push({
        itemId: r.item_id,
        auctionId: r.auction_id,
        name: r.name,
        description: r.description,
        image: absUrl(req, r.image),
        category: r.category,
        finalPrice: r.final_price,
      });
    }

    res.json(Array.from(byOrder.values()));
  } catch (err) {
    console.error("get auction orders error:", err);
    res.status(500).json({ message: "Error fetching auction orders", error: err.message });
  }
});
/* ─────────────────────── GET A SINGLE AUCTION ORDER ─────────────────────── */
router.get("/auction/orders/:orderId", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const orderId = Number(req.params.orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT
         ao.id                 AS order_id,
         ao.address,
         ao.phone,
         ao.order_status,
         ao.tracking_number,
         ao.created_at,
         ao.updated_at,
         ao.shipped_at,
         ao.delivered_at,
         aoi.id                AS item_id,
         aoi.auction_id,
         a.name,
         a.description,
         a.image,
         a.category,
         a.final_price
       FROM auction_orders ao
       JOIN auction_order_items aoi
         ON aoi.auction_order_id = ao.id
       JOIN auctions a
         ON a.id = aoi.auction_id
      WHERE ao.user_id = ? AND ao.id = ?
      ORDER BY aoi.id ASC`,
      [userId, orderId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    const head = rows[0];
    res.json({
      orderId: head.order_id,
      address: head.address,
      phone: head.phone,
      status: head.order_status,
      trackingNumber: head.tracking_number,
      createdAt: head.created_at,
      updatedAt: head.updated_at,
      shippedAt: head.shipped_at,
      deliveredAt: head.delivered_at,
      items: rows.map(r => ({
        itemId: r.item_id,
        auctionId: r.auction_id,
        name: r.name,
        description: r.description,
        image: absUrl(req, r.image),
        category: r.category,
        finalPrice: r.final_price,
      })),
    });
  } catch (err) {
    console.error("get single auction order error:", err);
    res.status(500).json({ message: "Error fetching auction order", error: err.message });
  }
});


/* ───────────────────────── SEND BID POINTS (no charge) ───────────────────────── */
router.post("/send-bid-points", authenticateToken, async (req, res) => {
  const { recipientWallet, amount, pin } = req.body || {};
  const senderId = req.user.id;

  // validate basic inputs
  const amt = Number(amount);
  if (!recipientWallet || !pin) {
    return res.status(400).json({ message: "recipientWallet and pin are required" });
  }
  if (!Number.isInteger(amt) || amt <= 0) {
    return res.status(400).json({ message: "Amount must be a positive integer" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // lock sender
    const [sRows] = await conn.query(
      "SELECT id, username, wallet_address, bid_points, pin FROM users WHERE id = ? FOR UPDATE",
      [senderId]
    );
    const sender = sRows[0];
    if (!sender) {
      await conn.rollback();
      return res.status(404).json({ message: "Sender not found" });
    }
    if (String(sender.pin) !== String(pin)) {
      await conn.rollback();
      return res.status(400).json({ message: "Invalid PIN" });
    }

    // lock recipient by wallet
    const [rRows] = await conn.query(
      "SELECT id, username, wallet_address, bid_points FROM users WHERE wallet_address = ? FOR UPDATE",
      [recipientWallet]
    );
    const recipient = rRows[0];
    if (!recipient) {
      await conn.rollback();
      return res.status(404).json({ message: "Recipient wallet address not found" });
    }
    if (recipient.id === sender.id) {
      await conn.rollback();
      return res.status(400).json({ message: "You cannot send points to yourself" });
    }

    // sufficient balance?
    if (sender.bid_points < amt) {
      await conn.rollback();
      return res.status(400).json({ message: "Insufficient bid points" });
    }

    // move points
    await conn.query("UPDATE users SET bid_points = bid_points - ? WHERE id = ?", [amt, sender.id]);
    await conn.query("UPDATE users SET bid_points = bid_points + ? WHERE id = ?", [amt, recipient.id]);

    // log transaction (no charge column)
    await conn.query(
      `INSERT INTO transactions (sender_id, recipient_id, amount)
       VALUES (?, ?, ?)`,
      [sender.id, recipient.id, amt]
    );

    await conn.commit();
    return res.status(200).json({ message: "Bid points sent successfully" });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    console.error("send-bid-points error:", err);
    return res.status(500).json({ message: "Error sending bid points", error: err.message });
  } finally {
    conn.release();
  }
});
/* ─────────────────────────────── RECOVER PIN ─────────────────────────────── */
router.post("/recover-pin", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const [rows] = await pool.query("SELECT pin FROM users WHERE email = ? LIMIT 1", [email]);
    const user = rows[0];
    if (!user) return res.status(404).json({ message: "Email not found" });

    // send via email (plaintext per your design)
    await sendEmail(
      email,
      "Your 4-digit PIN",
      `<p>Your 4-digit PIN is: <strong>${user.pin}</strong></p>`
    );

    return res.status(200).json({ message: "PIN has been sent to your email" });
  } catch (err) {
    console.error("recover-pin error:", err);
    return res.status(500).json({ message: "Error recovering PIN", error: err.message });
  }
});
/* ───────────────────────────────── SET PIN ───────────────────────────────── */
router.post("/set-pin", authenticateToken, async (req, res) => {
  const { oldPin, newPin } = req.body || {};
  const userId = req.user.id;

  if (!newPin || !/^\d{4}$/.test(String(newPin))) {
    return res.status(400).json({ message: "PIN must be a 4-digit number" });
  }

  try {
    const [rows] = await pool.query("SELECT pin FROM users WHERE id = ? LIMIT 1", [userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ message: "User not found" });

    // if already set, verify old
    if (user.pin && String(user.pin) !== String(oldPin || "")) {
      return res.status(400).json({ message: "Incorrect old PIN" });
    }

    await pool.query("UPDATE users SET pin = ? WHERE id = ?", [String(newPin), userId]);
    return res.status(200).json({ message: "PIN has been successfully set" });
  } catch (err) {
    console.error("set-pin error:", err);
    return res.status(500).json({ message: "Error setting PIN", error: err.message });
  }
});
/* ───────────────────────────── TRANSACTION HISTORY ───────────────────────────── */
router.get("/transactions", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await pool.query(
      `SELECT t.id,
              t.amount,
              t.created_at,
              u1.username AS sender_username,
              u2.username AS recipient_username
         FROM transactions t
         JOIN users u1 ON u1.id = t.sender_id
         JOIN users u2 ON u2.id = t.recipient_id
        WHERE t.sender_id = ? OR t.recipient_id = ?
        ORDER BY t.created_at DESC`,
      [userId, userId]
    );

    // format with Moment to Africa/Lagos
    const data = rows.map((r) => ({
      id: r.id,
      amount: r.amount,
      sender: r.sender_username,
      recipient: r.recipient_username,
      timestamp: r.created_at, // raw DB timestamp
      timestamp_local: moment.tz(r.created_at, "Africa/Lagos").format("YYYY-MM-DD HH:mm:ss"),
    }));

    return res.status(200).json(data);
  } catch (err) {
    console.error("transactions error:", err);
    return res.status(500).json({ message: "Error fetching transaction history", error: err.message });
  }
});


/* ───────────────────── Auth user: generate affiliate link ───────────────────── */
router.get("/affiliate/link/:auctionId", authenticateToken, async (req, res) => {
  try {
    const auctionId = Number(req.params.auctionId);
    if (!Number.isInteger(auctionId) || auctionId <= 0) {
      return res.status(400).json({ message: "Invalid auctionId" });
    }
    const referrerId = req.user.id;
    const base = process.env.PUBLIC_WEB_ORIGIN || "https://copupbid.top"; // or use req host
    const affiliateLink = `${base}/affiliate/${auctionId}/${referrerId}`;
    res.status(200).json({ message: "Affiliate link generated successfully", affiliateLink });
  } catch (error) {
    console.error("Error generating affiliate link:", error);
    res.status(500).json({ message: "Error generating affiliate link" });
  }
});
/* ───────────────────── Pay entry via affiliate link + credit referrer ───────────────────── */
router.post("/affiliate/pay-entry/:auctionId/:referrerId", authenticateToken, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const auctionId = Number(req.params.auctionId);
    const referrerId = Number(req.params.referrerId);
    const userId = req.user.id;

    if (!Number.isInteger(auctionId) || auctionId <= 0) {
      conn.release();
      return res.status(400).json({ message: "Invalid auctionId" });
    }
    if (!Number.isInteger(referrerId) || referrerId <= 0) {
      conn.release();
      return res.status(400).json({ message: "Invalid referrerId" });
    }

    await conn.beginTransaction();

    // auction
    const [aRows] = await conn.query("SELECT id, entry_bid_points FROM auctions WHERE id = ? FOR UPDATE", [auctionId]);
    const auction = aRows[0];
    if (!auction) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: "Auction not found" });
    }

    // already a participant?
    const [pRows] = await conn.query(
      "SELECT 1 FROM auction_participants WHERE auction_id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
      [auctionId, userId]
    );
    if (pRows.length) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Entry fee already paid" });
    }

    // user & balance
    const [uRows] = await conn.query("SELECT id, bid_points FROM users WHERE id = ? FOR UPDATE", [userId]);
    const user = uRows[0];
    if (!user) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: "User not found" });
    }
    if (user.bid_points < auction.entry_bid_points) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Insufficient bid points" });
    }

    // deduct entry & insert participant
    await conn.query("UPDATE users SET bid_points = bid_points - ? WHERE id = ?", [
      auction.entry_bid_points,
      userId,
    ]);
    await conn.query("INSERT INTO auction_participants (auction_id, user_id) VALUES (?, ?)", [
      auctionId,
      userId,
    ]);

    // referral credit (avoid self-referral)
    if (userId !== referrerId) {
      // ensure single credit per referred user per auction
      const [insRef] = await conn.query(
        `INSERT IGNORE INTO affiliate_referrals (auction_id, referrer_id, referred_id)
         VALUES (?, ?, ?)`,
        [auctionId, referrerId, userId]
      );

      if (insRef.affectedRows) {
        // increment progress only when first-time referral was recorded
        await conn.query(
          `INSERT INTO affiliate_user_progress (auction_id, affiliate_user_id, referred_users)
           VALUES (?, ?, 1)
           ON DUPLICATE KEY UPDATE referred_users = referred_users + 1`,
          [auctionId, referrerId]
        );
      }
    }

    await conn.commit();
    conn.release();
    res.status(201).json({ message: "Entry fee paid successfully via affiliate link" });
  } catch (error) {
    try { await conn.rollback(); } catch {}
    conn.release();
    console.error("Error processing affiliate entry fee:", error);
    res.status(500).json({ message: "Error processing entry fee" });
  }
});
/* ───────────────────── Affiliate: check target & claim reward ───────────────────── */
router.post("/affiliate/check-target/:auctionId", authenticateToken, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const auctionId = Number(req.params.auctionId);
    const affiliateUserId = req.user.id;

    await conn.beginTransaction();

    const [pRows] = await conn.query(
      `SELECT referred_users
         FROM affiliate_user_progress
        WHERE auction_id = ? AND affiliate_user_id = ?
        FOR UPDATE`,
      [auctionId, affiliateUserId]
    );
    const progress = pRows[0];
    if (!progress) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ message: "Affiliate progress not found for this auction" });
    }

    const [aRows] = await conn.query(
      `SELECT target_users, reward_bid_points
         FROM auction_affiliates
        WHERE auction_id = ?`,
      [auctionId]
    );
    const aff = aRows[0];
    if (!aff) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ message: "Affiliate requirements not set for this auction" });
    }

    if (progress.referred_users >= aff.target_users) {
      // grant reward
      await conn.query("UPDATE users SET bid_points = bid_points + ? WHERE id = ?", [
        aff.reward_bid_points,
        affiliateUserId,
      ]);

      // subtract one target block (so multiple claims are possible over time)
      await conn.query(
        `UPDATE affiliate_user_progress
            SET referred_users = GREATEST(referred_users - ?, 0),
                updated_at = CURRENT_TIMESTAMP
          WHERE auction_id = ? AND affiliate_user_id = ?`,
        [aff.target_users, auctionId, affiliateUserId]
      );

      await conn.commit();
      conn.release();
      return res.status(200).json({ message: "Reward granted for meeting referral target" });
    }

    await conn.rollback(); // nothing changed
    conn.release();
    return res.status(200).json({ message: "Target not met yet" });
  } catch (error) {
    try { await conn.rollback(); } catch {}
    conn.release();
    console.error("Error checking and rewarding affiliate target:", error);
    res.status(500).json({ message: "Error processing affiliate rewards" });
  }
});
/* ───────────────────── Affiliate: see progress vs target ───────────────────── */
router.get("/affiliate/progress/:auctionId", authenticateToken, async (req, res) => {
  try {
    const auctionId = Number(req.params.auctionId);
    const affiliateUserId = req.user.id;

    const [[progress]] = await pool.query(
      `SELECT referred_users
         FROM affiliate_user_progress
        WHERE auction_id = ? AND affiliate_user_id = ?`,
      [auctionId, affiliateUserId]
    );
    if (!progress) {
      return res.status(404).json({ message: "No referral progress found for this auction" });
    }

    const [[target]] = await pool.query(
      `SELECT target_users
         FROM auction_affiliates
        WHERE auction_id = ?`,
      [auctionId]
    );
    if (!target) {
      return res.status(404).json({ message: "No affiliate requirements set for this auction" });
    }

    const remaining = Math.max(0, target.target_users - progress.referred_users);
    const progressDisplay = `${progress.referred_users}/${target.target_users}`;

    res.status(200).json({
      message: `Referral progress for auction ${auctionId}`,
      referredUsers: progress.referred_users,
      targetUsers: target.target_users,
      progressDisplay,
      remainingReferrals: remaining,
    });
  } catch (error) {
    console.error("Error fetching referral progress:", error);
    res.status(500).json({ message: "Error fetching referral progress" });
  }
});

/* ───────────────────────────── AVAILABLE HEISTS ─────────────────────────── */
router.get("/heists/available", authenticateToken, async (req, res) => {
  try {
    // Heists + live participants count (no answer selected to avoid leaks)
    const [rows] = await pool.query(
      `SELECT
         h.id,
         h.name,
         h.story,
         h.question,
         h.min_users,
         h.ticket_price,
         h.prize,
         h.category,
         h.status,
         h.prize_name,
         h.prize_image,
         h.created_at,
         h.updated_at,
         COALESCE(p.cnt, 0) AS participants_count
       FROM heist h
       LEFT JOIN (
         SELECT heist_id, COUNT(*) AS cnt
         FROM heist_participants
         GROUP BY heist_id
       ) p ON p.heist_id = h.id
       WHERE h.status IN ('pending','hold','started')
       ORDER BY FIELD(h.status,'started','hold','pending'), h.id DESC`
    );

    const data = rows.map((h) => {
      const joined = Number(h.participants_count || 0);
      const min = Number(h.min_users || 0);
      const isStarted = h.status === "started";

      return {
        id: h.id,
        name: h.name,
        // Hide these until the heist starts
        story: isStarted ? h.story : null,
        question: isStarted ? h.question : null,
        // Never expose the answer here
        min_users: h.min_users,
        ticket_price: h.ticket_price,
        prize: h.prize,
        category: h.category,
        status: h.status,
        prize_name: h.prize_name,
        prize_image: absUrl(req, h.prize_image),
        created_at: h.created_at,
        updated_at: h.updated_at,

        // Progress helpers
        participantsJoined: joined,
        minUsers: min,
        participantsProgress: `${joined}/${min}`,
        participantsPercent: min > 0 ? Math.min(100, Math.round((joined / min) * 100)) : 0,
      };
    });

    return res.status(200).json(data);
  } catch (error) {
    console.error("heists/available error:", error);
    return res.status(500).json({ error: "Error fetching heists.", details: error.message });
  }
});
/* ───────────────────────────── BUY HEIST TICKET ─────────────────────────── */
router.post("/heists/pay-entry/:id", authenticateToken, async (req, res) => {
  const heistId = Number(req.params.id);
  const userId = req.user.id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // lock heist
    const [hRows] = await conn.query("SELECT * FROM heist WHERE id = ? FOR UPDATE", [heistId]);
    const heist = hRows[0];
    if (!heist) {
      await conn.rollback();
      return res.status(404).json({ message: "Heist not found" });
    }
    if (!["pending", "started"].includes(heist.status)) {
      await conn.rollback();
      return res.status(400).json({ message: "Heist is not open for entry" });
    }

    // already participant?
    const [pRows] = await conn.query(
      "SELECT 1 FROM heist_participants WHERE heist_id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
      [heistId, userId]
    );
    if (pRows.length) {
      await conn.rollback();
      return res.status(400).json({ message: "Entry fee already paid" });
    }

    // lock user
    const [uRows] = await conn.query(
      "SELECT id, bid_points FROM users WHERE id = ? FOR UPDATE",
      [userId]
    );
    const user = uRows[0];
    if (!user) {
      await conn.rollback();
      return res.status(404).json({ message: "User not found" });
    }
    if (user.bid_points < heist.ticket_price) {
      await conn.rollback();
      return res.status(400).json({ message: "Insufficient bid points" });
    }

    // deduct + join
    await conn.query("UPDATE users SET bid_points = bid_points - ? WHERE id = ?", [
      heist.ticket_price,
      userId,
    ]);
    await conn.query(
      "INSERT INTO heist_participants (heist_id, user_id) VALUES (?, ?)",
      [heistId, userId]
    );

    await conn.commit();
    return res.status(201).json({ message: "Entry fee paid successfully" });
  } catch (error) {
    try { await conn.rollback(); } catch {}
    console.error("pay-entry error:", error);
    return res.status(500).json({ message: "Error paying entry fee", error: error.message });
  } finally {
    conn.release();
  }
});
/* ───────────────────────────── SUBMIT ANSWER ────────────────────────────── */
router.post("/submitAnswer/:heistId", authenticateToken, async (req, res) => {
  const heistId = Number(req.params.heistId);
  const { answer } = req.body || {};
  const userId = req.user?.id;

  if (!userId) return res.status(400).json({ message: "User not authenticated" });
  if (!Number.isInteger(heistId) || heistId <= 0)
    return res.status(400).json({ message: "Invalid heistId" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // must have joined
    const [joined] = await conn.query(
      "SELECT 1 FROM heist_participants WHERE heist_id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
      [heistId, userId]
    );
    if (!joined.length) {
      await conn.rollback();
      return res.status(400).json({ message: "You have not joined this heist." });
    }

    // lock heist row
    const [hRows] = await conn.query("SELECT * FROM heist WHERE id = ? FOR UPDATE", [heistId]);
    const heist = hRows[0];
    if (!heist) {
      await conn.rollback();
      return res.status(400).json({ message: "Heist not found." });
    }

    if (heist.status === "completed") {
      // show winner
      const [wRows] = await conn.query(
        "SELECT full_name FROM users WHERE id = ? LIMIT 1",
        [heist.winner_id]
      );
      await conn.rollback();
      return res.status(200).json({
        message: `This heist has already been completed. Winner: ${wRows[0]?.full_name || "Unknown User"}.`,
        winner: wRows[0]?.full_name || "Unknown User",
      });
    }

    if (heist.status !== "started") {
      await conn.rollback();
      return res.status(400).json({ message: "Heist not in progress." });
    }

    if (heist.winner_id) {
      const [wRows] = await conn.query(
        "SELECT full_name FROM users WHERE id = ? LIMIT 1",
        [heist.winner_id]
      );
      await conn.rollback();
      return res.status(200).json({
        message: `This heist already has a winner: ${wRows[0]?.full_name || "Unknown User"}.`,
        winner: wRows[0]?.full_name || "Unknown User",
      });
    }

    // validate answer
    const a = String(answer || "").trim().toLowerCase();
    const correct = String(heist.answer || "").trim().toLowerCase();
    if (a !== correct) {
      await conn.rollback();
      return res.status(400).json({ message: "Incorrect answer. Try again!" });
    }

    // correct → set winner, complete, award
    await conn.query(
      "UPDATE heist SET status = 'completed', winner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [userId, heistId]
    );

    if (heist.category === "cash") {
      await conn.query("UPDATE users SET bid_points = bid_points + ? WHERE id = ?", [
        heist.prize,
        userId,
      ]);
    } else if (heist.category === "product") {
      // ensure table exists in your DB: heist_cart (see note)
      await conn.query(
        `INSERT INTO heist_cart (user_id, heist_id, status)
         VALUES (?, ?, 'unclaimed')
         ON DUPLICATE KEY UPDATE status = VALUES(status)`,
        [userId, heistId]
      );
    }

    const [wUser] = await conn.query("SELECT full_name FROM users WHERE id = ? LIMIT 1", [userId]);

    await conn.commit();
    return res.status(200).json({
      message: "Congratulations! You are the winner.",
      winner: wUser[0]?.full_name || "Unknown User",
    });
  } catch (error) {
    try { await conn.rollback(); } catch {}
    console.error("submitAnswer error:", error);
    return res
      .status(500)
      .json({ error: "Error submitting answer.", details: error.message });
  } finally {
    conn.release();
  }
});
/* ─────────────────────────── HEIST WINNERS LIST ─────────────────────────── */
router.get("/heist/winners", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, q } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * lim;

    const where = ["h.winner_id IS NOT NULL", "h.status = 'completed'"];
    const params = [];

    if (q && String(q).trim()) {
      where.push("h.name LIKE ?");
      params.push(`%${q.trim()}%`);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    // total count
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM heist h ${whereSql}`,
      params
    );

    // FIXED QUERY (collation-safe)
    const [rows] = await pool.query(
      `
      SELECT
        h.id,
        h.name,
        h.story,
        h.category,
        h.ticket_price,
        h.prize,
        h.prize_name,
        h.prize_image,
        h.updated_at AS completed_at,

        h.winner_id,

        -- real users
        u.id        AS u_id,
        u.username  AS u_username,
        u.full_name AS u_full_name,
        u.profile   AS u_profile,

        -- demo/cop users
        d.id        AS d_id,
        d.username  AS d_username,
        d.full_name AS d_full_name,
        d.avatar    AS d_avatar

      FROM heist h
      LEFT JOIN users u
        ON u.id = CAST(h.winner_id AS UNSIGNED)
       AND h.winner_id NOT LIKE 'cop_%'

      LEFT JOIN demo_users d
        ON d.id = h.winner_id COLLATE utf8mb4_unicode_ci
       AND h.winner_id LIKE 'cop_%'

      ${whereSql}
      ORDER BY h.updated_at DESC, h.id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, lim, offset]
    );

    const data = rows.map(r => {
      const isDemo = String(r.winner_id).startsWith("cop_");

      return {
        heistId: r.id,
        name: r.name,
        story: r.story,
        category: r.category,
        ticketPrice: r.ticket_price,
        prize: r.prize,
        prizeName: r.prize_name,
        prizeImage: absUrl(req, r.prize_image),
        completedAt: r.completed_at,
        winner: isDemo
          ? {
              id: r.d_id,
              username: r.d_username,
              fullName: r.d_full_name,
              image: absUrl(req, r.d_avatar),
              is_demo: true,
            }
          : {
              id: r.u_id,
              username: r.u_username,
              fullName: r.u_full_name,
              image: r.u_profile ? absUrl(req, r.u_profile) : null,
              is_demo: false,
            },
      };
    });

    res.json({ page: pageNum, limit: lim, total, data });
  } catch (err) {
    console.error("heist/winners error:", err);
    res.status(500).json({
      message: "Error fetching heist winners",
      error: err.message,
    });
  }
});
/* ─────────────────────────── HEIST WINNER DETAILS ───────────────────────── */
router.get("/heist/winner/:heistId", authenticateToken, async (req, res) => {
  const heistId = Number(req.params.heistId);

  if (!Number.isInteger(heistId) || heistId <= 0) {
    return res.status(400).json({ message: "Invalid heistId" });
  }

  try {
    const [hRows] = await pool.query(
      "SELECT * FROM heist WHERE id = ? LIMIT 1",
      [heistId]
    );
    const heist = hRows[0];

    if (!heist || !heist.winner_id) {
      return res.status(404).json({ message: "Heist not found or no winner declared." });
    }

    const winnerIdStr = String(heist.winner_id).trim();
    let winner = null;

    /* ───── COP / DEMO USER ───── */
    if (isCopId(winnerIdStr)) {
      const [dRows] = await pool.query(
        "SELECT id, username, full_name, avatar FROM demo_users WHERE id = ? LIMIT 1",
        [winnerIdStr]
      );
      if (!dRows.length) {
        return res.status(404).json({ message: "Winner not found." });
      }

      const d = dRows[0];
      winner = {
        id: d.id,
        username: d.username,
        full_name: d.full_name,
        image: absUrl(req, d.avatar), // demo users still use avatar
        is_demo: true,
      };
    }

    /* ───── REAL PLATFORM USER ───── */
    else if (isNumericId(winnerIdStr)) {
      const [uRows] = await pool.query(
        "SELECT id, username, full_name, profile FROM users WHERE id = ? LIMIT 1",
        [Number(winnerIdStr)]
      );
      if (!uRows.length) {
        return res.status(404).json({ message: "Winner not found." });
      }

      const u = uRows[0];
      winner = {
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        image: u.profile ? absUrl(req, u.profile) : null, // ✅ profile image
        is_demo: false,
      };
    } else {
      return res.status(400).json({
        message: "Invalid winner_id format stored on heist.",
      });
    }

    return res.status(200).json({
      winner,
      heist: {
        id: heist.id,
        name: heist.name,
        story: heist.story,
        prize: heist.prize,
        ticket_price: heist.ticket_price,
        question: heist.question,
        answer: heist.answer,
        prize_name: heist.prize_name,
        category: heist.category,
        status: heist.status,
        prize_image: absUrl(req, heist.prize_image),
      },
    });
  } catch (error) {
    console.error("winner details error:", error);
    return res.status(500).json({
      error: "Error fetching winner and heist details.",
      details: error.message,
    });
  }
});
/* ───────────────────────────── FETCH HEIST BY ID ────────────────────────── */
router.get("/heist/:heistId", authenticateToken, async (req, res) => {
  const heistId = Number(req.params.heistId);
  if (!Number.isInteger(heistId) || heistId <= 0)
    return res.status(400).json({ message: "Invalid heistId" });

  try {
    const [rows] = await pool.query("SELECT * FROM heist WHERE id = ? LIMIT 1", [heistId]);
    const heist = rows[0];
    if (!heist) return res.status(404).json({ message: "Heist not found." });

    // absolute prize image
    heist.prize_image = absUrl(req, heist.prize_image);

    return res.status(200).json(heist);
  } catch (error) {
    console.error("fetch heist error:", error);
    return res.status(500).json({ error: "Error fetching heist.", details: error.message });
  }
});


/* ───────────────────────── Heist affiliate list (non-completed) ───────────────────────── */
router.get("/heist/affiliate/list", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT h.id, h.name, h.story, ha.target_users, ha.reward_bid_points
      FROM heist h
      JOIN heist_affiliates ha ON h.id = ha.heist_id
      WHERE h.status <> 'completed'
      ORDER BY h.id DESC
      `
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ message: "No active heists with affiliate requirements found." });
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching heists with affiliate requirements:", error);
    res.status(500).json({ message: "Error fetching heists with affiliate requirements" });
  }
});
/* ───────── Pay entry via affiliate link (deduct ticket_price; track referral progress) ───────── */
router.post("/heist/pay-entry/affiliate/:heistId/:referrerId",authenticateToken,
  async (req, res) => {
    const heistId = Number(req.params.heistId);
    const referrerId = Number(req.params.referrerId);
    const userId = req.user.id;

    if (!Number.isInteger(heistId) || heistId <= 0) {
      return res.status(400).json({ message: "Invalid heistId" });
    }
    if (!Number.isInteger(referrerId) || referrerId <= 0) {
      return res.status(400).json({ message: "Invalid referrerId" });
    }
    if (referrerId === userId) {
      return res.status(400).json({ message: "You cannot refer yourself" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Heist exists?
      const [hRows] = await conn.query("SELECT id, ticket_price, status FROM heist WHERE id = ? FOR UPDATE", [heistId]);
      const heist = hRows[0];
      if (!heist) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({ message: "Heist not found" });
      }

      // Referrer exists?
      const [rRows] = await conn.query("SELECT id FROM users WHERE id = ? LIMIT 1", [referrerId]);
      if (!rRows.length) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ message: "Invalid referrer ID" });
      }

      // Already joined?
      const [pRows] = await conn.query(
        "SELECT 1 FROM heist_participants WHERE heist_id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
        [heistId, userId]
      );
      if (pRows.length) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ message: "Entry fee already paid" });
      }

      // Lock user & check balance
      const [uRows] = await conn.query(
        "SELECT id, bid_points FROM users WHERE id = ? FOR UPDATE",
        [userId]
      );
      const user = uRows[0];
      if (!user) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({ message: "User not found" });
      }

      const price = Number(heist.ticket_price || 0);
      if (!Number.isFinite(price) || price <= 0) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ message: "Heist ticket price is invalid" });
      }

      if (user.bid_points < price) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ message: "Insufficient bid points" });
      }

      // Deduct & add participant
      await conn.query("UPDATE users SET bid_points = bid_points - ? WHERE id = ?", [price, userId]);
      await conn.query(
        "INSERT INTO heist_participants (heist_id, user_id) VALUES (?, ?)",
        [heistId, userId]
      );

      // Track affiliate referral progress (upsert)
      await conn.query(
        `
        INSERT INTO heist_affiliate_user_progress (heist_id, affiliate_user_id, referred_users)
        VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE referred_users = referred_users + 1, updated_at = CURRENT_TIMESTAMP
        `,
        [heistId, referrerId]
      );

      await conn.commit();
      conn.release();

      return res.status(201).json({ message: "Entry fee paid successfully via affiliate link" });
    } catch (error) {
      try { await conn.rollback(); } catch {}
      conn.release();
      console.error("Error processing affiliate entry fee:", error);
      return res.status(500).json({ message: "Error processing entry fee" });
    }
  }
);
/* ───────────────────────────── Generate affiliate link ───────────────────────────── */
router.get("/heist/affiliate/link/:heistId", authenticateToken, async (req, res) => {
  const heistId = Number(req.params.heistId);
  const referrerId = req.user.id;

  if (!Number.isInteger(heistId) || heistId <= 0) {
    return res.status(400).json({ message: "Invalid heistId" });
  }

  try {
    const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || "https://copupbid.com/pages";
    // Ensure trailing slash once
    const base = FRONTEND_BASE_URL.endsWith("/") ? FRONTEND_BASE_URL : FRONTEND_BASE_URL + "/";
    // Build a query-style URL (works everywhere, including static hosting/CDNs)
    const url = new URL("affilate-h.html", base);
    url.searchParams.set("heistId", String(heistId));
    url.searchParams.set("referrerId", String(referrerId));

    return res.status(200).json({
      message: "Affiliate link generated successfully",
      affiliateLink: url.href, // e.g. https://copupbid.com/pages/affilate-h.html?heistId=1&referrerId=2
    });
  } catch (err) {
    console.error("Error generating affiliate link:", err);
    return res.status(500).json({ message: "Error generating affiliate link" });
  }
});


/* ───────────────────── Affiliate progress for a given heist (current user) ───────────────────── */
router.get("/heist/affiliate/progress/:heistId", authenticateToken, async (req, res) => {
  const heistId = Number(req.params.heistId);
  const affiliateUserId = req.user.id;

  if (!Number.isInteger(heistId) || heistId <= 0) {
    return res.status(400).json({ message: "Invalid heistId" });
  }

  try {
    const [pRows] = await pool.query(
      "SELECT referred_users FROM heist_affiliate_user_progress WHERE heist_id = ? AND affiliate_user_id = ?",
      [heistId, affiliateUserId]
    );
    const progress = pRows[0];
    if (!progress) {
      return res.status(404).json({ message: "No referral progress found for this heist" });
    }

    const [tRows] = await pool.query(
      "SELECT target_users FROM heist_affiliates WHERE heist_id = ?",
      [heistId]
    );
    const target = tRows[0];
    if (!target) {
      return res.status(404).json({ message: "No affiliate requirements set for this heist" });
    }

    const referred = Number(progress.referred_users || 0);
    const targetUsers = Number(target.target_users || 0);
    const remaining = Math.max(0, targetUsers - referred);

    return res.status(200).json({
      message: `Referral progress for heist ${heistId}`,
      referredUsers: referred,
      targetUsers,
      progressDisplay: `${referred}/${targetUsers}`,
      remainingReferrals: remaining,
    });
  } catch (error) {
    console.error("Error fetching referral progress:", error);
    res.status(500).json({ message: "Error fetching referral progress" });
  }
});
/* ───────────── Heist Affiliate: claim reward if target has been reached ───────────── */
router.post("/heist/affiliate/claim/:heistId",authenticateToken,
  async (req, res) => {
    const heistId = Number(req.params.heistId);
    const affiliateUserId = req.user.id;

    if (!Number.isInteger(heistId) || heistId <= 0) {
      return res.status(400).json({ message: "Invalid heistId" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lock the user's progress for this heist
      const [pRows] = await conn.query(
        `SELECT referred_users
           FROM heist_affiliate_user_progress
          WHERE heist_id = ? AND affiliate_user_id = ?
          FOR UPDATE`,
        [heistId, affiliateUserId]
      );
      const progress = pRows[0];
      if (!progress) {
        await conn.rollback(); conn.release();
        return res.status(404).json({ message: "Affiliate progress not found for this heist" });
      }

      // Lock the heist's affiliate rule row too
      const [aRows] = await conn.query(
        `SELECT target_users, reward_bid_points
           FROM heist_affiliates
          WHERE heist_id = ?
          FOR UPDATE`,
        [heistId]
      );
      const aff = aRows[0];
      if (!aff) {
        await conn.rollback(); conn.release();
        return res.status(404).json({ message: "Affiliate requirements not set for this heist" });
      }

      const referred = Number(progress.referred_users || 0);
      const target = Number(aff.target_users || 0);
      const reward = Number(aff.reward_bid_points || 0);

      if (!Number.isInteger(target) || target <= 0) {
        await conn.rollback(); conn.release();
        return res.status(400).json({ message: "Invalid target configuration for this heist" });
      }

      if (referred < target) {
        await conn.rollback(); conn.release();
        return res.status(200).json({
          message: "Target not met yet",
          referredUsers: referred,
          targetUsers: target,
          remainingReferrals: Math.max(0, target - referred),
        });
      }

      // Grant exactly ONE claim per request, subtract one target block
      await conn.query(
        "UPDATE users SET bid_points = bid_points + ? WHERE id = ?",
        [reward, affiliateUserId]
      );
      await conn.query(
        `UPDATE heist_affiliate_user_progress
            SET referred_users = GREATEST(referred_users - ?, 0),
                updated_at = CURRENT_TIMESTAMP
          WHERE heist_id = ? AND affiliate_user_id = ?`,
        [target, heistId, affiliateUserId]
      );

      await conn.commit();
      conn.release();

      return res.status(200).json({
        message: "Reward granted for meeting referral target",
        heist_id: heistId,
        reward_bid_points: reward,
        newBalanceAwarded: reward,
        blockClaimed: target,
      });
    } catch (error) {
      try { await conn.rollback(); } catch {}
      conn.release();
      console.error("heist affiliate claim error:", error);
      return res.status(500).json({ message: "Error processing affiliate reward" });
    }
  }
);
// Public: do NOT use authenticateToken here
router.get("/heist/affiliate/:heistId/:referrerId", (req, res) => {
  const heistId = Number(req.params.heistId);
  const referrerId = Number(req.params.referrerId);
  if (!Number.isInteger(heistId) || heistId <= 0 || !Number.isInteger(referrerId) || referrerId <= 0) {
    return res.status(400).send("Invalid affiliate link.");
  }
  return res.redirect(302, `/pages/affilate-h.html?heist=${heistId}&ref=${referrerId}`);
});


/* ───────────────────────── CHECKOUT (product prizes) ───────────────────────── */
router.post("/checkout", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { address, phone } = req.body || {};

  if (!address) return res.status(400).json({ message: "Address is required" });
  if (!phone) return res.status(400).json({ message: "Phone is required" });
  const phoneStr = String(phone).trim();
  if (!/^[\d+\-\s()]{7,20}$/.test(phoneStr)) {
    return res.status(400).json({ message: "Invalid phone format" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // lock cart items for this user (product-only)
    const [items] = await conn.query(
      `SELECT hc.heist_id
         FROM heist_cart hc
         JOIN heist h ON h.id = hc.heist_id
        WHERE hc.user_id = ? AND h.category = 'product'
        FOR UPDATE`,
      [userId]
    );

    if (!items.length) {
      await conn.rollback();
      return res.status(400).json({ message: "No product items in your heist cart" });
    }

    // create order (with phone)
    const [orderRes] = await conn.query(
      `INSERT INTO heist_orders (user_id, address, phone)
       VALUES (?, ?, ?)`,
      [userId, address, phoneStr]
    );
    const heistOrderId = orderRes.insertId;

    // insert order items (bulk)
    const values = items.map(r => [heistOrderId, r.heist_id]);
    const placeholders = values.map(() => "(?, ?)").join(",");
    const flat = values.flat();
    await conn.query(
      `INSERT INTO heist_order_items (heist_order_id, heist_id) VALUES ${placeholders}`,
      flat
    );

    // clear checked-out items from cart (product-only)
    await conn.query(
      `DELETE hc
         FROM heist_cart hc
         JOIN heist h ON h.id = hc.heist_id
        WHERE hc.user_id = ? AND h.category = 'product'`,
      [userId]
    );

    await conn.commit();
    return res.status(201).json({
      message: "Product order placed successfully",
      heistOrderId,
      items: items.length,
    });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    console.error("heist checkout error:", err);
    return res.status(500).json({ message: "Error during heist checkout", error: err.message });
  } finally {
    conn.release();
  }
});
/* ─────────────────────────── GET heist cart items ──────────────────────────── */
router.get("/cartH", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT hc.id AS cart_id,
              h.id AS heist_id,
              h.name, h.story, h.category, h.prize, h.prize_name, h.prize_image
         FROM heist_cart hc
         JOIN heist h ON h.id = hc.heist_id
        WHERE hc.user_id = ?
        ORDER BY hc.id DESC`,
      [userId]
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error("get heist cart error:", err);
    return res.status(500).json({ message: "Error fetching heistCart items", error: err.message });
  }
});
/* ───────────────────────── LIST MY HEIST ORDERS ───────────────────────── */
router.get("/heist-orders", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // 1) fetch orders for this user
    const [orders] = await pool.query(
      `SELECT id, address, phone, order_status, tracking_number,
              created_at, shipped_at, delivered_at, updated_at
         FROM heist_orders
        WHERE user_id = ?
        ORDER BY id DESC`,
      [userId]
    );

    if (!orders.length) {
      return res.status(200).json([]);
    }

    // 2) fetch items for these orders
    const orderIds = orders.map(o => o.id);
    const placeholders = orderIds.map(() => "?").join(",");
    const [items] = await pool.query(
      `SELECT i.heist_order_id, h.id AS heist_id, h.name, h.story, h.prize_name, h.prize, h.category, h.prize_image
         FROM heist_order_items i
         JOIN heist h ON h.id = i.heist_id
        WHERE i.heist_order_id IN (${placeholders})`,
      orderIds
    );

    // 3) assemble
    const byOrder = new Map();
    orders.forEach(o => {
      byOrder.set(o.id, {
        id: o.id,
        address: o.address,
        phone: o.phone,
        status: o.order_status,              // processing | shipped | in_transit | delivered | cancelled
        trackingNumber: o.tracking_number || null,
        createdAt: o.created_at,
        createdAtLocal: moment.tz(o.created_at, "Africa/Lagos").format("YYYY-MM-DD HH:mm:ss"),
        shippedAt: o.shipped_at,
        shippedAtLocal: o.shipped_at ? moment.tz(o.shipped_at, "Africa/Lagos").format("YYYY-MM-DD HH:mm:ss") : null,
        deliveredAt: o.delivered_at,
        deliveredAtLocal: o.delivered_at ? moment.tz(o.delivered_at, "Africa/Lagos").format("YYYY-MM-DD HH:mm:ss") : null,
        updatedAt: o.updated_at,
        updatedAtLocal: moment.tz(o.updated_at, "Africa/Lagos").format("YYYY-MM-DD HH:mm:ss"),
        items: [],
      });
    });

    items.forEach(it => {
      const bucket = byOrder.get(it.heist_order_id);
      if (!bucket) return;
      bucket.items.push({
        heistId: it.heist_id,
        name: it.name,
        story: it.story,
        prizeName: it.prize_name,
        prize: it.prize,
        category: it.category,
        image: absUrl(req, it.prize_image),
      });
    });

    res.status(200).json(Array.from(byOrder.values()));
  } catch (err) {
    console.error("get heist-orders error:", err);
    res.status(500).json({ message: "Error fetching heist orders", error: err.message });
  }
});
/* ───────────────────────── SINGLE ORDER DETAIL ───────────────────────── */
router.get("/heist-orders/:id", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  try {
    const [oRows] = await pool.query(
      `SELECT id, address, phone, order_status, tracking_number,
              created_at, shipped_at, delivered_at, updated_at
         FROM heist_orders
        WHERE id = ? AND user_id = ?
        LIMIT 1`,
      [orderId, userId]
    );
    const o = oRows[0];
    if (!o) return res.status(404).json({ message: "Order not found" });

    const [items] = await pool.query(
      `SELECT i.heist_order_id, h.id AS heist_id, h.name, h.story, h.prize_name, h.prize, h.category, h.prize_image
         FROM heist_order_items i
         JOIN heist h ON h.id = i.heist_id
        WHERE i.heist_order_id = ?`,
      [orderId]
    );

    const payload = {
      id: o.id,
      address: o.address,
      phone: o.phone,
      status: o.order_status,
      trackingNumber: o.tracking_number || null,
      createdAt: o.created_at,
      createdAtLocal: moment.tz(o.created_at, "Africa/Lagos").format("YYYY-MM-DD HH:mm:ss"),
      shippedAt: o.shipped_at,
      shippedAtLocal: o.shipped_at ? moment.tz(o.shipped_at, "Africa/Lagos").format("YYYY-MM-DD HH:mm:ss") : null,
      deliveredAt: o.delivered_at,
      deliveredAtLocal: o.delivered_at ? moment.tz(o.delivered_at, "Africa/Lagos").format("YYYY-MM-DD HH:mm:ss") : null,
      updatedAt: o.updated_at,
      updatedAtLocal: moment.tz(o.updated_at, "Africa/Lagos").format("YYYY-MM-DD HH:mm:ss"),
      items: items.map(it => ({
        heistId: it.heist_id,
        name: it.name,
        story: it.story,
        prizeName: it.prize_name,
        prize: it.prize,
        category: it.category,
        image: absUrl(req, it.prize_image),
      })),
    };

    res.status(200).json(payload);
  } catch (err) {
    console.error("get heist-order detail error:", err);
    res.status(500).json({ message: "Error fetching order", error: err.message });
  }
});

/* ---------------------------- Get / Set coin rate /users/coin-rate ---------------------------- */
router.get("/coin-rate", authenticateToken, async (req, res) => {
  try {
    const [[r]] = await pool.query(`
      SELECT unit, price, currency, updated_at 
      FROM coin_rate WHERE id = 1
    `);

    res.json({
      unit: Number(r?.unit || 0),
      price: Number(r?.price || 0),
      currency: r?.currency || "USD",
      updated_at: r?.updated_at
    });

  } catch (err) {
    console.error("get coin rate error:", err);
    res.status(500).json({ message: "Error fetching coin rate" });
  }
});
/* ---------------------------- Preview pricing /users/preview--------------------------- */
router.post("/preview", authenticateToken, async (req, res) => {
  try {
    const coins = Number(req.body?.coins);
    if (!Number.isInteger(coins) || coins <= 0) {
      return res.status(400).json({ message: "coins must be a positive integer" });
    }
    const [[rate]] = await pool.query("SELECT unit_price, currency FROM coin_rate WHERE id = 1");
    const unit = Number(rate?.unit_price || 0);
    const total = Number((unit * coins).toFixed(2));
    res.json({ coins, unit_price: unit, currency: rate?.currency || "NGN", total_price: total });
  } catch (err) {
    console.error("preview error:", err);
    res.status(500).json({ message: "Error previewing price" });
  }
});
/* -------------------------- Create coin purchase /users/purchases ------------------------- */
router.post("/purchases", authenticateToken, upload.single("proof"), async (req, res) => {
  try {
    const userId = req.user.id;
    const coins = Number(req.body?.coins);
    const user_note = req.body?.user_note || null;
    const proof = req.file;

    if (!Number.isInteger(coins) || coins <= 0) {
      return res.status(400).json({ message: "coins must be a positive integer" });
    }
    if (!proof) {
      return res.status(400).json({ message: "Payment proof is required (field: proof)" });
    }

    // ✅ snapshot current rate (FIXED: your coin_rate columns are unit + price, not unit_price)
    const [[rate]] = await pool.query("SELECT unit, price, currency FROM coin_rate WHERE id = 1");
    if (!rate) return res.status(500).json({ message: "Rate not configured" });

    const unit = Number(rate.unit);   // coins
    const price = Number(rate.price); // NGN

    if (!(unit > 0) || !(price > 0)) {
      return res.status(500).json({ message: "Rate not configured properly" });
    }

    // ✅ price per 1 coin
    const unit_price = Number((price / unit).toFixed(2));

    // ✅ total NGN for requested coins
    const total = Number((unit_price * coins).toFixed(2));

    // ✅ store proof path (served from /uploads)
    const proofPath = `/uploads/${proof.filename}`;
    const proofUrl = absUrl(req, proofPath);

    const [ins] = await pool.query(
      `INSERT INTO coin_purchases
         (user_id, coins, unit_price, total_price, proof_image, user_note, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, coins, unit_price, total, proofPath, user_note]
    );

    // fire-and-forget Telegram notify (admins)
    const adminChatIds = (process.env.TELEGRAM_ADMIN_CHAT_IDS || "6112214313,7357781470")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const msg =
      `<b>New Coin Purchase</b>\n` +
      `<b>User ID:</b> ${userId}\n` +
      `<b>Coins:</b> ${coins}\n` +
      `<b>Rate:</b> 1 coin = ${unit_price} ${rate.currency || "NGN"}\n` +
      `<b>Total:</b> ${total} ${rate.currency || "NGN"}\n` +
      (user_note ? `<b>User note:</b> ${user_note}\n` : "") +
      (proofUrl ? `<b>Proof:</b> <a href="${proofUrl}">View image</a>` : "");

    Promise.allSettled(
      adminChatIds.map(id => sendTelegramNotification(id, msg, { parse_mode: "HTML" }))
    ).catch(e => console.error("[telegram] purchase notify error:", e.message));

    res.status(201).json({
      message: "Purchase submitted. Awaiting admin approval.",
      purchaseId: ins.insertId,
      coins,
      unit_price,
      currency: rate.currency || "NGN",
      total_price: total,
      proof_image: proofUrl,
      note: "Transfer the total_price and upload a clear proof. Admin will approve and credit your coins."
    });
  } catch (err) {
    console.error("create coin purchase error:", err);
    res.status(500).json({ message: "Error creating purchase request" });
  }
});
/* ---------------------------- List my purchases /users/purchases --------------------------- */
router.get("/purchases", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      `SELECT id, coins, unit_price, total_price, proof_image, user_note, admin_note,
              status, approved_at, created_at, updated_at
         FROM coin_purchases
        WHERE user_id = ?
        ORDER BY id DESC`,
      [userId]
    );

    const data = rows.map(r => ({
      id: r.id,
      coins: r.coins,
      unit_price: Number(r.unit_price),
      total_price: Number(r.total_price),
      proof_image: absUrl(req, r.proof_image),
      user_note: r.user_note,
      admin_note: r.admin_note,
      status: r.status,
      approved_at: r.approved_at,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));

    res.json(data);
  } catch (err) {
    console.error("list my coin purchases error:", err);
    res.status(500).json({ message: "Error fetching purchases" });
  }
});

// POST /api/users/payout
router.post("/payout", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const {
    bid_points: rawPoints,
    account_name,
    account_number,
    bank_name,
  } = req.body || {};

  // Basic validation
  const bid_points = Number(rawPoints);
  if (!Number.isInteger(bid_points) || bid_points < 1) {
    return res.status(400).json({ message: "Minimum coin required is 1" });
  }
  if (!account_name || !account_number || !bank_name) {
    return res.status(400).json({ message: "account_name, account_number and bank_name are required" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock user's row to ensure consistent balance check
    const [uRows] = await conn.query(
      "SELECT id, bid_points FROM users WHERE id = ? FOR UPDATE",
      [userId]
    );
    const user = uRows[0];
    if (!user) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: "User not found" });
    }

    if (user.bid_points < bid_points) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Insufficient bid points to withdraw" });
    }

    // Create payout record (pending)
    const [ins] = await conn.query(
      `INSERT INTO payouts
         (user_id, bid_points, account_name, account_number, bank_name, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userId, bid_points, account_name, account_number, bank_name]
    );

    // Deduct immediately
    await conn.query(
      "UPDATE users SET bid_points = bid_points - ? WHERE id = ?",
      [bid_points, userId]
    );

    await conn.commit();
    conn.release();

    // Notify admins on Telegram (after commit)
    const telegramChatIds = ["6112214313", "7357781470"];
    const msg =
      `<b>Payout Request Created</b>\n` +
      `<b>User ID:</b> ${userId}\n` +
      `<b>Bid Points:</b> ${bid_points}\n` +
      `<b>Account Name:</b> ${account_name}\n` +
      `<b>Account Number:</b> ${account_number}\n` +
      `<b>Bank Name:</b> ${bank_name}`;

    Promise.allSettled(
      telegramChatIds.map((id) => sendTelegramNotification(id, msg))
    ).catch((e) => console.error("telegram notify error:", e.message));

    return res.status(201).json({
      message: "Payout request created successfully",
      payoutId: ins.insertId,
      status: "pending",
    });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    conn.release();
    console.error("Error processing payout request:", err);
    return res.status(500).json({ message: "Server error" });
  }
});
// List my payouts (optionally filter by status)
router.get("/payouts", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query; // optional: pending | approved | rejected

    const allowed = new Set(["pending", "approved", "rejected"]);
    const params = [userId];
    let where = "WHERE p.user_id = ?";

    if (status && allowed.has(String(status))) {
      where += " AND p.status = ?";
      params.push(status);
    }

    const [rows] = await pool.query(
      `SELECT p.* 
         FROM payouts p
         ${where}
         ORDER BY p.id DESC`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error("get user payouts error:", err);
    res.status(500).json({ message: "Error fetching payouts" });
  }
});
// Get a single payout I own
router.get("/payouts/:payoutId", authenticateToken, async (req, res) => {
  const payoutId = Number(req.params.payoutId);
  if (!Number.isInteger(payoutId) || payoutId <= 0) {
    return res.status(400).json({ message: "Invalid payout id" });
  }

  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      `SELECT p.* 
         FROM payouts p
        WHERE p.id = ? AND p.user_id = ?
        LIMIT 1`,
      [payoutId, userId]
    );

    const row = rows[0];
    if (!row) return res.status(404).json({ message: "Payout not found" });

    res.json(row);
  } catch (err) {
    console.error("get user payout detail error:", err);
    res.status(500).json({ message: "Error fetching payout" });
  }
});
// get pay account
router.get("/pay-account", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT bank_name, account_name, account_number, currency
         FROM pay_account
        WHERE id = 1 AND is_active = 1`
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Payment account not available" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("user get pay-account error:", err);
    res.status(500).json({ message: "Error fetching payment account" });
  }
});




/* =========================
   SHOP: CHECKOUT / CART / WAITLIST
========================= */


// Set these to match your NEW SQL table names:
const WAITLIST_TABLE = 'bids_waitlist';
const CART_TABLE = 'shop_cart_items';
const ORDERS_TABLE = 'shop_orders';
const ORDER_ITEMS_TABLE = 'shop_order_items';
const ONLY_BIDDING = new Set(['auction', 'heist']);

const MODES = new Set(['cash', 'auction', 'heist']);

function parseQty(q) {
  const n = Number(q ?? 1);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.floor(n);
}

// POST /api/users/buy  (BUY ONLY: CASH)
router.post("/buy", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const productId = Number(req.body.product_id);

  if (!Number.isFinite(productId)) {
    return res.status(400).json({ message: "Invalid product_id" });
  }

  // BUY ONLY = cash qty allowed
  const qty = parseQty(req.body.qty);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock user row
    const [[user]] = await conn.query(
      "SELECT id, bid_points FROM users WHERE id = ? FOR UPDATE",
      [userId]
    );
    if (!user) {
      await conn.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch product (cash only)
    const [[product]] = await conn.query(
      `SELECT id, name, cash_price, allow_cash
       FROM products
       WHERE id = ?
       LIMIT 1`,
      [productId]
    );
    if (!product) {
      await conn.rollback();
      return res.status(404).json({ message: "Product not found" });
    }

    // Availability (cash only)
    if (!product.allow_cash) {
      await conn.rollback();
      return res.status(403).json({
        message: "This product is not available for purchase at the moment.",
      });
    }

    const unitPrice = Number(product.cash_price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      await conn.rollback();
      return res.status(400).json({ message: "Invalid product cash_price" });
    }

    const subtotal = unitPrice * qty;

    // Balance check
    const available = Number(user.bid_points);
    if (!Number.isFinite(available) || available < subtotal) {
      await conn.rollback();
      return res.status(400).json({
        message: "Insufficient bid_points",
        required: subtotal,
        available,
      });
    }

    // Deduct bid_points
    await conn.query(
      "UPDATE users SET bid_points = bid_points - ? WHERE id = ?",
      [subtotal, userId]
    );

    // Insert into cart (cash purchase)
    const [ins] = await conn.query(
      `INSERT INTO ${CART_TABLE} (user_id, product_id, qty, price, subtotal, mode)
       VALUES (?, ?, ?, ?, ?, 'cash')`,
      [userId, productId, qty, unitPrice, subtotal]
    );

    const [[fresh]] = await conn.query(
      "SELECT bid_points FROM users WHERE id = ?",
      [userId]
    );

    await conn.commit();

    return res.status(201).json({
      message: "Purchase added to cart",
      created: { type: "cart_item", id: ins.insertId },
      balance: { bid_points: Number(fresh.bid_points) },
    });
  } catch (err) {
    await conn.rollback();
    console.error("POST /api/users/buy error:", err);
    return res.status(500).json({ message: "Buy failed" });
  } finally {
    conn.release();
  }
});

// POST /api/users/check-pay
router.post('/check-pay', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const productId = Number(req.body.product_id);
  const mode = String(req.body.mode || '').trim().toLowerCase();

  if (!Number.isFinite(productId)) {
    return res.status(400).json({ message: 'Invalid product_id' });
  }
  if (!MODES.has(mode)) {
    return res.status(400).json({ message: "mode must be 'cash', 'auction', or 'heist'" });
  }

  const qty = (mode === 'cash') ? parseQty(req.body.qty) : 1;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ✅ Block if already ACTIVE (queued OR in_progress)
    if (mode !== 'cash') {
      const [[dupe]] = await conn.query(
        `SELECT id, status FROM ${WAITLIST_TABLE}
         WHERE user_id = ?
           AND product_id = ?
           AND TRIM(LOWER(mode)) = ?
           AND status IN ('queued','in_progress')
         LIMIT 1 FOR UPDATE`,
        [userId, productId, mode]
      );

      if (dupe) {
        await conn.rollback();
        return res.status(409).json({
          message: `You already have an active ${mode} entry (${dupe.status}) for this product. Please wait until it is won, fulfilled, or cancelled before trying again.`
        });
      }
    }

    // Lock user
    const [[user]] = await conn.query(
      'SELECT id, bid_points FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    if (!user) {
      await conn.rollback();
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch product
    const [[product]] = await conn.query(
      `SELECT id, name,
              cash_price, auction_price, heist_price,
              allow_cash, allow_auction, allow_heist
       FROM products
       WHERE id = ?
       LIMIT 1`,
      [productId]
    );
    if (!product) {
      await conn.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    // Availability
    if ((mode === 'cash'    && !product.allow_cash) ||
        (mode === 'auction' && !product.allow_auction) ||
        (mode === 'heist'   && !product.allow_heist)) {
      await conn.rollback();
      return res.status(403).json({ message: `This product is not available for ${mode} at the moment.` });
    }

    const unitPrice =
      mode === 'cash'    ? Number(product.cash_price)
    : mode === 'auction' ? Number(product.auction_price)
                         : Number(product.heist_price);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'Invalid product price for selected mode' });
    }

    const subtotal = unitPrice * qty;

    if (Number(user.bid_points) < subtotal) {
      await conn.rollback();
      return res.status(400).json({
        message: 'Insufficient bid_points',
        required: subtotal,
        available: Number(user.bid_points)
      });
    }

    await conn.query(
      'UPDATE users SET bid_points = bid_points - ? WHERE id = ?',
      [subtotal, userId]
    );

    let created;
    if (mode === 'cash') {
      const [ins] = await conn.query(
        `INSERT INTO ${CART_TABLE} (user_id, product_id, qty, price, subtotal, mode)
         VALUES (?, ?, ?, ?, ?, 'cash')`,
        [userId, productId, qty, unitPrice, subtotal]
      );
      created = { type: 'cart_item', id: ins.insertId };
    } else {
      const [ins] = await conn.query(
        `INSERT INTO ${WAITLIST_TABLE} (user_id, product_id, qty, mode, bid_locked, status)
         VALUES (?, ?, 1, ?, ?, 'queued')`,
        [userId, productId, mode, subtotal]
      );
      created = { type: 'waitlist', id: ins.insertId, status: 'queued' };
    }

    const [[fresh]] = await conn.query('SELECT bid_points FROM users WHERE id = ?', [userId]);

    await conn.commit();
    return res.status(201).json({
      message: mode === 'cash' ? 'Added to cart' : `Added to ${mode} waitlist`,
      created,
      balance: { bid_points: Number(fresh.bid_points) }
    });

  } catch (err) {
    await conn.rollback();

    // ✅ If the UNIQUE KEY blocked a double join
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: `You already have an active ${mode} entry for this product. Please wait until it is won, fulfilled, or cancelled before trying again.`
      });
    }

    console.error('POST /api/users/check-pay error:', err);
    return res.status(500).json({ message: 'Checkout failed' });
  } finally {
    conn.release();
  }
});
// GET /api/users/shop/waitlist?mode=auction|heist&history=1
router.get('/shop/wait-list', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const modeFilter = String(req.query.mode || '').toLowerCase().trim();
  const history = String(req.query.history || '').trim() === '1';

  if (modeFilter && !ONLY_BIDDING.has(modeFilter)) {
    return res.status(400).json({ message: "Invalid mode. Use 'auction' or 'heist'." });
  }

  try {
    const params = [userId];
    let where = 'WHERE bw.user_id = ?';

    if (modeFilter) { where += ' AND TRIM(LOWER(bw.mode)) = ?'; params.push(modeFilter); }

    // ✅ default: only active entries (prevents old 'won' confusing the user)
    if (!history) {
      where += " AND bw.status IN ('queued','in_progress')";
    }

    const [rows] = await pool.query(
      `SELECT bw.id, bw.product_id, p.name AS product_name, bw.qty, bw.mode, bw.bid_locked, bw.status, bw.created_at
       FROM ${WAITLIST_TABLE} bw
       JOIN products p ON p.id = bw.product_id
       ${where}
       ORDER BY bw.id DESC`,
      params
    );

    res.json(rows);
  } catch (e) {
    console.error('GET /users/shop/waitlist error:', e);
    res.status(500).json({ message: 'Failed to fetch waitlist' });
  }
});
// GET /api/users/shop/cart
router.get('/shop/cart', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT
         ci.id,
         ci.product_id,
         p.name AS product_name,
         ci.qty,
         ci.price,
         ci.subtotal,
         ci.mode,
         ci.created_at
       FROM ${CART_TABLE} ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = ?
       ORDER BY ci.id DESC`,
      [userId]
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /users/shop/cart error:', e);
    res.status(500).json({ message: 'Failed to fetch cart' });
  }
});



// ================ USERS: VIEW ORDERS =================

// POST /api/users/shop/cart/checkout
router.post('/shop/cart/checkout', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { customer_name, phone_number, address, notes = '' } = req.body || {};

  // basic validation
  if (!String(customer_name || '').trim()) {
    return res.status(400).json({ message: 'customer_name is required' });
  }
  if (!String(phone_number || '').trim()) {
    return res.status(400).json({ message: 'phone_number is required' });
  }
  if (!String(address || '').trim()) {
    return res.status(400).json({ message: 'address is required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Load cart for this user
    const [cart] = await conn.query(
      `SELECT
         ci.id,
         ci.product_id,
         p.name  AS product_name,
         ci.qty,
         ci.price,
         ci.subtotal,
         ci.mode
       FROM ${CART_TABLE} ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = ?
       ORDER BY ci.id ASC
       FOR UPDATE`,
      [userId]
    );

    if (cart.length === 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'Your cart is empty.' });
    }

    // Compute totals
    let subtotal = 0;
    let itemsCount = 0;
    for (const row of cart) {
      subtotal += Number(row.subtotal) || 0;
      itemsCount += Number(row.qty) || 0;
    }

    // Create order
    const [insOrder] = await conn.query(
      `INSERT INTO ${ORDERS_TABLE}
         (user_id, customer_name, phone_number, address, notes, subtotal, items_count, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, String(customer_name).trim(), String(phone_number).trim(), String(address).trim(), String(notes || ''), subtotal, itemsCount]
    );
    const orderId = insOrder.insertId;

    // Copy items
    if (cart.length) {
      const values = cart.map(it => [
        orderId,
        it.product_id,
        it.product_name,
        it.qty,
        it.price,
        it.subtotal,
        'cash'
      ]);
      await conn.query(
        `INSERT INTO ${ORDER_ITEMS_TABLE}
           (order_id, product_id, product_name, qty, price, subtotal, mode)
         VALUES ${values.map(()=>'(?,?,?,?,?,?,?)').join(',')}`,
        values.flat()
      );
    }

    // Clear cart
    const cartIds = cart.map(r => r.id);
    await conn.query(
      `DELETE FROM ${CART_TABLE} WHERE id IN (${cartIds.map(()=>'?').join(',')})`,
      cartIds
    );

    await conn.commit();

    return res.status(201).json({
      message: 'Checkout successful. Order created.',
      order: {
        id: orderId,
        status: 'pending',
        subtotal,
        items_count: itemsCount,
        customer: {
          name: customer_name,
          phone_number,
          address,
          notes
        }
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('POST /users/shop/cart/checkout error:', err);
    return res.status(500).json({ message: 'Checkout failed', error: err.message });
  } finally {
    conn.release();
  }
});
// GET /api/users/shop/orders?status=&limit=&offset=
router.get('/shop/orders', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const status = (req.query.status || '').toString().toLowerCase();
  if (status && !['pending','paid','processing','in_transit','delivered','cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status filter' });
  }
  const limit  = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
  const offset = Math.max(0, Number(req.query.offset || 0));

  try {
    const where = ['o.user_id = ?'];
    const params = [userId];
    if (status) { where.push('o.status = ?'); params.push(status); }
    const whereSql = `WHERE ${where.join(' AND ')}`;

    const [rows] = await pool.query(
      `SELECT
         o.id, o.subtotal, o.items_count, o.status,
         o.tracking_number, o.carrier, o.expected_delivery,
         o.created_at, o.updated_at
       FROM shop_orders o
       ${whereSql}
       ORDER BY o.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ limit, offset, items: rows });
  } catch (err) {
    console.error('GET /users/shop/orders error:', err);
    res.status(500).json({ message: 'Failed to fetch your orders' });
  }
});
// GET /api/users/shop/orders/:id
router.get('/shop/orders/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid order id' });

  try {
    const [[order]] = await pool.query(
      `SELECT
         o.id, o.user_id, o.subtotal, o.items_count, o.status,
         o.tracking_number, o.carrier, o.expected_delivery,
         o.customer_name, o.phone_number, o.address, o.notes,
         o.created_at, o.updated_at
       FROM shop_orders o
       WHERE o.id = ? AND o.user_id = ?
       LIMIT 1`,
      [id, userId]
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const [items] = await pool.query(
      `SELECT id, product_id, product_name, qty, price, subtotal, mode, created_at
         FROM shop_order_items
        WHERE order_id = ?
        ORDER BY id ASC`,
      [id]
    );

    res.json({ order, items });
  } catch (err) {
    console.error('GET /users/shop/orders/:id error:', err);
    res.status(500).json({ message: 'Failed to fetch your order' });
  }
});


// GET /api/users/favorites
router.get('/favorites', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.cash_price,
         p.auction_price,
         p.heist_price,
         p.image_path,
         p.created_at,
         pf.created_at AS favorited_at
       FROM product_favorites pf
       JOIN products p ON p.id = pf.product_id
       WHERE pf.user_id = ?
       ORDER BY pf.created_at DESC`,
      [userId]
    );

    return res.json(
      rows.map(r => ({
        ...r,
        image_url: absUrl(req, r.image_path)
      }))
    );
  } catch (err) {
    console.error('GET /users/favorites error:', err);
    return res.status(500).json({ message: 'Failed to fetch favorites' });
  }
});
// POST /api/users/favorites/:productId/toggle
router.post('/favorites/:productId/toggle', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = Number(req.params.productId);
    if (!Number.isFinite(productId)) {
      return res.status(400).json({ message: 'Invalid product id' });
    }

    // Is it already favorited?
    const [[exists]] = await pool.query(
      `SELECT id FROM product_favorites WHERE user_id = ? AND product_id = ? LIMIT 1`,
      [userId, productId]
    );

    if (exists) {
      await pool.query(
        `DELETE FROM product_favorites WHERE id = ? LIMIT 1`,
        [exists.id]
      );
      return res.json({ toggled: 'removed', product_id: productId });
    } else {
      await pool.query(
        `INSERT INTO product_favorites (user_id, product_id) VALUES (?, ?)`,
        [userId, productId]
      );
      return res.status(201).json({ toggled: 'added', product_id: productId });
    }
  } catch (err) {
    console.error('POST /users/favorites/:productId/toggle error:', err);
    return res.status(500).json({ message: 'Failed to toggle favorite' });
  }
});



module.exports = router;
