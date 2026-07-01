// routes/admin.js (CommonJS, inline auth, with moment)
const express = require("express");
const moment = require("moment");
const { pool } = require("../db");
const { authenticateToken, authenticateAdmin } = require("../middleware/auth");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();
const { sendAuctionStartedEmail, sendHeistStartedEmail, sendEmail } = require("../lib/mail");
// adjust path to your multer config:
const { upload: imageUpload } = require("../middleware/upload");
const { absUrl } = require('../middleware/upload');
const { sendTelegramNotification } = require("../lib/telegram");

// ✅ CopUpBot Service (AI isolated here)
const {
  openaiConfigured,
  safeJsonParse,
  toOneWord,
  enforceOneWordVariants,
  generateVariantsFromStory,
} = require("../services/copupbot");



/* ---------- uploads setup ---------- */
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "image", ext)
      .replace(/\s+/g, "-")
      .toLowerCase();
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (/^image\/(png|jpe?g|gif|webp)$/i.test(file.mimetype)) return cb(null, true);
  cb(new Error("Only image files are allowed (png,jpg,jpeg,gif,webp)"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});

// helper: map /uploads/foo.jpg -> filesystem path
function toFsPath(webPath) {
  if (!webPath) return null;
  // stored as "/uploads/..."
  return path.join(__dirname, "..", webPath.replace(/^\//, ""));
}

const ALLOWED_STATUS = new Set([
  "processing",
  "packed",
  "shipped",
  "in_transit",
  "delivered",
  "cancelled",
]);

/* ---------- Helper ID Checkers (HEIST) ---------- */
function isCopId(val) {
  return typeof val === "string" && val.startsWith("cop_");
}
function isNumericId(val) {
  // allows "12" or 12
  const n = Number(val);
  return Number.isInteger(n) && String(val).trim() !== "" && n >= 0;
}

// GET /api/admin/profile
router.get("/profile", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;

      const [rows] = await pool.query(
        `SELECT
           full_name AS name,
           username,
           role
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [adminId]
      );

      if (!rows.length) {
        return res.status(404).json({ message: "Admin not found" });
      }

      // Only the requested fields
      const { name, username, role } = rows[0];
      return res.status(200).json({ name, username, role });
    } catch (err) {
      console.error("admin/profile error:", err);
      return res.status(500).json({ message: "Error fetching admin profile" });
    }
  }
);
/* ───────────────────────── UPDATE ADMIN PROFILE ───────────────────────── */
router.patch("/profile", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;
    let { email, name, username } = req.body || {};

    // Normalize/trim
    if (typeof email === "string") email = email.trim().toLowerCase();
    if (typeof name === "string") name = name.trim();
    if (typeof username === "string") username = username.trim();

    if (!email && !name && !username) {
      return res.status(400).json({
        message: "Provide at least one field to update (email, name, username)"
      });
    }

    // Validate email
    if (email) {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      const [erows] = await pool.query(
        "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
        [email, adminId]
      );
      if (erows.length) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    // Validate username
    if (username) {
      const userRe = /^[a-zA-Z0-9._-]{3,20}$/;
      if (!userRe.test(username)) {
        return res.status(400).json({
          message: "Invalid username. Use 3–20 letters, numbers, dot, underscore or hyphen"
        });
      }
      const [urows] = await pool.query(
        "SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1",
        [username, adminId]
      );
      if (urows.length) {
        return res.status(400).json({ message: "Username already in use" });
      }
    }

    // Validate name
    if (name !== undefined) {
      if (!name) return res.status(400).json({ message: "Name cannot be empty" });
      if (name.length > 80) {
        return res.status(400).json({ message: "Name too long (max 80 chars)" });
      }
    }

    // Build dynamic UPDATE
    const sets = [];
    const params = [];
    if (email)    { sets.push("email = ?");      params.push(email); }
    if (name !== undefined) { sets.push("full_name = ?"); params.push(name); }
    if (username) { sets.push("username = ?");   params.push(username); }

    if (!sets.length) {
      return res.status(200).json({ message: "No changes" });
    }

    params.push(adminId);
    const [result] = await pool.query(
      `UPDATE users
          SET ${sets.join(", ")},
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Return fresh profile snapshot
    const [rows] = await pool.query(
      `SELECT full_name AS name, username, email, role
         FROM users
        WHERE id = ?
        LIMIT 1`,
      [adminId]
    );

    return res.status(200).json({
      message: "Profile updated",
      ...rows[0],
    });
  } catch (err) {
    console.error("admin/update-profile error:", err);
    return res.status(500).json({ message: "Error updating admin profile" });
  }
});

// ================== ADMIN: USERS (WITH BID POINTS + EDIT) ==================
// GET /api/admin/user/count
router.get("/user/count",authenticateToken,authenticateAdmin,
  async (req, res) => {
    try {
      const [[result]] = await pool.query(
        `SELECT COUNT(*) AS total_users FROM users`
      );

      res.json({
        success: true,
        total_users: result.total_users,
      });
    } catch (err) {
      console.error("admin/users count error:", err);
      res.status(500).json({ message: "Error counting users" });
    }
  }
);
// GET /api/admin/users
router.get("/users", authenticateToken, authenticateAdmin,
  async (req, res) => {
    try {
      const { q, role, verified, blocked, page = 1, limit = 50, from, to } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const offset = (pageNum - 1) * lim;

      const where = [];
      const params = [];

      if (q) {
        where.push("(email LIKE ? OR username LIKE ? OR full_name LIKE ?)");
        const term = `%${q}%`;
        params.push(term, term, term);
      }
      if (role === "user" || role === "admin") {
        where.push("role = ?");
        params.push(role);
      }
      if (verified === "0" || verified === "1") {
        where.push("is_verified = ?");
        params.push(Number(verified));
      }
      if (blocked === "0" || blocked === "1") {
        where.push("is_blocked = ?");
        params.push(Number(blocked));
      }

      // Date range on created_at using moment
      let fromDate, toDate;
      if (from && moment(from, moment.ISO_8601, true).isValid()) {
        fromDate = moment(from).startOf("day").toDate();
        where.push("created_at >= ?");
        params.push(fromDate);
      }
      if (to && moment(to, moment.ISO_8601, true).isValid()) {
        toDate = moment(to).endOf("day").toDate();
        where.push("created_at <= ?");
        params.push(toDate);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM users ${whereSql}`,
        params
      );

      const [rows] = await pool.query(
        `SELECT
           id,
           email,
           username,
           full_name,
           role,
           is_verified,
           is_blocked,
           referral_code,
           wallet_address,
           game_id,
           bid_points,       -- <== added
           created_at
         FROM users
         ${whereSql}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [...params, lim, offset]
      );

      // Add formatted created_at
      const data = rows.map(r => ({
        ...r,
        created_at_fmt: r.created_at
          ? moment(r.created_at).format("YYYY-MM-DD HH:mm:ss")
          : null,
      }));

      res.json({ page: pageNum, limit: lim, total, data });
    } catch (err) {
      console.error("admin/users list error:", err);
      res.status(500).json({ message: "Error fetching users" });
    }
  }
);
// GET /api/admin/users/:id
router.get("/users/:id", authenticateToken, authenticateAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid user id" });
      }

      const [rows] = await pool.query(
        `SELECT
           id,
           email,
           username,
           full_name,
           role,
           is_verified,
           is_blocked,
           referral_code,
           wallet_address,
           game_id,
           bid_points,       -- <== added
           created_at
         FROM users
         WHERE id = ? LIMIT 1`,
        [id]
      );

      const user = rows[0];
      if (!user) return res.status(404).json({ message: "User not found" });

      user.created_at_fmt = user.created_at
        ? moment(user.created_at).format("YYYY-MM-DD HH:mm:ss")
        : null;

      res.json(user);
    } catch (err) {
      console.error("admin/users detail error:", err);
      res.status(500).json({ message: "Error fetching user" });
    }
  }
);
// PATCH /api/admin/users/:id
router.patch("/users/:id", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    // Acceptable fields
    let {
      email,
      username,
      full_name,      // preferred
      name,           // alias -> maps to full_name if provided
      role,
      is_verified,
      is_blocked,
      wallet_address,
      game_id,
      referral_code,
      bid_points,     // <── NEW: allow editing bid_points
    } = req.body || {};

    // Map alias
    if (full_name === undefined && typeof name === "string") full_name = name;

    // Normalize trims
    if (typeof email === "string")          email = email.trim().toLowerCase();
    if (typeof username === "string")       username = username.trim();
    if (typeof full_name === "string")      full_name = full_name.trim();
    if (typeof role === "string")           role = role.trim().toLowerCase();
    if (typeof wallet_address === "string") wallet_address = wallet_address.trim();
    if (typeof game_id === "string")        game_id = game_id.trim();
    if (typeof referral_code === "string")  referral_code = referral_code.trim();

    // Coerce booleans
    const toBoolInt = (v) =>
      v === undefined ? undefined :
      (v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true") ? 1 : 0;
    is_verified = toBoolInt(is_verified);
    is_blocked  = toBoolInt(is_blocked);

    // Coerce bid_points (if provided)
    if (bid_points !== undefined) {
      const bp = Number(bid_points);
      if (!Number.isFinite(bp) || !Number.isInteger(bp) || bp < 0) {
        return res.status(400).json({ message: "bid_points must be a non-negative integer" });
      }
      bid_points = bp;
    }

    // Must have at least one field to update
    if (
      email === undefined &&
      username === undefined &&
      full_name === undefined &&
      role === undefined &&
      is_verified === undefined &&
      is_blocked === undefined &&
      wallet_address === undefined &&
      game_id === undefined &&
      referral_code === undefined &&
      bid_points === undefined         // <── include bid_points in the check
    ) {
      return res.status(400).json({ message: "Provide at least one field to update" });
    }

    // Validate email uniqueness & format
    if (email !== undefined) {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      const [erows] = await pool.query(
        "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
        [email, id]
      );
      if (erows.length) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    // Validate username uniqueness & format
    if (username !== undefined) {
      const userRe = /^[a-zA-Z0-9._-]{3,20}$/;
      if (!userRe.test(username)) {
        return res.status(400).json({
          message: "Invalid username. Use 3–20 letters, numbers, dot, underscore or hyphen",
        });
      }
      const [urows] = await pool.query(
        "SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1",
        [username, id]
      );
      if (urows.length) {
        return res.status(400).json({ message: "Username already in use" });
      }
    }

    // Validate full_name
    if (full_name !== undefined) {
      if (!full_name) return res.status(400).json({ message: "Full name cannot be empty" });
      if (full_name.length > 80) {
        return res.status(400).json({ message: "Full name too long (max 80 chars)" });
      }
    }

    // Validate role (optional; adjust allowed values to your system)
    if (role !== undefined) {
      const allowedRoles = new Set(["user", "admin"]);
      if (!allowedRoles.has(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
    }

    // Build dynamic update
    const sets = [];
    const params = [];

    if (email !== undefined)          { sets.push("email = ?");          params.push(email); }
    if (username !== undefined)       { sets.push("username = ?");       params.push(username); }
    if (full_name !== undefined)      { sets.push("full_name = ?");      params.push(full_name); }
    if (role !== undefined)           { sets.push("role = ?");           params.push(role); }
    if (is_verified !== undefined)    { sets.push("is_verified = ?");    params.push(is_verified); }
    if (is_blocked !== undefined)     { sets.push("is_blocked = ?");     params.push(is_blocked); }
    if (wallet_address !== undefined) { sets.push("wallet_address = ?"); params.push(wallet_address || null); }
    if (game_id !== undefined)        { sets.push("game_id = ?");        params.push(game_id || null); }
    if (referral_code !== undefined)  { sets.push("referral_code = ?");  params.push(referral_code || null); }
    if (bid_points !== undefined)     { sets.push("bid_points = ?");     params.push(bid_points); } // <── NEW

    if (!sets.length) {
      return res.status(200).json({ message: "No changes" });
    }

    params.push(id);

    const [result] = await pool.query(
      `UPDATE users
          SET ${sets.join(", ")},
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return fresh snapshot (same fields as your GET, plus bid_points)
    const [rows] = await pool.query(
      `SELECT
         id,
         email,
         username,
         full_name,
         role,
         is_verified,
         is_blocked,
         referral_code,
         wallet_address,
         game_id,
         bid_points,           -- <── include in response
         created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.created_at_fmt = user.created_at
      ? moment(user.created_at).format("YYYY-MM-DD HH:mm:ss")
      : null;

    return res.status(200).json({
      message: "User updated",
      ...user,
    });
  } catch (err) {
    console.error("admin/users update error:", err);
    return res.status(500).json({ message: "Error updating user" });
  }
});
// GET /api/admin/users
router.get("/users-copupcoin", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    // 1) Fetch users (include only fields you want to expose)
    const [rows] = await pool.query(
      `SELECT
         id,
         email,
         username,
         full_name,
         bid_points,
         created_at
       FROM users
       ORDER BY id DESC`
    );

    // 2) Compute total bid_points across all users
    const [sumRows] = await pool.query(
      `SELECT COALESCE(SUM(bid_points), 0) AS total_bid_points FROM users`
    );
    const totalBidPoints = Number(sumRows[0]?.total_bid_points || 0);

    // (Optional) add a formatted date if you’re already using moment in this file
    // rows.forEach(u => {
    //   u.created_at_fmt = u.created_at
    //     ? moment(u.created_at).format("YYYY-MM-DD HH:mm:ss")
    //     : null;
    // });

    return res.status(200).json({
      totalUsers: rows.length,
      totalBidPoints,
      users: rows
    });
  } catch (error) {
    console.error("admin get users error:", error);
    return res.status(500).json({ message: "Error fetching users" });
  }
});
// DELETE /api/admin/users/:id
router.delete("/users/:id", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    // Optional: Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    // Check if user exists
    const [[exists]] = await pool.query(
      "SELECT id FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    if (!exists) {
      return res.status(404).json({ message: "User not found" });
    }

    // === OPTIONAL CLEANUP BLOCK ===
    // If your tables don’t have foreign keys with ON DELETE CASCADE,
    // uncomment and edit this section:
    /*
    await pool.query("DELETE FROM product_favorites WHERE user_id = ?", [id]);
    await pool.query("DELETE FROM bids_waitlist WHERE user_id = ?", [id]);
    await pool.query("DELETE FROM auction_participants WHERE user_id = ?", [id]);
    await pool.query("DELETE FROM heist_participants WHERE user_id = ?", [id]);
    await pool.query("DELETE FROM shop_orders WHERE user_id = ?", [id]);
    */

    // Delete the user
    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      ok: true,
      message: "User deleted successfully",
      deleted_user_id: id
    });

  } catch (err) {
    console.error("DELETE /admin/users/:id error:", err);
    return res.status(500).json({ message: "Error deleting user" });
  }
});


/* ---------- CREATE AUCTION (admin) ---------- */
router.post("/auctions",authenticateToken,authenticateAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, description = "", entry_bid_points, minimum_users, category } = req.body;

      // Basic validation
      if (!name || entry_bid_points == null || minimum_users == null || !category) {
        return res.status(400).json({ message: "name, entry_bid_points, minimum_users, category are required" });
      }

      const allowed = new Set(["cash", "product", "coupon"]);
      if (!allowed.has(String(category).toLowerCase())) {
        return res.status(400).json({ message: "Invalid category (cash|product|coupon)" });
      }

      const entry = Number(entry_bid_points);
      const minUsers = Number(minimum_users);
      if (!Number.isInteger(entry) || entry < 0) {
        return res.status(400).json({ message: "entry_bid_points must be a non-negative integer" });
      }
      if (!Number.isInteger(minUsers) || minUsers < 1) {
        return res.status(400).json({ message: "minimum_users must be an integer >= 1" });
      }

      const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

      const [result] = await pool.query(
        `INSERT INTO auctions
          (name, description, image, entry_bid_points, minimum_users, category, status, created_by)
         VALUES
          (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [name, description, imagePath, entry, minUsers, category.toLowerCase(), req.user.id]
      );

      res.status(201).json({
        message: "Auction created successfully",
        id: result.insertId,
        image: imagePath,
      });
    } catch (error) {
      console.error("Error creating auction:", error);
      res.status(500).json({ message: "Error creating auction", error: error.message });
    }
  }
);
/* ───────────────────────────── GET ALL ───────────────────────────── */
router.get("/auctions",authenticateToken,authenticateAdmin,
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
/* ───────────────────────────── GET ONE ───────────────────────────── */
router.get("/auctions/:id", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid auction id" });
      }

      const [rows] = await pool.query(
        `SELECT id, name, description, image, entry_bid_points, minimum_users,
                category, status, created_by, created_at, updated_at
         FROM auctions
         WHERE id = ? LIMIT 1`,
        [id]
      );

      const auction = rows[0];
      if (!auction) return res.status(404).json({ message: "Auction not found" });

      auction.image_url = absUrl(req, auction.image);
      res.json(auction);
    } catch (err) {
      console.error("admin/auctions get error:", err);
      res.status(500).json({ message: "Error fetching auction" });
    }
  }
);
/* ───────────────────────────── UPDATE ───────────────────────────── */
router.patch("/auctions/:id", authenticateToken, authenticateAdmin, upload.single("image"), async (req, res) => {
    const conn = await pool.getConnection();
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid auction id" });
      }

      // fetch current to possibly remove old image
      const [curRows] = await conn.query(
        "SELECT image FROM auctions WHERE id = ? LIMIT 1",
        [id]
      );
      if (!curRows.length) {
        return res.status(404).json({ message: "Auction not found" });
      }
      const oldImage = curRows[0].image;

      const {
        name,
        description,
        entry_bid_points,
        minimum_users,
        category,
        status,
      } = req.body;

      const updates = [];
      const params = [];

      if (name != null) { updates.push("name = ?"); params.push(name); }
      if (description != null) { updates.push("description = ?"); params.push(description); }

      if (entry_bid_points != null) {
        const entry = Number(entry_bid_points);
        if (!Number.isInteger(entry) || entry < 0)
          return res.status(400).json({ message: "entry_bid_points must be a non-negative integer" });
        updates.push("entry_bid_points = ?");
        params.push(entry);
      }

      if (minimum_users != null) {
        const minUsers = Number(minimum_users);
        if (!Number.isInteger(minUsers) || minUsers < 1)
          return res.status(400).json({ message: "minimum_users must be an integer >= 1" });
        updates.push("minimum_users = ?");
        params.push(minUsers);
      }

      if (category != null) {
        const cat = String(category).toLowerCase();
        if (!["cash", "product", "coupon"].includes(cat))
          return res.status(400).json({ message: "Invalid category (cash|product|coupon)" });
        updates.push("category = ?");
        params.push(cat);
      }

      if (status != null) {
        const st = String(status).toLowerCase();
        if (!["pending", "active", "completed", "cancelled"].includes(st))
          return res.status(400).json({ message: "Invalid status (pending|active|completed|cancelled)" });
        updates.push("status = ?");
        params.push(st);
      }

      let newImagePath = null;
      if (req.file) {
        newImagePath = `/uploads/${req.file.filename}`;
        updates.push("image = ?");
        params.push(newImagePath);
      }

      if (!updates.length) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      updates.push("updated_at = CURRENT_TIMESTAMP");

      await conn.query(
        `UPDATE auctions SET ${updates.join(", ")} WHERE id = ?`,
        [...params, id]
      );

      // delete old image if replaced
      if (newImagePath && oldImage && oldImage !== newImagePath) {
        const fsPath = toFsPath(oldImage);
        try {
          if (fsPath && fs.existsSync(fsPath)) fs.unlinkSync(fsPath);
        } catch (e) {
          console.warn("Failed to remove old image:", e.message);
        }
      }

      // return updated row
      const [rows] = await conn.query(
        `SELECT id, name, description, image, entry_bid_points, minimum_users,
                category, status, created_by, created_at, updated_at
         FROM auctions
         WHERE id = ? LIMIT 1`,
        [id]
      );
      const updated = rows[0];
      updated.image_url = absUrl(req, updated.image);

      res.json({ message: "Auction updated", data: updated });
    } catch (err) {
      console.error("admin/auctions update error:", err);
      res.status(500).json({ message: "Error updating auction", error: err.message });
    } finally {
      conn.release();
    }
  }
);
/* ───────────────────────────── DELETE ───────────────────────────── */
router.delete("/auctions/:id",authenticateToken,authenticateAdmin,
  async (req, res) => {
    const conn = await pool.getConnection();
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid auction id" });
      }

      const [rows] = await conn.query(
        "SELECT image FROM auctions WHERE id = ? LIMIT 1",
        [id]
      );
      if (!rows.length) {
        return res.status(404).json({ message: "Auction not found" });
      }
      const imagePath = rows[0].image;

      const [result] = await conn.query("DELETE FROM auctions WHERE id = ?", [id]);

      if (result.affectedRows) {
        // remove image from disk
        const fsPath = toFsPath(imagePath);
        try {
          if (fsPath && fs.existsSync(fsPath)) fs.unlinkSync(fsPath);
        } catch (e) {
          console.warn("Failed to remove image:", e.message);
        }
      }

      res.json({ message: "Auction deleted" });
    } catch (err) {
      console.error("admin/auctions delete error:", err);
      // handle possible FK constraint error if you add bids table later
      res.status(500).json({ message: "Error deleting auction", error: err.message });
    } finally {
      conn.release();
    }
  }
);
/* ───────────────────────────── start auction ───────────────────────────── */
router.patch("/auctions/:id/start",authenticateToken,authenticateAdmin,
  async (req, res) => {
    const conn = await pool.getConnection();
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid auction id" });
      }

      const force = String(req.query.force || "").toLowerCase() === "true";

      await conn.beginTransaction();

      // lock the auction
      const [aRows] = await conn.query(
        `SELECT id, name, image, status, minimum_users
           FROM auctions
          WHERE id = ? FOR UPDATE`,
        [id]
      );
      const auction = aRows[0];
      if (!auction) {
        await conn.rollback();
        return res.status(404).json({ message: "Auction not found" });
      }
      if (auction.status === "active") {
        await conn.rollback();
        return res.status(400).json({ message: "Auction already active" });
      }
      if (!["pending", "hold"].includes(auction.status)) {
        await conn.rollback();
        return res.status(400).json({ message: `Cannot start auction from status '${auction.status}'` });
      }

      // If pending, ensure minimum users unless force
      if (auction.status === "pending" && !force) {
        const [[{ cnt }]] = await conn.query(
          `SELECT COUNT(*) AS cnt
             FROM auction_participants
            WHERE auction_id = ?`,
          [id]
        );
        if (cnt < auction.minimum_users) {
          await conn.rollback();
          return res.status(400).json({
            message: "Minimum users not reached",
            current_participants: cnt,
            required: auction.minimum_users,
          });
        }
      }

      // set active + initial end_date (5 minutes from now)
      const [upd] = await conn.query(
        `UPDATE auctions
            SET status = 'active',
                end_date = DATE_ADD(NOW(), INTERVAL 5 MINUTE),
                updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND status IN ('pending','hold')`,
        [id]
      );
      if (!upd.affectedRows) {
        await conn.rollback();
        return res.status(409).json({ message: "Auction status changed by another process. Try again." });
      }

      // gather participants to notify (inside tx)
      const [pRows] = await conn.query(
        `SELECT u.id, u.username, u.email
           FROM auction_participants ap
           JOIN users u ON u.id = ap.user_id
          WHERE ap.auction_id = ?`,
        [id]
      );

      // read back the end_date we just set
      const [[rowEnd]] = await conn.query(
        "SELECT end_date FROM auctions WHERE id = ? LIMIT 1",
        [id]
      );

      await conn.commit();

      // send emails (outside transaction)
      const auctionLink = `${req.protocol}://${req.get("host")}/api/auctions/${id}`;
      const imageUrl = absUrl(req, auction.image);
      const recipients = pRows.filter(r => r.email && /\S+@\S+\.\S+/.test(r.email));

      const results = await Promise.allSettled(
        recipients.map(r =>
          sendAuctionStartedEmail(r.email, auction.name, auctionLink, imageUrl)
        )
      );

      const emails_sent = results.filter(r => r.status === "fulfilled").length;
      const emails_failed = results.length - emails_sent;

      return res.json({
        message: "Auction started",
        auction_id: id,
        status: "active",
        participants_notified: recipients.length,
        emails_sent,
        emails_failed,
        end_date_in_utc: rowEnd?.end_date ? new Date(rowEnd.end_date).toISOString() : null,
      });
    } catch (err) {
      try { await conn.rollback(); } catch {}
      console.error("start auction error:", err);
      return res.status(500).json({ message: "Error starting auction", error: err.message });
    } finally {
      conn.release();
    }
  }
);
/* ───────────────────────── UPDATE AUCTION ORDER ───────────────────────── */
// body: { status?, trackingNumber?, notify? }  // notify defaults to true
router.patch("/auction/orders/:orderId", authenticateToken, authenticateAdmin,
  async (req, res) => {
    const orderId = Number(req.params.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    let { status, trackingNumber, notify } = req.body || {};
    const hasStatus = typeof status === "string" && status.trim() !== "";
    const hasTrack  = typeof trackingNumber === "string";

    if (!hasStatus && !hasTrack) {
      return res.status(400).json({ message: "Provide status and/or trackingNumber" });
    }

    if (hasStatus && !ALLOWED_STATUS.has(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // default: send email unless explicitly false
    const shouldNotify = notify === undefined ? true : Boolean(notify);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // lock the order
      const [rows] = await conn.query(
        `SELECT id, user_id, order_status, tracking_number, shipped_at, delivered_at
           FROM auction_orders
          WHERE id = ?
          FOR UPDATE`,
        [orderId]
      );
      const cur = rows[0];
      if (!cur) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({ message: "Order not found" });
      }

      const sets = [];
      const params = [];

      // status change
      let setShippedAt = false;
      let setDeliveredAt = false;

      if (hasStatus && status !== cur.order_status) {
        sets.push("order_status = ?");
        params.push(status);

        // forward timestamping
        if ((status === "shipped" || status === "in_transit" || status === "delivered") && !cur.shipped_at) {
          setShippedAt = true;
        }
        if (status === "delivered" && !cur.delivered_at) {
          setDeliveredAt = true;
        }
      }

      // tracking number (allow empty string to clear if you want)
      if (hasTrack) {
        sets.push("tracking_number = ?");
        params.push(trackingNumber.trim());
      }

      if (setShippedAt)   sets.push("shipped_at = CURRENT_TIMESTAMP");
      if (setDeliveredAt) sets.push("delivered_at = CURRENT_TIMESTAMP");

      if (!sets.length) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ message: "No changes to apply" });
      }

      sets.push("updated_at = CURRENT_TIMESTAMP");
      await conn.query(
        `UPDATE auction_orders SET ${sets.join(", ")} WHERE id = ?`,
        [...params, orderId]
      );

      // re-fetch order (with user email/username for notification)
      const [[updated]] = await conn.query(
        `SELECT ao.*, u.email, u.username
           FROM auction_orders ao
           JOIN users u ON u.id = ao.user_id
          WHERE ao.id = ?`,
        [orderId]
      );

      // fetch items for response
      const [items] = await conn.query(
        `SELECT aoi.id AS item_id, aoi.auction_id,
                a.name, a.description, a.image, a.category, a.final_price
           FROM auction_order_items aoi
           JOIN auctions a ON a.id = aoi.auction_id
          WHERE aoi.auction_order_id = ?
          ORDER BY aoi.id ASC`,
        [orderId]
      );

      await conn.commit();
      conn.release();

      // Email notification (fire-and-forget)
      if (shouldNotify && updated && updated.email) {
        const subject = `Your auction order #${updated.id} is now ${updated.order_status.replace("_", " ")}`;
        const html = `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;border:1px solid #eee;border-radius:8px;padding:20px;">
            <h2 style="margin-top:0;color:#56b2b7;">CopupBid – Order Update</h2>
            <p>Hello ${updated.username || "there"},</p>
            <p>Your auction order <strong>#${updated.id}</strong> status is now <strong>${updated.order_status}</strong>.</p>
            ${updated.tracking_number ? `<p>Tracking number: <strong>${updated.tracking_number}</strong></p>` : ""}
            <p>We’ll keep you posted on further updates.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:18px 0;">
            <p style="font-size:12px;color:#888;">Automated message · Please do not reply</p>
          </div>`;
        sendEmail(updated.email, subject, html).catch(e =>
          console.error("auction order notify email error:", e.message)
        );
      }

      return res.json({
        orderId: updated.id,
        userId: updated.user_id,
        status: updated.order_status,
        trackingNumber: updated.tracking_number,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
        shippedAt: updated.shipped_at,
        deliveredAt: updated.delivered_at,
        items: items.map(r => ({
          itemId: r.item_id,
          auctionId: r.auction_id,
          name: r.name,
          description: r.description,
          image: r.image, // keep raw path; your UI can prefix if needed
          category: r.category,
          finalPrice: r.final_price,
        })),
      });
    } catch (err) {
      try { await pool.query("ROLLBACK"); } catch {}
      console.error("admin update auction order error:", err);
      return res.status(500).json({ message: "Error updating auction order", error: err.message });
    }
  }
);
/* ───────────────────────── get AUCTION ORDER ───────────────────────── */
router.get("/auction/orders", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { q, status, from, to, page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * lim;

    const where = [];
    const params = [];

    // Text search: email/username; also allow exact order id if q is an integer
    if (q && String(q).trim() !== "") {
      const term = `%${q}%`;
      const qNum = Number(q);
      if (Number.isInteger(qNum) && qNum > 0) {
        where.push("(ao.id = ? OR u.email LIKE ? OR u.username LIKE ?)");
        params.push(qNum, term, term);
      } else {
        where.push("(u.email LIKE ? OR u.username LIKE ?)");
        params.push(term, term);
      }
    }

    // Status filter (optional)
    if (status && typeof status === "string" && status.trim() !== "") {
      where.push("ao.order_status = ?");
      params.push(status.trim().toLowerCase());
    }

    // Date range on created_at
    if (from && moment(from, moment.ISO_8601, true).isValid()) {
      where.push("ao.created_at >= ?");
      params.push(moment(from).startOf("day").toDate());
    }
    if (to && moment(to, moment.ISO_8601, true).isValid()) {
      where.push("ao.created_at <= ?");
      params.push(moment(to).endOf("day").toDate());
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Count total orders matching filters
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM auction_orders ao
         JOIN users u ON u.id = ao.user_id
        ${whereSql}`,
      params
    );

    if (!total) {
      return res.json({ page: pageNum, limit: lim, total: 0, data: [] });
    }

    // Fetch orders page
    const [orders] = await pool.query(
      `SELECT
         ao.id,
         ao.user_id,
         u.email,
         u.username,
         ao.address,
         ao.phone,
         ao.order_status,
         ao.tracking_number,
         ao.created_at,
         ao.updated_at,
         ao.shipped_at,
         ao.delivered_at
       FROM auction_orders ao
       JOIN users u ON u.id = ao.user_id
       ${whereSql}
       ORDER BY ao.id DESC
       LIMIT ? OFFSET ?`,
      [...params, lim, offset]
    );

    const orderIds = orders.map(o => o.id);
    // Fetch items for all orders in this page
    const [items] = orderIds.length
      ? await pool.query(
          `SELECT
             aoi.auction_order_id,
             aoi.id AS item_id,
             aoi.auction_id,
             a.name,
             a.description,
             a.image,
             a.category,
             a.final_price
           FROM auction_order_items aoi
           JOIN auctions a ON a.id = aoi.auction_id
          WHERE aoi.auction_order_id IN (${orderIds.map(()=>"?").join(",")})
          ORDER BY aoi.auction_order_id ASC, aoi.id ASC`,
          orderIds
        )
      : [[]];

    // Group items by order_id
    const byOrder = new Map();
    for (const o of orders) {
      byOrder.set(o.id, {
        orderId: o.id,
        userId: o.user_id,
        email: o.email,
        username: o.username,
        address: o.address,
        phone: o.phone,
        status: o.order_status,
        trackingNumber: o.tracking_number,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        shippedAt: o.shipped_at,
        deliveredAt: o.delivered_at,
        items: []
      });
    }
    for (const it of items) {
      const bucket = byOrder.get(it.auction_order_id);
      if (bucket) {
        bucket.items.push({
          itemId: it.item_id,
          auctionId: it.auction_id,
          name: it.name,
          description: it.description,
          image: it.image, // keep raw; UI can prefix
          category: it.category,
          finalPrice: it.final_price
        });
      }
    }

    return res.json({
      page: pageNum,
      limit: lim,
      total,
      data: Array.from(byOrder.values())
    });
  } catch (err) {
    console.error("admin list auction orders error:", err);
    return res.status(500).json({ message: "Error fetching auction orders", error: err.message });
  }
});
// Will refuse to delete if status is shipped/in_transit/delivered unless force=1 (or true).
router.delete("/auction/orders/:orderId", authenticateToken, authenticateAdmin, async (req, res) => {
  const orderId = Number(req.params.orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  const forced = req.query.force === "1" || String(req.query.force).toLowerCase() === "true";

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock the order row
    const [rows] = await conn.query(
      `SELECT id, user_id, order_status
         FROM auction_orders
        WHERE id = ?
        FOR UPDATE`,
      [orderId]
    );
    const order = rows[0];
    if (!order) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: "Order not found" });
    }

    // Protect shipped / in_transit / delivered unless forced
    const protectedStatuses = new Set(["shipped", "in_transit", "delivered"]);
    if (protectedStatuses.has(order.order_status) && !forced) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        message: `Order is ${order.order_status} and cannot be deleted without force. Append ?force=1 to override.`
      });
    }

    // Delete items first (in case there is no FK cascade)
    const [delItemsRes] = await conn.query(
      `DELETE FROM auction_order_items WHERE auction_order_id = ?`,
      [orderId]
    );

    // Delete the order
    const [delOrderRes] = await conn.query(
      `DELETE FROM auction_orders WHERE id = ?`,
      [orderId]
    );

    await conn.commit();
    conn.release();

    return res.json({
      message: "Order deleted",
      orderId,
      deletedItems: delItemsRes.affectedRows || 0,
      forced
    });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    conn.release();
    console.error("admin delete auction order error:", err);
    return res.status(500).json({ message: "Error deleting auction order", error: err.message });
  }
});


/* ───────────────────── Admin: set affiliate requirement on an auction ───────────────────── */
router.post("/affiliate/set-requirement/:auctionId", authenticateToken, authenticateAdmin,
  async (req, res) => {
    try {
      const auctionId = Number(req.params.auctionId);
      const { targetUsers, rewardBidPoints } = req.body || {};

      if (!Number.isInteger(auctionId) || auctionId <= 0) {
        return res.status(400).json({ message: "Invalid auctionId" });
      }
      const target = Number(targetUsers);
      const reward = Number(rewardBidPoints);
      if (!Number.isInteger(target) || target < 1) {
        return res.status(400).json({ message: "targetUsers must be >= 1" });
      }
      if (!Number.isInteger(reward) || reward < 0) {
        return res.status(400).json({ message: "rewardBidPoints must be >= 0" });
      }

      await pool.query(
        `INSERT INTO auction_affiliates (auction_id, target_users, reward_bid_points)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           target_users = VALUES(target_users),
           reward_bid_points = VALUES(reward_bid_points)`,
        [auctionId, target, reward]
      );

      res.status(201).json({ message: "Affiliate requirement set successfully for auction" });
    } catch (error) {
      console.error("Error setting affiliate requirement:", error);
      res.status(500).json({ message: "Error setting affiliate requirement" });
    }
  }
);
/* ───────────────────── Admin: list auctions with affiliate requirements ───────────────────── */
router.get("/affiliate/list", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.name, a.description, aa.target_users, aa.reward_bid_points
         FROM auctions a
         JOIN auction_affiliates aa ON a.id = aa.auction_id
        ORDER BY a.id DESC`
    );
    if (!rows.length) {
      return res.status(404).json({ message: "No auctions with affiliate requirements found." });
    }
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching auctions with affiliate requirements:", error);
    res.status(500).json({ message: "Error fetching auctions with affiliate requirements" });
  }
});
/* ───────────────── Set affiliate requirement for a HEIST (upsert) ───────────────── */
router.post("/affiliate/set-requirement/heist/:heistId", authenticateToken, authenticateAdmin, async (req, res) => {
  const heistId = Number(req.params.heistId);
  const targetUsers = Number(req.body?.targetUsers);
  const rewardBidPoints = Number(req.body?.rewardBidPoints);

    if (!Number.isInteger(heistId) || heistId <= 0) {
      return res.status(400).json({ message: "Invalid heistId" });
    }
    if (!Number.isInteger(targetUsers) || targetUsers < 0) {
      return res.status(400).json({ message: "targetUsers must be a non-negative integer" });
    }
    if (!Number.isInteger(rewardBidPoints) || rewardBidPoints < 0) {
      return res.status(400).json({ message: "rewardBidPoints must be a non-negative integer" });
    }

    try {
      const [result] = await pool.query(
        `
        INSERT INTO heist_affiliates (heist_id, target_users, reward_bid_points)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          target_users = VALUES(target_users),
          reward_bid_points = VALUES(reward_bid_points),
          updated_at = CURRENT_TIMESTAMP
        `,
        [heistId, targetUsers, rewardBidPoints]
      );

      // mysql2 note: affectedRows === 1 (insert), === 2 (update)
      const created = result.affectedRows === 1;

      res.status(created ? 201 : 200).json({
        message: created
          ? "Affiliate requirement created for heist"
          : "Affiliate requirement updated for heist",
        heist_id: heistId,
        target_users: targetUsers,
        reward_bid_points: rewardBidPoints,
      });
    } catch (error) {
      console.error("Error setting affiliate requirement for heist:", error);
      res.status(500).json({ message: "Error setting affiliate requirement for heist" });
    }
  }
);
/* ───────────────────── Delete affiliate requirement for a HEIST ─────────────────── */
router.delete("/heist/affiliate/delete/:heistId", authenticateToken, authenticateAdmin, async (req, res) => {
  const heistId = Number(req.params.heistId);
  if (!Number.isInteger(heistId) || heistId <= 0) {
    return res.status(400).json({ message: "Invalid heistId" });
    }

    try {
      const [result] = await pool.query(
        `DELETE FROM heist_affiliates WHERE heist_id = ?`,
        [heistId]
      );

      if (!result.affectedRows) {
        return res.status(404).json({ message: "Heist affiliate requirements not found." });
      }

      res.status(200).json({ message: "Heist affiliate requirements deleted successfully." });
    } catch (error) {
      console.error("Error deleting heist affiliate requirements:", error);
      res.status(500).json({ message: "Error deleting heist affiliate requirements" });
    }
  }
);

/// ----------------------- Most heists router ---------------------- */
/** * ✅ GET /admin/heists * List all heists + variants count + image url */
router.get("/heists", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        id, name, status, story,
        min_users, ticket_price, retry_ticket_price,
        prize, prize_name, prize_image,
        countdown_duration_minutes,
        question_variants,
        created_at, updated_at,
        countdown_started_at, countdown_ends_at,
        submissions_locked, winner_id
      FROM heist
      ORDER BY id DESC
      `
    );

    const data = rows.map((h) => {
      const variants = safeJsonParse(h.question_variants, []);
      return {
        ...h,
        prize_image: absUrl(req, h.prize_image),
        variants_count: Array.isArray(variants) ? variants.length : 0,
        question_variants: variants,
      };
    });

    res.json({ data });
  } catch (err) {
    console.error("admin list heists error:", err);
    res.status(500).json({ message: "Error fetching heists", error: err.message });
  }
});
/** * ✅ GET /heists/:id */
router.get("/heists/:id", authenticateToken, authenticateAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid id" });

  try {
    const [rows] = await pool.query("SELECT * FROM heist WHERE id = ? LIMIT 1", [id]);
    const h = rows[0];
    if (!h) return res.status(404).json({ message: "Heist not found" });

    const variants = safeJsonParse(h.question_variants, []);
    res.json({
      heist: {
        ...h,
        prize_image: absUrl(req, h.prize_image),
        question_variants: variants,
        variants_count: Array.isArray(variants) ? variants.length : 0,
      },
    });
  } catch (err) {
    console.error("admin get heist error:", err);
    res.status(500).json({ message: "Error fetching heist", error: err.message });
  }
});
// admin create heist with optional CopUpBot Q/A generation from story
router.post("/heists",authenticateToken,authenticateAdmin,
  upload.single("prize_image"),
  async (req, res) => {
    try {
      const body = req.body || {};

      const name = body.name;
      const story = body.story ?? "";

      const min_users = body.min_users;
      const ticket_price = body.ticket_price;
      const prize = body.prize;
      const prize_name = body.prize_name ?? "";
      const countdown_duration_minutes = body.countdown_duration_minutes ?? 10;
      const retry_ticket_price = body.retry_ticket_price ?? 0;

      const auto_generate_questions =
        body.auto_generate_questions === undefined
          ? true
          : String(body.auto_generate_questions).toLowerCase() !== "false";

      const questions_count = Number(body.questions_count || 6);

      let prize_image = null;
      if (req.file?.filename) {
        prize_image = `/uploads/${req.file.filename}`;
      } else if (body.prize_image) {
        prize_image = String(body.prize_image);
      }

      if (!name) return res.status(400).json({ message: "name is required" });

      const minUsers = Number(min_users);
      const ticketPrice = Number(ticket_price);
      const prizeVal = Number(prize);
      const durationMins = Number(countdown_duration_minutes);
      const retryCost = Number(retry_ticket_price);

      if (!Number.isInteger(minUsers) || minUsers < 1)
        return res.status(400).json({ message: "min_users must be >= 1" });

      if (!Number.isInteger(ticketPrice) || ticketPrice < 0)
        return res.status(400).json({ message: "ticket_price must be >= 0" });

      if (!Number.isInteger(prizeVal) || prizeVal < 0)
        return res.status(400).json({ message: "prize must be >= 0" });

      if (!Number.isInteger(durationMins) || durationMins < 1)
        return res.status(400).json({ message: "countdown_duration_minutes must be >= 1" });

      if (!Number.isInteger(retryCost) || retryCost < 0)
        return res.status(400).json({ message: "retry_ticket_price must be >= 0" });

      let variantsObj = null;

      if (body.question_variants !== undefined && body.question_variants !== null && body.question_variants !== "") {
        const parsed = safeJsonParse(body.question_variants, body.question_variants);
        variantsObj = Array.isArray(parsed) ? parsed : null;

        if (!variantsObj || !variantsObj.length) {
          return res.status(400).json({ message: "question_variants must be a non-empty array" });
        }
      } else if (auto_generate_questions) {
        variantsObj = await generateVariantsFromStory(story, questions_count);
      }

      let variantsJson = null;
      if (variantsObj) {
        const normalized = enforceOneWordVariants(variantsObj);

        if (!normalized.length) {
          return res.status(400).json({ message: "question_variants must produce valid items" });
        }

        for (const v of normalized) {
          if (!v || !v.question || !v.answer) {
            return res.status(400).json({ message: "Each variant must have question + answer" });
          }
        }

        variantsObj = normalized;
        variantsJson = JSON.stringify(variantsObj);
      }

      const [result] = await pool.query(
        `
        INSERT INTO heist
          (name, story, min_users, ticket_price, prize, status,
           prize_name, prize_image,
           countdown_duration_minutes, retry_ticket_price, question_variants,
           submissions_locked)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, 0)
        `,
        [
          name,
          story,
          minUsers,
          ticketPrice,
          prizeVal,
          prize_name,
          prize_image,
          durationMins,
          retryCost,
          variantsJson,
        ]
      );

      return res.status(201).json({
        message: "Heist created successfully.",
        id: result.insertId,
        prize_image: absUrl(req, prize_image),
        variants_count: variantsObj ? variantsObj.length : 0,
        copupbot: variantsObj ? "generated" : "none",
        ai_used: openaiConfigured(),
      });
    } catch (err) {
      console.error("admin create heist error:", err);
      res.status(500).json({ message: "Error creating heist", error: err.message });
    }
  }
);
/** * ✅ POST /heists/:id/generate-qa */
router.post("/heists/:id/generate-qa",authenticateToken,authenticateAdmin,
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid id" });

    try {
      const { mode = "replace", questions_count = 6 } = req.body || {};

      const [rows] = await pool.query(
        "SELECT id, story, question_variants FROM heist WHERE id = ? LIMIT 1",
        [id]
      );
      const h = rows[0];
      if (!h) return res.status(404).json({ message: "Heist not found" });

      const story = String(h.story || "").trim();
      if (!story) {
        return res.status(400).json({ message: "Heist has no story to generate questions from." });
      }

      const newVariants = enforceOneWordVariants(
        await generateVariantsFromStory(story, Number(questions_count || 6))
      );

      const current = safeJsonParse(h.question_variants, []);
      const combined =
        String(mode).toLowerCase() === "append"
          ? enforceOneWordVariants([...(Array.isArray(current) ? current : []), ...newVariants])
          : newVariants;

      await pool.query(
        "UPDATE heist SET question_variants = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [JSON.stringify(combined), id]
      );

      res.json({
        message: "CopUpBot generated questions successfully.",
        heistId: id,
        mode,
        ai_used: openaiConfigured(),
        variants_count: combined.length,
        question_variants: combined,
      });
    } catch (err) {
      console.error("admin generate-qa error:", err);
      res.status(500).json({ message: "Error generating questions", error: err.message });
    }
  }
);
/** * ✅ PUT /heists/:id */
router.put("/heists/:id",authenticateToken,authenticateAdmin,
  upload.single("prize_image"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid id" });

    try {
      const body = req.body || {};

      const fields = [];
      const params = [];

      if (body.name !== undefined) {
        fields.push("name = ?");
        params.push(body.name);
      }
      if (body.story !== undefined) {
        fields.push("story = ?");
        params.push(body.story);
      }

      if (body.min_users !== undefined) {
        const v = Number(body.min_users);
        if (!Number.isInteger(v) || v < 1) return res.status(400).json({ message: "min_users must be >= 1" });
        fields.push("min_users = ?");
        params.push(v);
      }

      if (body.ticket_price !== undefined) {
        const v = Number(body.ticket_price);
        if (!Number.isInteger(v) || v < 0) return res.status(400).json({ message: "ticket_price must be >= 0" });
        fields.push("ticket_price = ?");
        params.push(v);
      }

      if (body.prize !== undefined) {
        const v = Number(body.prize);
        if (!Number.isInteger(v) || v < 0) return res.status(400).json({ message: "prize must be >= 0" });
        fields.push("prize = ?");
        params.push(v);
      }

      if (body.retry_ticket_price !== undefined) {
        const v = Number(body.retry_ticket_price);
        if (!Number.isInteger(v) || v < 0) return res.status(400).json({ message: "retry_ticket_price must be >= 0" });
        fields.push("retry_ticket_price = ?");
        params.push(v);
      }

      if (body.countdown_duration_minutes !== undefined) {
        const v = Number(body.countdown_duration_minutes);
        if (!Number.isInteger(v) || v < 1) return res.status(400).json({ message: "countdown_duration_minutes must be >= 1" });
        fields.push("countdown_duration_minutes = ?");
        params.push(v);
      }

      if (body.prize_name !== undefined) {
        fields.push("prize_name = ?");
        params.push(body.prize_name);
      }

      if (req.file?.filename) {
        const p = `/uploads/${req.file.filename}`;
        fields.push("prize_image = ?");
        params.push(p);
      } else if (body.prize_image !== undefined) {
        fields.push("prize_image = ?");
        params.push(body.prize_image);
      }

      if (String(body.remove_prize_image || "") === "1") {
        fields.push("prize_image = ?");
        params.push(null);
      }

      if (body.status !== undefined) {
        const s = String(body.status).toLowerCase();
        if (!["pending", "hold", "started", "completed"].includes(s)) {
          return res.status(400).json({ message: "Invalid status" });
        }
        fields.push("status = ?");
        params.push(s);
      }

      if (body.submissions_locked !== undefined) {
        fields.push("submissions_locked = ?");
        params.push(body.submissions_locked ? 1 : 0);
      }

      if (body.question_variants !== undefined) {
        const variantsObj = safeJsonParse(body.question_variants, null);
        if (!Array.isArray(variantsObj) || !variantsObj.length) {
          return res.status(400).json({ message: "question_variants must be a non-empty JSON array" });
        }

        const normalized = enforceOneWordVariants(variantsObj);
        if (!normalized.length) {
          return res.status(400).json({ message: "question_variants must contain valid items" });
        }

        fields.push("question_variants = ?");
        params.push(JSON.stringify(normalized));
      }

      if (!fields.length) return res.status(400).json({ message: "No fields to update" });

      fields.push("updated_at = CURRENT_TIMESTAMP");

      const [result] = await pool.query(`UPDATE heist SET ${fields.join(", ")} WHERE id = ?`, [
        ...params,
        id,
      ]);

      if (!result.affectedRows) return res.status(404).json({ message: "Heist not found" });

      const [rows] = await pool.query("SELECT * FROM heist WHERE id = ? LIMIT 1", [id]);
      const h = rows[0];

      res.json({
        message: "Heist updated successfully.",
        heist: {
          ...h,
          prize_image: absUrl(req, h?.prize_image),
          question_variants: safeJsonParse(h?.question_variants, []),
        },
      });
    } catch (err) {
      console.error("admin update heist error:", err);
      res.status(500).json({ message: "Error updating heist", error: err.message });
    }
  }
);
/** * DELETE /heists/:heistId */
router.delete("/heists/:heistId", authenticateToken, authenticateAdmin, async (req, res) => {
  const heistId = Number(req.params.heistId);
  if (!Number.isInteger(heistId) || heistId <= 0) return res.status(400).json({ message: "Invalid heistId" });

  try {
    const [rows] = await pool.query("SELECT id, status FROM heist WHERE id = ? LIMIT 1", [heistId]);
    const heist = rows[0];
    if (!heist) return res.status(404).json({ message: "Heist not found" });

    if (heist.status !== "pending") {
      return res.status(400).json({ message: "Only pending heists can be deleted." });
    }

    await pool.query("DELETE FROM heist WHERE id = ?", [heistId]);
    res.json({ message: "Heist deleted successfully." });
  } catch (err) {
    console.error("admin delete heist error:", err);
    res.status(500).json({ message: "Error deleting heist", error: err.message });
  }
});
/** * POST /heists/:id/start */
router.post("/heists/:id/start", authenticateToken, authenticateAdmin, async (req, res) => {
  const heistId = Number(req.params.id);
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
      return res.status(400).json({ message: "Heist already completed" });
    }

    if (!heist.countdown_started_at) {
      const startedAt = nowSql();
      const endsAt = addMinutesSql(Number(heist.countdown_duration_minutes || 10));

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
    } else {
      await conn.query("UPDATE heist SET status = 'started' WHERE id = ?", [heistId]);
    }

    await conn.commit();
    res.json({ message: "Heist started." });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    console.error("admin start heist error:", err);
    res.status(500).json({ message: "Error starting heist", error: err.message });
  } finally {
    conn.release();
  }
});
/** * POST /heists/:id/end*/
router.post("/heists/:id/end", authenticateToken, authenticateAdmin, async (req, res) => {
  const heistId = Number(req.params.id);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [hRows] = await conn.query("SELECT * FROM heist WHERE id = ? FOR UPDATE", [heistId]);
    const heist = hRows[0];
    if (!heist) {
      await conn.rollback();
      return res.status(404).json({ message: "Heist not found" });
    }

    await conn.query(
      "UPDATE heist SET submissions_locked = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [heistId]
    );

    const fin = await finalizeHeistIfEnded(conn, heistId);

    await conn.commit();
    res.json({
      message: "Heist ended and finalized.",
      winner_id: fin.heist?.winner_id || null,
      status: fin.heist?.status || "completed",
    });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    console.error("admin end heist error:", err);
    res.status(500).json({ message: "Error ending heist", error: err.message });
  } finally {
    conn.release();
  }
});
/** * GET /heists/:id/leaderboard */
router.get("/heists/:id/leaderboard", authenticateToken, authenticateAdmin, async (req, res) => {
  const heistId = Number(req.params.id);

  try {
    const [rows] = await pool.query(
      `
      SELECT
        a.user_id,
        MIN(CASE WHEN a.is_correct = 1 THEN a.total_time_seconds END) AS best_time,
        COUNT(*) AS attempts_count,
        SUM(a.is_correct = 1) AS correct_attempts
      FROM heist_attempts a
      WHERE a.heist_id = ?
      GROUP BY a.user_id
      ORDER BY
        (SUM(a.is_correct = 1) > 0) DESC,
        best_time ASC,
        attempts_count ASC
      LIMIT 200
      `,
      [heistId]
    );

    res.json({
      heistId,
      data: rows.map((r) => ({
        user_id: r.user_id,
        best_time: r.best_time != null ? Number(r.best_time) : null,
        attempts_count: Number(r.attempts_count || 0),
        correct_attempts: Number(r.correct_attempts || 0),
      })),
    });
  } catch (err) {
    console.error("admin leaderboard error:", err);
    res.status(500).json({ message: "Error fetching admin leaderboard", error: err.message });
  }
});
/** * GET /heists/:id/attempts */
router.get("/heists/:id/attempts", authenticateToken, authenticateAdmin, async (req, res) => {
  const heistId = Number(req.params.id);
  const { page = 1, limit = 50 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const lim = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * lim;

  try {
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM heist_attempts WHERE heist_id = ?`, [
      heistId,
    ]);

    const [rows] = await pool.query(
      `
      SELECT
        id, heist_id, user_id,
        question_variant, correct_answer, submitted_answer,
        is_correct, start_time, end_time, total_time_seconds, created_at
      FROM heist_attempts
      WHERE heist_id = ?
      ORDER BY id DESC
      LIMIT ? OFFSET ?
      `,
      [heistId, lim, offset]
    );

    res.json({ page: pageNum, limit: lim, total, data: rows });
  } catch (err) {
    console.error("admin attempts error:", err);
    res.status(500).json({ message: "Error fetching attempts", error: err.message });
  }
});


/* ─────────── Admin: Add MANY cop demo users to a heist using range/count ─────────── */
router.post("/heists/:id/add-cop-users", authenticateToken, authenticateAdmin,
  async (req, res) => {
    const heistId = Number(req.params.id);

    if (!Number.isInteger(heistId) || heistId <= 0) {
      return res.status(400).json({ message: "Invalid heist id" });
    }

    // parse input
    const body = req.body || {};
    const from = body.from !== undefined ? Number(body.from) : null;
    const to = body.to !== undefined ? Number(body.to) : null;
    const count = body.count !== undefined ? Number(body.count) : null;
    const numbersRaw = Array.isArray(body.numbers) ? body.numbers : null;

    let numbers = [];

    if (numbersRaw && numbersRaw.length) {
      numbers = numbersRaw.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
    } else if (from !== null && to !== null) {
      if (!Number.isInteger(from) || !Number.isInteger(to) || from <= 0 || to <= 0 || to < from) {
        return res.status(400).json({ message: "Invalid range. Use { from: 2, to: 5 }" });
      }
      for (let i = from; i <= to; i++) numbers.push(i);
    } else if (count !== null) {
      if (!Number.isInteger(count) || count <= 0) {
        return res.status(400).json({ message: "Invalid count. Use { count: 5 }" });
      }
      // default: 1..count
      for (let i = 1; i <= count; i++) numbers.push(i);
    } else {
      return res.status(400).json({
        message: "Provide {count} OR {from,to} OR {numbers:[...]}.",
      });
    }

    // limit safety
    if (numbers.length > 100) {
      return res.status(400).json({ message: "Too many cop users requested (max 100)." });
    }

    // make unique, sorted
    numbers = Array.from(new Set(numbers)).sort((a, b) => a - b);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // heist exists?
      const [hRows] = await conn.query("SELECT id FROM heist WHERE id = ? LIMIT 1", [heistId]);
      if (!hRows.length) {
        await conn.rollback();
        return res.status(404).json({ message: "Heist not found" });
      }

      const created = [];
      const joined = [];
      const skipped = [];

      for (const n of numbers) {
        // ids like cop_2, cop_5, etc
        const copId = `cop_${n}`;
        const username = `cop${String(n).padStart(3, "0")}`; // cop002, cop005...
        const fullName = `Cop Player ${n}`;

        // ensure demo user exists
        const [dExists] = await conn.query("SELECT id FROM demo_users WHERE id = ? LIMIT 1", [copId]);
        if (!dExists.length) {
          await conn.query(
            "INSERT INTO demo_users (id, username, full_name, avatar) VALUES (?, ?, ?, ?)",
            [copId, username, fullName, null]
          );
          created.push(copId);
        }

        // already joined?
        const [pRows] = await conn.query(
          "SELECT 1 FROM heist_participants WHERE heist_id = ? AND user_id = ? LIMIT 1",
          [heistId, copId]
        );
        if (pRows.length) {
          skipped.push(copId);
          continue;
        }

        await conn.query(
          "INSERT INTO heist_participants (heist_id, user_id) VALUES (?, ?)",
          [heistId, copId]
        );
        joined.push(copId);
      }

      await conn.commit();

      return res.status(201).json({
        message: "Cop users processed successfully.",
        heist_id: heistId,
        requested_numbers: numbers,
        created_count: created.length,
        joined_count: joined.length,
        skipped_count: skipped.length,
        created_ids: created,
        joined_ids: joined,
        skipped_ids: skipped,
      });
    } catch (error) {
      await conn.rollback();
      console.error("Error adding cop users to heist:", error);
      return res.status(500).json({ message: "Internal server error", error: error.message });
    } finally {
      conn.release();
    }
  }
);
/* ───────────── Admin: Create cop user (marketing/testing) ───────────── */
router.post("/demo-users",authenticateToken,authenticateAdmin,
  imageUpload.single("avatar"),
  async (req, res) => {
    try {
      const { username, full_name, demo_user_id } = req.body || {};

      if (!username || !full_name) {
        return res.status(400).json({
          message: "username and full_name are required",
        });
      }

      const id =
        demo_user_id && String(demo_user_id).startsWith("cop_")
          ? String(demo_user_id)
          : `cop_${Date.now()}`;

      // Ensure unique id
      const [exists] = await pool.query(
        "SELECT id FROM demo_users WHERE id = ? LIMIT 1",
        [id]
      );
      if (exists.length) {
        return res.status(400).json({
          message: "Cop user ID already exists",
        });
      }

      const avatarPath = req.file ? `uploads/${req.file.filename}` : null;

      await pool.query(
        `INSERT INTO demo_users (id, username, full_name, avatar)
         VALUES (?, ?, ?, ?)`,
        [
          id,
          String(username).trim(),
          String(full_name).trim(),
          avatarPath,
        ]
      );

      return res.status(201).json({
        message: "Cop user created successfully.",
        demo_user: {
          id,
          username: String(username).trim(),
          full_name: String(full_name).trim(),
          avatar: absUrl(req, avatarPath),
          is_demo: true,
        },
      });
    } catch (error) {
      console.error("Error creating cop user:", error);
      return res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);
/* ───────────── Admin: List demo users ───────────── */
router.get("/demo-users",authenticateToken,authenticateAdmin,
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, username, full_name, avatar, created_at
           FROM demo_users
           ORDER BY created_at DESC`
      );

      const data = rows.map(r => ({
        ...r,
        avatar: absUrl(req, r.avatar),
        is_demo: true,
      }));

      res.json({ data });
    } catch (error) {
      console.error("Error listing demo users:", error);
      res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);
/* ───────────── Admin: Get cop user by ID ───────────── */
router.get("/demo-users/:id", authenticateToken, authenticateAdmin,
  async (req, res) => {
    try {
      const id = String(req.params.id || "").trim();

      if (!id.startsWith("cop_")) {
        return res.status(400).json({
          message: "Invalid cop user id",
        });
      }

      const [rows] = await pool.query(
        `SELECT id, username, full_name, avatar, created_at
           FROM demo_users
           WHERE id = ?
           LIMIT 1`,
        [id]
      );

      if (!rows.length) {
        return res.status(404).json({
          message: "Cop user not found",
        });
      }

      const user = rows[0];

      return res.json({
        demo_user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          avatar: absUrl(req, user.avatar),
          created_at: user.created_at,
          is_demo: true, // you can rename later if you want
        },
      });
    } catch (error) {
      console.error("Error fetching cop user:", error);
      res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);
/* ───────────── Admin: Update cop user ───────────── */
router.put("/demo-users/:id",authenticateToken,authenticateAdmin,
  imageUpload.single("avatar"),
  async (req, res) => {
    try {
      const id = String(req.params.id || "").trim();
      const { username, full_name } = req.body || {};

      // Validate cop user id
      if (!id.startsWith("cop_")) {
        return res.status(400).json({
          message: "Invalid cop user id",
        });
      }

      if (!username || !full_name) {
        return res.status(400).json({
          message: "username and full_name are required",
        });
      }

      // Ensure cop user exists
      const [rows] = await pool.query(
        "SELECT avatar FROM demo_users WHERE id = ? LIMIT 1",
        [id]
      );
      if (!rows.length) {
        return res.status(404).json({
          message: "Cop user not found",
        });
      }

      const existingAvatar = rows[0].avatar;
      const avatarPath = req.file
        ? `uploads/${req.file.filename}`
        : existingAvatar;

      await pool.query(
        `UPDATE demo_users
            SET username = ?, full_name = ?, avatar = ?
          WHERE id = ?`,
        [
          String(username).trim(),
          String(full_name).trim(),
          avatarPath,
          id,
        ]
      );

      return res.json({
        message: "Cop user updated successfully.",
        demo_user: {
          id,
          username: String(username).trim(),
          full_name: String(full_name).trim(),
          avatar: absUrl(req, avatarPath),
          is_demo: true, // keep for compatibility
        },
      });
    } catch (error) {
      console.error("Error updating cop user:", error);
      return res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);
/* ───────────── Admin: Delete demo (cop) user ───────────── */
router.delete("/demo-users/:id",authenticateToken, authenticateAdmin,
  async (req, res) => {
    try {
      const id = String(req.params.id || "").trim();

      if (!id.startsWith("cop_")) {
        return res.status(400).json({
          message: "Invalid cop user id",
        });
      }

      // Exists?
      const [rows] = await pool.query(
        "SELECT id FROM demo_users WHERE id = ? LIMIT 1",
        [id]
      );
      if (!rows.length) {
        return res.status(404).json({
          message: "Cop user not found",
        });
      }

      // Is user used in any heist?
      const [[usage]] = await pool.query(
        `
        SELECT
          EXISTS(SELECT 1 FROM heist_participants WHERE user_id = ?) AS in_participants,
          EXISTS(SELECT 1 FROM heist WHERE winner_id = ?) AS is_winner
        `,
        [id, id]
      );

      if (usage.in_participants || usage.is_winner) {
        return res.status(400).json({
          message:
            "Cannot delete this cop user because it is already used in heists.",
        });
      }

      await pool.query("DELETE FROM demo_users WHERE id = ?", [id]);

      return res.json({
        message: "Cop user deleted successfully.",
        id,
      });
    } catch (error) {
      console.error("Error deleting cop user:", error);
      return res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);
/* ───────────── Admin: Force delete demo (cop) user ───────────── */
router.delete("/demo-users/:id/force",authenticateToken,authenticateAdmin,
  async (req, res) => {
    try {
      const id = String(req.params.id || "").trim();

      if (!id.startsWith("cop_")) {
        return res.status(400).json({
          message: "Invalid cop user id",
        });
      }

      // Exists?
      const [rows] = await pool.query(
        "SELECT id FROM demo_users WHERE id = ? LIMIT 1",
        [id]
      );
      if (!rows.length) {
        return res.status(404).json({
          message: "Cop user not found",
        });
      }

      // Remove from participants
      await pool.query(
        "DELETE FROM heist_participants WHERE user_id = ?",
        [id]
      );

      // Remove as winner
      await pool.query(
        "UPDATE heist SET winner_id = NULL WHERE winner_id = ?",
        [id]
      );

      // Delete user
      await pool.query("DELETE FROM demo_users WHERE id = ?", [id]);

      return res.json({
        message: "Cop user force-deleted successfully.",
        id,
      });
    } catch (error) {
      console.error("Error force-deleting cop user:", error);
      return res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  }
);
/* ----------------------- Admin: Set heist winner ----------------------- */
router.post("/heists/:id/set-winner", authenticateToken, authenticateAdmin,
  async (req, res) => {
    try {
      const heistId = Number(req.params.id);
      const { winner_id } = req.body || {};

      if (!Number.isInteger(heistId) || heistId <= 0) {
        return res.status(400).json({ message: "Invalid heist id" });
      }
      if (winner_id === undefined || winner_id === null || String(winner_id).trim() === "") {
        return res.status(400).json({ message: "winner_id is required" });
      }

      const winnerIdStr = String(winner_id).trim();

      // heist exists?
      const [hRows] = await pool.query(
        "SELECT id, status FROM heist WHERE id = ? LIMIT 1",
        [heistId]
      );
      if (!hRows.length) return res.status(404).json({ message: "Heist not found" });

      // Validate winner exists (users OR demo_users)
      let winner = null;

      if (isCopId(winnerIdStr)) {
        const [dRows] = await pool.query(
          "SELECT id, username, full_name, avatar FROM demo_users WHERE id = ? LIMIT 1",
          [winnerIdStr]
        );
        if (!dRows.length) return res.status(404).json({ message: "Cop winner not found." });

        const d = dRows[0];
        winner = {
          id: d.id,
          username: d.username,
          full_name: d.full_name,
          avatar: absUrl(req, d.avatar),
          is_demo: true,
        };
      } else if (isNumericId(winnerIdStr)) {
        const uid = Number(winnerIdStr);
        const [uRows] = await pool.query(
          "SELECT id, username FROM users WHERE id = ? LIMIT 1",
          [uid]
        );
        if (!uRows.length) return res.status(404).json({ message: "Winner user not found." });

        const u = uRows[0];
        winner = {
          id: u.id,
          username: u.username,
          full_name: null,
          avatar: null,
          is_demo: false,
        };
      } else {
        return res.status(400).json({ message: "winner_id must be a numeric user id or cop_***" });
      }

      // Ensure winner is a participant (keeps data consistent)
      const [pRows] = await pool.query(
        "SELECT 1 FROM heist_participants WHERE heist_id = ? AND user_id = ? LIMIT 1",
        [heistId, winnerIdStr]
      );
      if (!pRows.length) {
        await pool.query(
          "INSERT INTO heist_participants (heist_id, user_id) VALUES (?, ?)",
          [heistId, winnerIdStr]
        );
      }

      // Set winner + complete
      await pool.query(
        `UPDATE heist
            SET winner_id = ?, status = 'completed', updated_at = NOW()
          WHERE id = ?`,
        [winnerIdStr, heistId]
      );

      return res.status(200).json({
        message: "Winner set successfully.",
        heist_id: heistId,
        winner_id: winnerIdStr,
        winner,
      });
    } catch (error) {
      console.error("Error setting heist winner:", error);
      return res.status(500).json({ message: "Internal server error", error: error.message });
    }
  }
);


/* ---------------------------- Get / Set coin rate ---------------------------- */
router.get("/coin-rate", authenticateToken, authenticateAdmin, async (req, res) => {
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
// PUT /api/admin/coin-rate  { unit_price, currency? }
router.put("/coin-rate", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const unit = Number(req.body?.unit);
    const price = Number(req.body?.price);
    const currency = (req.body?.currency || "USD").toUpperCase();

    if (!(unit > 0)) {
      return res.status(400).json({ message: "unit must be a positive number" });
    }
    if (!(price > 0)) {
      return res.status(400).json({ message: "price must be a positive number" });
    }

    await pool.query(
      `INSERT INTO coin_rate (id, unit, price, currency)
       VALUES (1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         unit = VALUES(unit),
         price = VALUES(price),
         currency = VALUES(currency)`,
      [unit, price, currency]
    );

    res.json({
      message: "Coin rate updated",
      unit,
      price,
      currency
    });

  } catch (err) {
    console.error("set coin rate error:", err);
    res.status(500).json({ message: "Error updating coin rate" });
  }
});


/* -------------------------------  GET /api/admin/copup-topups -------------------------------------------- */
router.get("/copup-topups", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const status = req.query.status;

    let query = `
      SELECT 
        c.id,
        c.user_id,
        u.full_name,
        u.username,
        u.email,
        c.tx_ref,
        c.flw_tx_id,
        c.amount,
        c.currency,
        c.copup_coin,
        c.status,
        c.created_at
      FROM copup_topups c
      LEFT JOIN users u ON u.id = c.user_id
    `;

    const values = [];

    if (status) {
      query += " WHERE c.status = ?";
      values.push(status);
    }

    query += " ORDER BY c.id DESC";

    const [rows] = await pool.query(query, values);

    res.json({ ok: true, topups: rows });

  } catch (err) {
    console.error("Admin get topups error:", err);
    res.status(500).json({ ok: false, message: "Error fetching topups" });
  }
});
/* -------------------------------  GET /api/admin/copup-topups/:id -------------------------------------------- */
router.get("/copup-topups/:id", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    const [[topup]] = await pool.query(
      `SELECT 
          c.*,
          u.full_name,
          u.username,
          u.email
       FROM copup_topups c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.id = ?
       LIMIT 1`,
      [id]
    );

    if (!topup) {
      return res.status(404).json({ ok: false, message: "Top-up not found" });
    }

    res.json({ ok: true, topup });

  } catch (err) {
    console.error("Admin get single topup error:", err);
    res.status(500).json({ ok: false, message: "Error fetching topup" });
  }
});
/* ------------------------------- DELETE /api/admin/copup-topups/:id -------------------------------------------- */
router.delete("/copup-topups/:id", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    const [del] = await pool.query(
      "DELETE FROM copup_topups WHERE id = ?",
      [id]
    );

    if (del.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: "Top-up not found" });
    }

    res.json({ ok: true, message: "Top-up deleted successfully" });

  } catch (err) {
    console.error("Admin delete topup error:", err);
    res.status(500).json({ ok: false, message: "Error deleting topup" });
  }
});

/* ------------------------ Review & approve/reject ------------------------ */
router.get("/coin-purchases", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { status, userId } = req.query;
    const where = [];
    const params = [];
    if (status && ["pending","approved","rejected"].includes(String(status))) {
      where.push("p.status = ?");
      params.push(String(status));
    }
    if (userId && Number.isInteger(Number(userId))) {
      where.push("p.user_id = ?");
      params.push(Number(userId));
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT p.id, p.user_id, u.username, u.email,
              p.coins, p.unit_price, p.total_price,
              p.proof_image, p.user_note, p.admin_note,
              p.status, p.approved_at, p.created_at, p.updated_at
         FROM coin_purchases p
         JOIN users u ON u.id = p.user_id
        ${whereSql}
        ORDER BY p.id DESC`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error("admin list coin purchases error:", err);
    res.status(500).json({ message: "Error fetching coin purchases" });
  }
});
// PATCH /api/admin/coin-purchases/:id  { action: 'approve'|'reject', admin_note? }
router.patch("/coin-purchases/:id", authenticateToken, authenticateAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid purchase id" });
  }
  const action = String(req.body?.action || "").toLowerCase();
  const admin_note = req.body?.admin_note || null;
  if (!["approve","reject"].includes(action)) {
    return res.status(400).json({ message: "action must be 'approve' or 'reject'" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT id, user_id, coins, status
         FROM coin_purchases
        WHERE id = ?
        FOR UPDATE`,
      [id]
    );
    const p = rows[0];
    if (!p) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: "Purchase not found" });
    }

    if (action === "approve") {
      if (p.status !== "pending") {
        await conn.rollback();
        conn.release();
        return res.status(409).json({ message: `Cannot approve from status '${p.status}'` });
      }
      // Top-up user coins (bid_points)
      await conn.query("UPDATE users SET bid_points = bid_points + ? WHERE id = ?", [p.coins, p.user_id]);

      await conn.query(
        `UPDATE coin_purchases
            SET status='approved', admin_note=?, approved_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
          WHERE id = ?`,
        [admin_note, id]
      );
    } else {
      if (p.status !== "pending") {
        await conn.rollback();
        conn.release();
        return res.status(409).json({ message: `Cannot reject from status '${p.status}'` });
      }
      await conn.query(
        `UPDATE coin_purchases
            SET status='rejected', admin_note=?, updated_at=CURRENT_TIMESTAMP
          WHERE id = ?`,
        [admin_note, id]
      );
    }

    const [[out]] = await conn.query("SELECT * FROM coin_purchases WHERE id = ?", [id]);
    await conn.commit();
    conn.release();
    res.json(out);
  } catch (err) {
    try { await conn.rollback(); } catch {}
    conn.release();
    console.error("admin approve/reject coin purchase error:", err);
    res.status(500).json({ message: "Error updating purchase" });
  }
});

/* ───────────────────────── LIST PAYOUTS (admin) ───────────────────────── */
router.get("/payouts", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.query; // optional
    const allowed = new Set(["pending", "approved", "rejected"]);

    let sql = `
      SELECT p.id, p.user_id, u.username, u.email,
             p.bid_points, p.account_name, p.account_number, p.bank_name,
             p.status, p.admin_note,
             p.created_at, p.updated_at
        FROM payouts p
        JOIN users u ON u.id = p.user_id
    `;
    const params = [];
    if (status && allowed.has(String(status))) {
      sql += " WHERE p.status = ?";
      params.push(status);
    }
    sql += " ORDER BY p.id DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("admin list payouts error:", err);
    res.status(500).json({ message: "Error listing payouts" });
  }
});
/* ─────────────────── APPROVE / REJECT A PAYOUT (admin) ─────────────────── */
router.patch("/payouts/:payoutId", authenticateToken, authenticateAdmin, async (req, res) => {
  const payoutId = Number(req.params.payoutId);
  if (!Number.isInteger(payoutId) || payoutId <= 0) {
    return res.status(400).json({ message: "Invalid payout id" });
  }

  const { action, admin_note } = req.body || {};
  if (!["approve", "reject"].includes(String(action))) {
    return res.status(400).json({ message: "action must be 'approve' or 'reject'" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock payout row
    const [rows] = await conn.query(
      `SELECT id, user_id, bid_points, status
         FROM payouts
        WHERE id = ?
        FOR UPDATE`,
      [payoutId]
    );
    const p = rows[0];
    if (!p) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: "Payout not found" });
    }
    if (p.status !== "pending") {
      await conn.rollback();
      conn.release();
      return res.status(409).json({ message: "Only pending payouts can be updated" });
    }

    if (action === "approve") {
      await conn.query(
        `UPDATE payouts
            SET status = 'approved',
                admin_note = ?,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [admin_note || null, payoutId]
      );

      await conn.commit();
      conn.release();

      // Telegram notify (optional)
      const msg =
        `<b>Payout Approved</b>\n` +
        `<b>Payout ID:</b> ${payoutId}\n` +
        `<b>User ID:</b> ${p.user_id}\n` +
        `<b>Bid Points:</b> ${p.bid_points}`;
      Promise.allSettled(
        ["6112214313", "7357781470"].map((id) => sendTelegramNotification(id, msg))
      ).catch((e) => console.error("telegram notify error:", e.message));

      return res.json({ message: "Payout approved", payoutId, status: "approved" });
    }

    // action === "reject" → refund the reserved points
    await conn.query(
      "UPDATE users SET bid_points = bid_points + ? WHERE id = ?",
      [p.bid_points, p.user_id]
    );
    await conn.query(
      `UPDATE payouts
          SET status = 'rejected',
              admin_note = ?,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [admin_note || null, payoutId]
    );

    await conn.commit();
    conn.release();

    // Telegram notify (optional)
    const msg =
      `<b>Payout Rejected & Refunded</b>\n` +
      `<b>Payout ID:</b> ${payoutId}\n` +
      `<b>User ID:</b> ${p.user_id}\n` +
      `<b>Refunded:</b> ${p.bid_points} coin(s)`;
    Promise.allSettled(
      ["6112214313", "7357781470"].map((id) => sendTelegramNotification(id, msg))
    ).catch((e) => console.error("telegram notify error:", e.message));

    return res.json({
      message: "Payout rejected and refunded",
      payoutId,
      status: "rejected",
      refunded: p.bid_points,
    });
  } catch (err) {
    try { await pool.query("ROLLBACK"); } catch {}
    conn.release();
    console.error("admin payout update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});


// pay account 
router.get("/pay-account", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, bank_name, account_name, account_number, currency, is_active, notes, updated_by, updated_at
         FROM pay_account
        WHERE id = 1`
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Pay account not configured" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("get pay-account error:", err);
    res.status(500).json({ message: "Error fetching pay account" });
  }
});
/** update pay account */
router.patch("/pay-account", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { bank_name, account_name, account_number, currency, is_active, notes } = req.body || {};

    // Validate per-field IF provided
    if (bank_name !== undefined && !String(bank_name).trim()) {
      return res.status(400).json({ message: "bank_name cannot be empty" });
    }
    if (account_name !== undefined && !String(account_name).trim()) {
      return res.status(400).json({ message: "account_name cannot be empty" });
    }
    if (account_number !== undefined && !/^[0-9A-Za-z\-\s]{5,40}$/.test(String(account_number))) {
      return res.status(400).json({ message: "Invalid account_number format" });
    }
    if (currency !== undefined && !/^[A-Z]{3}$/.test(String(currency))) {
      return res.status(400).json({ message: "currency must be a 3-letter code (e.g., NGN, USD)" });
    }
    let activeVal = null;
    if (is_active !== undefined) {
      if (typeof is_active === "boolean") activeVal = is_active ? 1 : 0;
      else if (String(is_active) === "1" || String(is_active) === "0") activeVal = Number(is_active);
      else return res.status(400).json({ message: "is_active must be boolean or 0/1" });
    }

    // Does row exist?
    const [[{ c }]] = await pool.query("SELECT COUNT(*) AS c FROM pay_account WHERE id = 1");

    // If not exists, require the core fields to initialize
    if (!c) {
      if (!bank_name || !account_name || !account_number) {
        return res.status(400).json({
          message: "First-time setup requires bank_name, account_name and account_number",
        });
      }

      await pool.query(
        `INSERT INTO pay_account
           (id, bank_name, account_name, account_number, currency, is_active, notes, updated_by)
         VALUES
           (1, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(bank_name).trim(),
          String(account_name).trim(),
          String(account_number).trim(),
          (currency ? String(currency).toUpperCase() : "NGN"),
          (activeVal === null ? 1 : activeVal),
          (notes !== undefined ? String(notes) : null),
          req.user.id,
        ]
      );
    } else {
      // Row exists -> update only provided fields
      const sets = [];
      const params = [];

      if (bank_name !== undefined) {
        sets.push("bank_name = ?");
        params.push(String(bank_name).trim());
      }
      if (account_name !== undefined) {
        sets.push("account_name = ?");
        params.push(String(account_name).trim());
      }
      if (account_number !== undefined) {
        sets.push("account_number = ?");
        params.push(String(account_number).trim());
      }
      if (currency !== undefined) {
        sets.push("currency = ?");
        params.push(String(currency).toUpperCase());
      }
      if (activeVal !== null) {
        sets.push("is_active = ?");
        params.push(activeVal);
      }
      if (notes !== undefined) {
        sets.push("notes = ?");
        params.push(String(notes));
      }

      if (!sets.length) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      sets.push("updated_by = ?");
      params.push(req.user.id);
      sets.push("updated_at = CURRENT_TIMESTAMP");

      const sql = `UPDATE pay_account SET ${sets.join(", ")} WHERE id = 1`;
      await pool.query(sql, params);
    }

    // Return updated row
    const [out] = await pool.query(
      `SELECT id, bank_name, account_name, account_number, currency, is_active, notes, updated_by, updated_at
         FROM pay_account
        WHERE id = 1`
    );
    res.json({ message: "Pay account updated", data: out[0] });
  } catch (err) {
    console.error("patch pay-account error:", err);
    res.status(500).json({ message: "Error updating pay account" });
  }
});


/* =========================
   CATEGORY & PRODUCT ROUTES
   ========================= */

// Helpers
function parseMoney(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return NaN;
  return n;
}
function normalizePrices(body) {
  // Accept both singular and the user's "plural" keys just in case
  const cash = parseMoney(body.cash_price ?? body.cash_prices);
  const auction = parseMoney(body.auction_price ?? body.auction_prices);
  const heist = parseMoney(body.heist_price ?? body.heist_prices);

  const out = {};
  if (cash !== null) {
    if (Number.isNaN(cash) || cash < 0) throw new Error('Invalid cash_price');
    out.cash_price = cash;
  }
  if (auction !== null) {
    if (Number.isNaN(auction) || auction < 0) throw new Error('Invalid auction_price');
    out.auction_price = auction;
  }
  if (heist !== null) {
    if (Number.isNaN(heist) || heist < 0) throw new Error('Invalid heist_price');
    out.heist_price = heist;
  }
  return out;
}
// Utility to coerce booleans (accepts true/false/1/0/"true"/"false")
function parseBool(v, dflt) {
  if (v === undefined) return dflt;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return ['1','true','yes','on'].includes(v.toLowerCase());
  return dflt;
}

const WAITLIST_TABLE ='bids_waitlist';

// Create category
router.post('/categories', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    const trimmed = String(name).trim();

    const [result] = await pool.query(
      'INSERT INTO categories (name) VALUES (?)',
      [trimmed]
    );
    return res.status(201).json({
      id: result.insertId,
      name: trimmed,
      created_at: moment().toISOString()
    });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Category name already exists' });
    }
    console.error('POST /categories error:', err);
    return res.status(500).json({ message: 'Failed to create category' });
  }
});
// List categories
router.get('/categories', authenticateToken, authenticateAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, created_at FROM categories ORDER BY name ASC'
    );
    return res.json(rows);
  } catch (err) {
    console.error('GET /categories error:', err);
    return res.status(500).json({ message: 'Failed to fetch categories' });
  }
});
// Update category
router.put('/categories/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const categoryId = Number(req.params.id);
    const { name } = req.body || {};

    if (!categoryId || Number.isNaN(categoryId)) {
      return res.status(400).json({ message: 'Invalid category id' });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const trimmedName = String(name).trim();

    // Check if name already exists (but not same record)
    const [check] = await pool.query(
      'SELECT id FROM categories WHERE name = ? AND id <> ? LIMIT 1',
      [trimmedName, categoryId]
    );

    if (check.length > 0) {
      return res.status(409).json({ message: 'Category name already exists' });
    }

    // Update category
    const [result] = await pool.query(
      'UPDATE categories SET name = ? WHERE id = ? LIMIT 1',
      [trimmedName, categoryId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.json({
      id: categoryId,
      name: trimmedName,
      updated_at: moment().toISOString()
    });

  } catch (err) {
    console.error('PUT /categories/:id error:', err);
    return res.status(500).json({ message: 'Failed to update category' });
  }
});
// Rename / update category
router.patch('/products/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || !Number.isFinite(id)) {
      return res.status(400).json({ message: 'Invalid product id' });
    }

    const fields = [];
    const values = [];

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ message: 'Product name cannot be empty' });
      fields.push('name = ?'); values.push(name);
    }

    const prices = normalizePrices(req.body);
    if (prices.cash_price !== undefined)    { fields.push('cash_price = ?');    values.push(prices.cash_price); }
    if (prices.auction_price !== undefined) { fields.push('auction_price = ?'); values.push(prices.auction_price); }
    if (prices.heist_price !== undefined)   { fields.push('heist_price = ?');   values.push(prices.heist_price); }

    // NEW: flags
    if (req.body.allow_cash !== undefined)    { fields.push('allow_cash = ?');    values.push(parseBool(req.body.allow_cash, true) ? 1 : 0); }
    if (req.body.allow_auction !== undefined) { fields.push('allow_auction = ?'); values.push(parseBool(req.body.allow_auction, true) ? 1 : 0); }
    if (req.body.allow_heist !== undefined)   { fields.push('allow_heist = ?');   values.push(parseBool(req.body.allow_heist, true) ? 1 : 0); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    values.push(id);
    const [result] = await pool.query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json({ id, message: 'Product updated' });
  } catch (err) {
    console.error('PATCH /products/:id error:', err);
    return res.status(500).json({ message: 'Failed to update product' });
  }
});
// Delete category (also removes junction rows via FK cascade)
router.delete('/categories/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || !Number.isFinite(id)) {
      return res.status(400).json({ message: 'Invalid category id' });
    }
    const [result] = await pool.query(
      'DELETE FROM categories WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    return res.json({ message: 'Category deleted', id });
  } catch (err) {
    console.error('DELETE /categories/:id error:', err);
    return res.status(500).json({ message: 'Failed to delete category' });
  }
});

/* =========================
   PRODUCT CRUD
   ========================= */

// Create product (+ optional category linking + image + gallery + extra fields)
router.post(
  "/products",
  authenticateToken,
  authenticateAdmin,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "gallery", maxCount: 12 },
  ]),
  async (req, res) => {
    try {
      const body = req.body || {};
      const { name } = body;

      if (!name || !String(name).trim()) {
        return res.status(400).json({ message: "Product name is required" });
      }

      // prices
      const prices = normalizePrices(body);
      const cash = prices.cash_price ?? 0;
      const auction = prices.auction_price ?? 0;
      const heist = prices.heist_price ?? 0;

      // extra fields
      const short_description =
        body.short_description !== undefined
          ? String(body.short_description || "").trim()
          : null;

      const description =
        body.description !== undefined
          ? String(body.description || "").trim()
          : null;

      const vendor_name = String(body.vendor_name || "CopUp").trim() || "CopUp";

      const stock_statusRaw = String(body.stock_status || "in_stock").toLowerCase();
      const stock_status =
        stock_statusRaw === "out_of_stock" || stock_statusRaw === "out"
          ? "out_of_stock"
          : "in_stock";

      const shipping_costNum = Number(body.shipping_cost);
      const shipping_cost = Number.isFinite(shipping_costNum) ? shipping_costNum : 0;

      const delivery_eta =
        body.delivery_eta !== undefined
          ? String(body.delivery_eta || "").trim()
          : null;

      // primary image
      const primaryFile = req.files?.image?.[0] || null;
      const imagePath = primaryFile ? `/uploads/${primaryFile.filename}` : null;

      // insert product
      const [result] = await pool.query(
        `INSERT INTO products
          (name, short_description, description, vendor_name, stock_status, shipping_cost, delivery_eta,
           cash_price, auction_price, heist_price, image_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(name).trim(),
          short_description || null,
          description || null,
          vendor_name,
          stock_status,
          shipping_cost,
          delivery_eta || null,
          cash,
          auction,
          heist,
          imagePath,
        ]
      );

      const productId = result.insertId;

      // gallery images insert
      const galleryFiles = Array.isArray(req.files?.gallery) ? req.files.gallery : [];
      if (galleryFiles.length) {
        const placeholders = galleryFiles.map(() => "(?,?,?)").join(",");
        const params = galleryFiles.flatMap((f, idx) => [
          productId,
          `/uploads/${f.filename}`,
          idx,
        ]);

        await pool.query(
          `INSERT INTO product_images (product_id, image_path, sort_order)
           VALUES ${placeholders}`,
          params
        );
      }

      // optional category linking (unchanged)
      const toIdArray = (input) => {
        if (input == null) return [];
        if (Array.isArray(input)) return input.map(Number).filter(Number.isFinite);
        const s = String(input);
        if (s.includes(",")) return s.split(",").map((x) => Number(x.trim())).filter(Number.isFinite);
        const n = Number(input);
        return Number.isFinite(n) ? [n] : [];
      };

      let catIds = [
        ...toIdArray(body.categoryId),
        ...toIdArray(body.categoryIds),
        ...toIdArray(body.categories),
      ];
      catIds = [...new Set(catIds)];

      let linked = [];
      let missing = [];

      if (catIds.length) {
        const [existingRows] = await pool.query(
          `SELECT id FROM categories WHERE id IN (${catIds.map(() => "?").join(",")})`,
          catIds
        );
        const existingSet = new Set(existingRows.map((r) => r.id));
        const validIds = catIds.filter((id) => existingSet.has(id));
        missing = catIds.filter((id) => !existingSet.has(id));

        if (validIds.length) {
          const placeholders = validIds.map(() => "(?,?)").join(",");
          const params = validIds.flatMap((cid) => [productId, cid]);
          await pool.query(
            `INSERT IGNORE INTO product_categories (product_id, category_id) VALUES ${placeholders}`,
            params
          );
          linked = validIds;
        }
      }

      // read back gallery
      const [galleryRows] = await pool.query(
        `SELECT id, image_path, sort_order, created_at
           FROM product_images
          WHERE product_id = ?
          ORDER BY sort_order ASC, id ASC`,
        [productId]
      );

      return res.status(201).json({
        id: productId,
        name: String(name).trim(),
        short_description,
        description,
        vendor_name,
        stock_status,
        shipping_cost,
        delivery_eta,

        cash_price: cash,
        auction_price: auction,
        heist_price: heist,

        image_path: imagePath,
        image_url: absUrl(req, imagePath),

        gallery: galleryRows.map((g) => ({
          ...g,
          image_url: absUrl(req, g.image_path),
        })),

        created_at: moment().toISOString(),
        linked_categories: linked,
        missing_categories: missing,
      });
    } catch (err) {
      console.error("POST /products error:", err);
      return res.status(500).json({ message: "Failed to create product" });
    }
  }
);
// List products (optionally filter by categoryId) + categories + gallery_count + images
router.get("/products", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    if (categoryId && !Number.isFinite(categoryId)) {
      return res.status(400).json({ message: "Invalid categoryId" });
    }

    const params = [];
    let joinCategoryFilter = "";

    if (categoryId) {
      joinCategoryFilter = `
        JOIN product_categories pcFilter ON pcFilter.product_id = p.id
       AND pcFilter.category_id = ?
      `;
      params.push(categoryId);
    }

    const [rows] = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        p.short_description,
        p.description,
        p.vendor_name,
        p.stock_status,
        p.shipping_cost,
        p.delivery_eta,

        p.cash_price,
        p.auction_price,
        p.heist_price,

        p.image_path,
        p.created_at,

        -- ✅ ADD THIS
        p.is_featured,

        GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') AS categories,

        (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) AS gallery_count

      FROM products p
      ${joinCategoryFilter}
      LEFT JOIN product_categories pc ON pc.product_id = p.id
      LEFT JOIN categories c ON c.id = pc.category_id

      GROUP BY p.id
      ORDER BY p.name ASC
      `,
      params
    );

    return res.json(
      rows.map((r) => ({
        ...r,
        // ensure 0/1 number (safe)
        is_featured: Number(r.is_featured) ? 1 : 0,
        image_url: absUrl(req, r.image_path),
      }))
    );
  } catch (err) {
    console.error("GET /products error:", err);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
});
// Get single product by id + categories + gallery images
router.get("/products/:id", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || !Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const [[product]] = await pool.query(
      `SELECT
         id,
         name,
         short_description,
         description,
         vendor_name,
         stock_status,
         shipping_cost,
         delivery_eta,
         cash_price,
         auction_price,
         heist_price,
         image_path,
         created_at,

         -- ✅ ADD THIS
         is_featured

       FROM products
       WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!product) return res.status(404).json({ message: "Product not found" });

    const [cats] = await pool.query(
      `SELECT c.id, c.name
         FROM product_categories pc
         JOIN categories c ON c.id = pc.category_id
        WHERE pc.product_id = ?
        ORDER BY c.name ASC`,
      [id]
    );

    const [gallery] = await pool.query(
      `SELECT id, image_path, sort_order, created_at
         FROM product_images
        WHERE product_id = ?
        ORDER BY sort_order ASC, id ASC`,
      [id]
    );

    return res.json({
      ...product,
      is_featured: Number(product.is_featured) ? 1 : 0,
      image_url: absUrl(req, product.image_path),
      categories: cats,
      gallery: gallery.map((g) => ({
        ...g,
        image_url: absUrl(req, g.image_path),
      })),
    });
  } catch (err) {
    console.error("GET /products/:id error:", err);
    return res.status(500).json({ message: "Failed to fetch product" });
  }
});
// PUT /products/:id (update fields + optional primary image + optional gallery)
router.put(
  "/products/:id",
  authenticateToken,
  authenticateAdmin,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "gallery", maxCount: 12 },
  ]),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid product id" });
      }

      const body = req.body || {};

      const toIdArray = (input) => {
        if (input == null) return [];
        if (Array.isArray(input)) return input.map(Number).filter(Number.isFinite);
        const s = String(input);
        if (s.includes(",")) return s.split(",").map((x) => Number(x.trim())).filter(Number.isFinite);
        const n = Number(input);
        return Number.isFinite(n) ? [n] : [];
      };

      const prices = normalizePrices(body);

      const [[current]] = await pool.query(
        `SELECT
           id, name, short_description, description, vendor_name, stock_status,
           shipping_cost, delivery_eta,
           cash_price, auction_price, heist_price, image_path
         FROM products WHERE id = ? LIMIT 1`,
        [id]
      );
      if (!current) return res.status(404).json({ message: "Product not found" });

      const newName =
        body.name !== undefined ? String(body.name || "").trim() : current.name;
      if (!newName) return res.status(400).json({ message: "Product name cannot be empty" });

      const short_description =
        body.short_description !== undefined
          ? String(body.short_description || "").trim() || null
          : current.short_description;

      const description =
        body.description !== undefined
          ? String(body.description || "").trim() || null
          : current.description;

      const vendor_name =
        body.vendor_name !== undefined
          ? String(body.vendor_name || "").trim() || "CopUp"
          : current.vendor_name;

      const stock_statusRaw =
        body.stock_status !== undefined
          ? String(body.stock_status || "").toLowerCase()
          : current.stock_status;

      const stock_status =
        stock_statusRaw === "out_of_stock" || stock_statusRaw === "out"
          ? "out_of_stock"
          : "in_stock";

      const shipping_costNum =
        body.shipping_cost !== undefined ? Number(body.shipping_cost) : current.shipping_cost;
      const shipping_cost = Number.isFinite(shipping_costNum) ? shipping_costNum : current.shipping_cost;

      const delivery_eta =
        body.delivery_eta !== undefined
          ? String(body.delivery_eta || "").trim() || null
          : current.delivery_eta;

      const newCash =
        prices.cash_price !== undefined ? prices.cash_price : current.cash_price;
      const newAuction =
        prices.auction_price !== undefined ? prices.auction_price : current.auction_price;
      const newHeist =
        prices.heist_price !== undefined ? prices.heist_price : current.heist_price;

      // primary image replacement
      const primaryFile = req.files?.image?.[0] || null;
      const newImagePath = primaryFile ? `/uploads/${primaryFile.filename}` : current.image_path;

      // update product core
      await pool.query(
        `UPDATE products
            SET name = ?,
                short_description = ?,
                description = ?,
                vendor_name = ?,
                stock_status = ?,
                shipping_cost = ?,
                delivery_eta = ?,
                cash_price = ?,
                auction_price = ?,
                heist_price = ?,
                image_path = ?
          WHERE id = ?`,
        [
          newName,
          short_description,
          description,
          vendor_name,
          stock_status,
          shipping_cost,
          delivery_eta,
          newCash,
          newAuction,
          newHeist,
          newImagePath,
          id,
        ]
      );

      // categories: if provided, REPLACE
      let categoriesChanged = false;
      let finalCats = [];

      const catIds = [
        ...toIdArray(body.categoryId),
        ...toIdArray(body.categoryIds),
        ...toIdArray(body.categories),
      ];
      const uniqueCatIds = [...new Set(catIds)];

      if (uniqueCatIds.length) {
        categoriesChanged = true;

        const [existingRows] = await pool.query(
          `SELECT id, name FROM categories WHERE id IN (${uniqueCatIds.map(() => "?").join(",")})`,
          uniqueCatIds
        );
        const existingSet = new Set(existingRows.map((r) => r.id));
        const validIds = uniqueCatIds.filter((cid) => existingSet.has(cid));

        await pool.query(`DELETE FROM product_categories WHERE product_id = ?`, [id]);

        if (validIds.length) {
          const placeholders = validIds.map(() => "(?,?)").join(",");
          const params = validIds.flatMap((cid) => [id, cid]);
          await pool.query(
            `INSERT IGNORE INTO product_categories (product_id, category_id) VALUES ${placeholders}`,
            params
          );
        }

        finalCats = existingRows
          .filter((r) => validIds.includes(r.id))
          .map((r) => ({ id: r.id, name: r.name }))
          .sort((a, b) => a.name.localeCompare(b.name));
      } else {
        const [cats] = await pool.query(
          `SELECT c.id, c.name
             FROM product_categories pc
             JOIN categories c ON c.id = pc.category_id
            WHERE pc.product_id = ?
            ORDER BY c.name ASC`,
          [id]
        );
        finalCats = cats;
      }

      // gallery images: append or replace
      const galleryFiles = Array.isArray(req.files?.gallery) ? req.files.gallery : [];
      const galleryMode = String(body.gallery_mode || "append").toLowerCase();

      if (galleryFiles.length) {
        if (galleryMode === "replace") {
          await pool.query(`DELETE FROM product_images WHERE product_id = ?`, [id]);
        }

        // get current max sort order for append
        const [[mx]] = await pool.query(
          `SELECT COALESCE(MAX(sort_order), -1) AS max_sort
             FROM product_images
            WHERE product_id = ?`,
          [id]
        );

        const start = Number(mx?.max_sort) + 1;
        const placeholders = galleryFiles.map(() => "(?,?,?)").join(",");
        const params = galleryFiles.flatMap((f, idx) => [
          id,
          `/uploads/${f.filename}`,
          start + idx,
        ]);

        await pool.query(
          `INSERT INTO product_images (product_id, image_path, sort_order)
           VALUES ${placeholders}`,
          params
        );
      }

      // return updated product + gallery
      const [[updated]] = await pool.query(
        `SELECT
           id, name, short_description, description, vendor_name, stock_status,
           shipping_cost, delivery_eta,
           cash_price, auction_price, heist_price, image_path, created_at
         FROM products WHERE id = ? LIMIT 1`,
        [id]
      );

      const [gallery] = await pool.query(
        `SELECT id, image_path, sort_order, created_at
           FROM product_images
          WHERE product_id = ?
          ORDER BY sort_order ASC, id ASC`,
        [id]
      );

      return res.json({
        id: updated.id,
        message: "Product updated",
        product: {
          ...updated,
          image_url: absUrl(req, updated.image_path),
          categories: finalCats,
          categories_replaced: categoriesChanged,
          gallery: gallery.map((g) => ({
            ...g,
            image_url: absUrl(req, g.image_path),
          })),
        },
      });
    } catch (err) {
      console.error("PUT /products/:id error:", err);
      return res.status(500).json({ message: "Failed to update product" });
    }
  }
);
// Delete product (gallery rows cascade via FK)
router.delete("/products/:id", authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || !Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const [result] = await pool.query("DELETE FROM products WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json({ message: "Product deleted", id });
  } catch (err) {
    console.error("DELETE /products/:id error:", err);
    return res.status(500).json({ message: "Failed to delete product" });
  }
});
// Mark a product featured/unfeatured
router.patch('/products/:id/featured',authenticateToken,authenticateAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: 'Invalid product id' });
      }

      const body = req.body || {};
      // Accept { is_featured: true/false } or { featured: 1/0 }
      let flag = body.is_featured;
      if (flag === undefined) flag = body.featured;
      const val = Number(flag);
      if (![0,1].includes(val)) {
        return res.status(400).json({ message: 'is_featured must be 0 or 1 (or true/false)' });
      }

      const [result] = await pool.query(
        `UPDATE products SET is_featured = ? WHERE id = ?`,
        [val, id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const [[p]] = await pool.query(
        `SELECT id, name, is_featured, image_path
           FROM products WHERE id = ? LIMIT 1`,
        [id]
      );
      return res.json({
        message: 'Product featured flag updated',
        product: { ...p, image_url: absUrl(req, p.image_path) }
      });
    } catch (err) {
      console.error('PATCH /products/:id/featured error:', err);
      return res.status(500).json({ message: 'Failed to update featured flag' });
    }
  }
);
// List ONLY featured products (optional ?categoryId=)
router.get("/featured/products",authenticateToken,authenticateAdmin,
  async (req, res) => {
    try {
      const categoryIdRaw = req.query.categoryId;
      const categoryId = categoryIdRaw ? Number(categoryIdRaw) : null;

      if (categoryIdRaw && !Number.isFinite(categoryId)) {
        return res.status(400).json({ message: "Invalid categoryId" });
      }

      // ✅ If category filter is provided
      if (categoryId) {
        const [rows] = await pool.query(
          `SELECT
             p.id,
             p.name,
             p.cash_price,
             p.auction_price,
             p.heist_price,
             p.image_path,
             MAX(p.is_featured) AS is_featured,
             p.created_at,
             c.id   AS category_id,
             c.name AS category_name
           FROM products p
           JOIN product_categories pc ON pc.product_id = p.id
           JOIN categories c         ON c.id = pc.category_id
           WHERE pc.category_id = ? AND p.is_featured = 1
           GROUP BY p.id, c.id, c.name
           ORDER BY p.name ASC`,
          [categoryId]
        );

        return res.json(rows.map((r) => ({ ...r, image_url: absUrl(req, r.image_path) })));
      }

      // ✅ No category filter: return featured products with merged categories
      const [rows] = await pool.query(
        `SELECT
           p.id,
           p.name,
           p.cash_price,
           p.auction_price,
           p.heist_price,
           p.image_path,
           MAX(p.is_featured) AS is_featured,
           p.created_at,
           GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') AS categories
         FROM products p
         LEFT JOIN product_categories pc ON pc.product_id = p.id
         LEFT JOIN categories c ON c.id = pc.category_id
         WHERE p.is_featured = 1
         GROUP BY p.id
         ORDER BY p.name ASC`
      );

      return res.json(rows.map((r) => ({ ...r, image_url: absUrl(req, r.image_path) })));
    } catch (err) {
      console.error("GET /featured/products error:", err);
      return res.status(500).json({ message: "Failed to fetch featured products" });
    }
  }
);

/* =========================
   LINK / UNLINK PRODUCT ↔ CATEGORY
   ========================= */

// Add product to category
router.post('/categories/:categoryId/products/:productId', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const categoryId = Number(req.params.categoryId);
    const productId = Number(req.params.productId);
    if (!Number.isFinite(categoryId) || !Number.isFinite(productId)) {
      return res.status(400).json({ message: 'Invalid ids' });
    }

    // Ensure both exist
    const [[cat]] = await pool.query('SELECT id FROM categories WHERE id = ? LIMIT 1', [categoryId]);
    if (!cat) return res.status(404).json({ message: 'Category not found' });

    const [[prod]] = await pool.query('SELECT id FROM products WHERE id = ? LIMIT 1', [productId]);
    if (!prod) return res.status(404).json({ message: 'Product not found' });

    // Insert (ignore if already exists)
    await pool.query(
      'INSERT IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)',
      [productId, categoryId]
    );

    return res.status(201).json({ message: 'Product added to category', product_id: productId, category_id: categoryId });
  } catch (err) {
    console.error('POST /categories/:categoryId/products/:productId error:', err);
    return res.status(500).json({ message: 'Failed to add product to category' });
  }
});
// Remove product from category
router.delete('/categories/:categoryId/products/:productId', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const categoryId = Number(req.params.categoryId);
    const productId = Number(req.params.productId);
    if (!Number.isFinite(categoryId) || !Number.isFinite(productId)) {
      return res.status(400).json({ message: 'Invalid ids' });
    }

    const [result] = await pool.query(
      'DELETE FROM product_categories WHERE product_id = ? AND category_id = ?',
      [productId, categoryId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Link not found' });
    }
    return res.json({ message: 'Product removed from category', product_id: productId, category_id: categoryId });
  } catch (err) {
    console.error('DELETE /categories/:categoryId/products/:productId error:', err);
    return res.status(500).json({ message: 'Failed to remove product from category' });
  }
});
// List products in a category (explicit route)
router.get('/categories/:categoryId/products', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const categoryId = Number(req.params.categoryId);
    if (!Number.isFinite(categoryId)) {
      return res.status(400).json({ message: 'Invalid category id' });
    }
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.cash_price, p.auction_price, p.heist_price, p.created_at
       FROM product_categories pc
       JOIN products p ON p.id = pc.product_id
       WHERE pc.category_id = ?
       ORDER BY p.name ASC`,
      [categoryId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('GET /categories/:categoryId/products error:', err);
    return res.status(500).json({ message: 'Failed to fetch products for category' });
  }
});
// List categories for a product (explicit route)
router.get('/products/:productId/categories', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isFinite(productId)) {
      return res.status(400).json({ message: 'Invalid product id' });
    }
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.created_at
       FROM product_categories pc
       JOIN categories c ON c.id = pc.category_id
       WHERE pc.product_id = ?
       ORDER BY c.name ASC`,
      [productId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('GET /products/:productId/categories error:', err);
    return res.status(500).json({ message: 'Failed to fetch categories for product' });
  }
});

/* =========================
   waitlist routes/
   ========================= */

// routes/admin.js (add below your other admin routes)
router.get('/waitlist', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const productId = req.query.productId ? Number(req.query.productId) : null;
    const userId    = req.query.userId ? Number(req.query.userId) : null;
    const mode      = (req.query.mode || '').toLowerCase();
    const status    = (req.query.status || '').toLowerCase();

    if (productId && !Number.isFinite(productId)) return res.status(400).json({ message: 'Invalid productId' });
    if (userId && !Number.isFinite(userId)) return res.status(400).json({ message: 'Invalid userId' });
    if (mode && !['auction','heist'].includes(mode)) return res.status(400).json({ message: "mode must be 'auction' or 'heist'" });
    if (status && !['queued','won','fulfilled','cancelled'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const limit  = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const order  = (req.query.order || 'newest').toLowerCase() === 'oldest' ? 'ASC' : 'DESC';

    const where = [];
    const params = [];
    if (productId) { where.push('bw.product_id = ?'); params.push(productId); }
    if (userId)    { where.push('bw.user_id = ?');    params.push(userId); }
    if (mode)      { where.push('bw.mode = ?');       params.push(mode); }
    if (status)    { where.push('bw.status = ?');     params.push(status); }

    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    const [rows] = await pool.query(
      `SELECT
         bw.id,
         bw.user_id,
         u.full_name AS user_name,
         u.username  AS user_username,
         bw.product_id,
         p.name      AS product_name,
         bw.qty,
         bw.mode,
         bw.bid_locked,
         bw.status,
         bw.created_at
       FROM ${WAITLIST_TABLE} bw
       JOIN products p ON p.id = bw.product_id
       JOIN users    u ON u.id = bw.user_id
       ${whereSql}
       ORDER BY bw.id ${order}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // simple count for pagination
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
         FROM ${WAITLIST_TABLE} bw
         ${whereSql}`,
      params
    );

    res.json({ total, limit, offset, items: rows });
  } catch (e) {
    console.error('GET /admin/waitlist error:', e);
    res.status(500).json({ message: 'Failed to fetch waitlist entries' });
  }
});
// Get waitlist summary
router.get('/waitlist/summary', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const mode   = (req.query.mode || '').toLowerCase();
    const status = (req.query.status || '').toLowerCase();

    if (mode && !['auction','heist'].includes(mode)) return res.status(400).json({ message: "mode must be 'auction' or 'heist'" });
    if (status && !['queued','won','fulfilled','cancelled'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const where = [];
    const params = [];
    if (mode)   { where.push('bw.mode = ?');   params.push(mode); }
    if (status) { where.push('bw.status = ?'); params.push(status); }
    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    const [rows] = await pool.query(
      `SELECT
         bw.product_id,
         p.name     AS product_name,
         bw.mode,
         COUNT(*)   AS entries,
         SUM(bw.bid_locked) AS total_locked,
         SUM(CASE WHEN bw.status='queued' THEN 1 ELSE 0 END) AS queued,
         SUM(CASE WHEN bw.status='won' THEN 1 ELSE 0 END) AS won,
         SUM(CASE WHEN bw.status='fulfilled' THEN 1 ELSE 0 END) AS fulfilled,
         SUM(CASE WHEN bw.status='cancelled' THEN 1 ELSE 0 END) AS cancelled
       FROM ${WAITLIST_TABLE} bw
       JOIN products p ON p.id = bw.product_id
       ${whereSql}
       GROUP BY bw.product_id, bw.mode
       ORDER BY product_name ASC, bw.mode ASC`
      , params
    );

    res.json(rows);
  } catch (e) {
    console.error('GET /admin/waitlist/summary error:', e);
    res.status(500).json({ message: 'Failed to fetch waitlist summary' });
  }
});
// Get waitlist for a specific product (mode-separated + rich summaries)
router.get('/products/:productId/waitlist', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isFinite(productId)) return res.status(400).json({ message: 'Invalid productId' });

    const modeRaw   = (req.query.mode || '').toLowerCase().trim();
    const statusRaw = (req.query.status || '').toLowerCase().trim();

    if (modeRaw && !['auction','heist'].includes(modeRaw)) {
      return res.status(400).json({ message: "mode must be 'auction' or 'heist'" });
    }
    if (statusRaw && !['queued','won','fulfilled','cancelled'].includes(statusRaw)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const limit  = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
    const offset = Math.max(0, Number(req.query.offset || 0));

    // Show friendly filters (never null)
    const filtersOut = {
      mode:   modeRaw   || 'all',
      status: statusRaw || 'all',
      limit,
      offset
    };

    // Ensure product exists
    const [[prod]] = await pool.query(
      `SELECT id, name FROM products WHERE id = ? LIMIT 1`,
      [productId]
    );
    if (!prod) return res.status(404).json({ message: 'Product not found' });

    // ---------- SUMMARY (same idea as /waitlist/summary, but scoped to product) ----------
    const sumWhere = ['bw.product_id = ?'];
    const sumParams = [productId];
    if (modeRaw)   { sumWhere.push('bw.mode = ?');   sumParams.push(modeRaw); }
    if (statusRaw) { sumWhere.push('bw.status = ?'); sumParams.push(statusRaw); }
    const sumWhereSql = 'WHERE ' + sumWhere.join(' AND ');

    // Per-mode totals (entries, users, total_locked)
    const [perModeAgg] = await pool.query(
      `SELECT
         bw.mode,
         COUNT(*) AS entries,
         COUNT(DISTINCT bw.user_id) AS users,
         COALESCE(SUM(bw.bid_locked),0) AS total_locked
       FROM ${WAITLIST_TABLE} bw
       ${sumWhereSql}
       GROUP BY bw.mode`,
      sumParams
    );

    // Per-mode, per-status breakdown
    const [perModeStatus] = await pool.query(
      `SELECT
         bw.mode,
         bw.status,
         COUNT(*) AS count_status,
         COALESCE(SUM(bw.bid_locked),0) AS total_locked_status
       FROM ${WAITLIST_TABLE} bw
       ${sumWhereSql}
       GROUP BY bw.mode, bw.status`,
      sumParams
    );

    // Overall totals
    const [[overallAgg]] = await pool.query(
      `SELECT
         COUNT(*) AS entries,
         COUNT(DISTINCT bw.user_id) AS users,
         COALESCE(SUM(bw.bid_locked),0) AS total_locked
       FROM ${WAITLIST_TABLE} bw
       ${sumWhereSql}`,
      sumParams
    );

    // Format per-mode summary (+ status breakdown map)
    const baseMode = () => ({
      entries: 0, users: 0, total_locked: 0,
      by_status: { queued: {count:0,total_locked:0}, won:{count:0,total_locked:0}, fulfilled:{count:0,total_locked:0}, cancelled:{count:0,total_locked:0} }
    });
    const summaryModes = { auction: baseMode(), heist: baseMode() };

    for (const r of perModeAgg) {
      const m = r.mode;
      if (!summaryModes[m]) summaryModes[m] = baseMode();
      summaryModes[m].entries = Number(r.entries) || 0;
      summaryModes[m].users = Number(r.users) || 0;
      summaryModes[m].total_locked = Number(r.total_locked) || 0;
    }
    for (const r of perModeStatus) {
      const m = r.mode;
      const s = r.status;
      if (!summaryModes[m]) summaryModes[m] = baseMode();
      if (!summaryModes[m].by_status[s]) summaryModes[m].by_status[s] = { count: 0, total_locked: 0 };
      summaryModes[m].by_status[s].count = Number(r.count_status) || 0;
      summaryModes[m].by_status[s].total_locked = Number(r.total_locked_status) || 0;
    }

    // ---------- PAGED ITEMS (readable) ----------
    const where = ['bw.product_id = ?'];
    const params = [productId];
    if (modeRaw)   { where.push('bw.mode = ?');   params.push(modeRaw); }
    if (statusRaw) { where.push('bw.status = ?'); params.push(statusRaw); }
    const whereSql = 'WHERE ' + where.join(' AND ');

    const [rows] = await pool.query(
      `SELECT
         bw.id,
         bw.user_id,
         u.full_name  AS user_name,
         u.username   AS user_username,
         u.email      AS user_email,
         bw.product_id,
         p.name       AS product_name,
         bw.qty,
         bw.mode,
         bw.bid_locked,
         bw.status,
         bw.created_at
       FROM ${WAITLIST_TABLE} bw
       JOIN products p ON p.id = bw.product_id
       JOIN users    u ON u.id = bw.user_id
       ${whereSql}
       ORDER BY bw.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const auctionItems = [];
    const heistItems   = [];
    for (const it of rows) {
      const formatted = {
        id: it.id,
        user: {
          id: it.user_id,
          name: it.user_name,
          username: it.user_username,
          email: it.user_email
        },
        product: { id: it.product_id, name: it.product_name },
        qty: it.qty,
        mode: it.mode,
        bid_locked: Number(it.bid_locked),
        status: it.status,
        created_at: it.created_at
      };
      (it.mode === 'auction' ? auctionItems : heistItems).push(formatted);
    }

    // Distinct users in current page (convenience)
    const pagedAuctionUsers = new Set(auctionItems.map(i => i.user.id)).size;
    const pagedHeistUsers   = new Set(heistItems.map(i => i.user.id)).size;

    // ---------- RESPONSE ----------
    res.json({
      product: { id: prod.id, name: prod.name },
      filters: filtersOut,                 // <- 'all' instead of nulls
      summary: {
        overall: {
          entries: Number(overallAgg.entries) || 0,
          users: Number(overallAgg.users) || 0,
          total_locked: Number(overallAgg.total_locked) || 0
        },
        auction: summaryModes.auction,
        heist: summaryModes.heist
      },
      auction: {
        count: auctionItems.length,
        distinct_users_in_page: pagedAuctionUsers,
        items: auctionItems
      },
      heist: {
        count: heistItems.length,
        distinct_users_in_page: pagedHeistUsers,
        items: heistItems
      }
    });
  } catch (e) {
    console.error('GET /admin/products/:productId/waitlist error:', e);
    res.status(500).json({ message: 'Failed to fetch product waitlist' });
  }
});
// POST /api/admin/auctions/from-waitlist
router.post('/auctions/from-waitlist', authenticateToken, authenticateAdmin, async (req, res) => {
  const {
    product_id,
    name,
    description = '',
    entry_bid_points,
    minimum_users,
    category,
    update_waitlist
  } = req.body || {};

  if (!name || entry_bid_points == null || minimum_users == null || !category) {
    return res.status(400).json({ message: "name, entry_bid_points, minimum_users, category are required" });
  }
  const allowed = new Set(['cash','product','coupon']);
  if (!allowed.has(String(category).toLowerCase())) {
    return res.status(400).json({ message: "Invalid category (cash|product|coupon)" });
  }
  const entry = Number(entry_bid_points);
  const minUsers = Number(minimum_users);
  if (!Number.isInteger(entry) || entry < 0) {
    return res.status(400).json({ message: "entry_bid_points must be a non-negative integer" });
  }
  if (!Number.isInteger(minUsers) || minUsers < 1) {
    return res.status(400).json({ message: "minimum_users must be an integer >= 1" });
  }
  if (!Number.isFinite(Number(product_id))) {
    return res.status(400).json({ message: "product_id is required (number)" });
  }
  const productId = Number(product_id);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // --- HARD BLOCK: if any waitlist rows already in_progress for this product & mode='auction'
    const [[busy]] = await conn.query(
      `SELECT COUNT(*) AS cnt
         FROM bids_waitlist
        WHERE product_id = ? AND mode = 'auction' AND status = 'in_progress'`,
      [productId]
    );
    if (Number(busy.cnt) > 0) {
      await conn.rollback();
      return res.status(409).json({
        message: "Auction already being processed for this product (waitlist in_progress). Finish or cancel before creating another."
      });
    }

    // Create auction (status 'pending'), saving product_id
    const [insAuction] = await conn.query(
      `INSERT INTO auctions
         (name, description, image, entry_bid_points, minimum_users, category, status, created_by, product_id)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [name, description, null, entry, minUsers, category.toLowerCase(), req.user.id, productId]
    );
    const auctionId = insAuction.insertId;

    // Seed participants from waitlist (mode='auction', status='queued')
    const [waiters] = await conn.query(
      `SELECT DISTINCT user_id
         FROM bids_waitlist
        WHERE product_id = ? AND mode = 'auction' AND status = 'queued'`,
      [productId]
    );

    if (waiters.length) {
      const users = [...new Set(waiters.map(r => Number(r.user_id)))];
      const vals = users.map(uid => [auctionId, uid]);
      await conn.query(
        `INSERT IGNORE INTO auction_participants (auction_id, user_id)
         VALUES ${vals.map(()=>'(?, ?)').join(',')}`,
        vals.flat()
      );

      if (update_waitlist) {
        try {
          await conn.query(
            `UPDATE bids_waitlist
                SET status = 'in_progress'
              WHERE product_id = ? AND mode = 'auction' AND status = 'queued'
                AND user_id IN (${users.map(()=>'?').join(',')})`,
            [productId, ...users]
          );
        } catch (_) { /* ignore if enum/value doesn't exist */ }
      }
    }

    await conn.commit();
    return res.status(201).json({
      message: "Auction created successfully from waitlist",
      id: auctionId,
      product_id: productId
    });
  } catch (err) {
    await conn.rollback();
    console.error("POST /admin/auctions/from-waitlist error:", err);
    return res.status(500).json({ message: "Error creating auction from waitlist", error: err.message });
  } finally {
    conn.release();
  }
});
// POST /api/admin/heists/from-waitlist
router.post('/heists/from-waitlist', authenticateToken, authenticateAdmin, async (req, res) => {
  const {
    product_id,
    name,
    story = '',
    question = '',
    answer = '',
    min_users,
    ticket_price,
    prize,
    category,
    prize_name = '',
    update_waitlist
  } = req.body || {};

  if (!name || !category) {
    return res.status(400).json({ message: "name and category are required" });
  }
  if (!['cash','product'].includes(String(category).toLowerCase())) {
    return res.status(400).json({ message: "Invalid category. Must be 'cash' or 'product'." });
  }
  const minUsers = Number(min_users);
  const ticket   = Number(ticket_price);
  const prizeVal = Number(prize);
  if (!Number.isInteger(minUsers) || minUsers < 1) {
    return res.status(400).json({ message: "min_users must be an integer >= 1" });
  }
  if (!Number.isInteger(ticket) || ticket < 0) {
    return res.status(400).json({ message: "ticket_price must be a non-negative integer" });
  }
  if (!Number.isInteger(prizeVal) || prizeVal < 0) {
    return res.status(400).json({ message: "prize must be a non-negative integer" });
  }
  if (!Number.isFinite(Number(product_id))) {
    return res.status(400).json({ message: "product_id is required (number)" });
  }
  const productId = Number(product_id);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // --- HARD BLOCK: if any waitlist rows already in_progress for this product & mode='heist'
    const [[busy]] = await conn.query(
      `SELECT COUNT(*) AS cnt
         FROM bids_waitlist
        WHERE product_id = ? AND mode = 'heist' AND status = 'in_progress'`,
      [productId]
    );
    if (Number(busy.cnt) > 0) {
      await conn.rollback();
      return res.status(409).json({
        message: "Heist already being processed for this product (waitlist in_progress). Finish or cancel before creating another."
      });
    }

    // Create heist (status 'pending'), saving product_id
    const [insHeist] = await conn.query(
      `INSERT INTO heist
         (name, story, question, answer, min_users, ticket_price, prize, category, status, prize_name, prize_image, product_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NULL, ?)`,
      [name, story, question, answer, minUsers, ticket, prizeVal, category.toLowerCase(), prize_name, productId]
    );
    const heistId = insHeist.insertId;

    // Seed participants from waitlist (mode='heist', status='queued')
    const [waiters] = await conn.query(
      `SELECT DISTINCT user_id
         FROM bids_waitlist
        WHERE product_id = ? AND mode = 'heist' AND status = 'queued'`,
      [productId]
    );

    if (waiters.length) {
      const users = [...new Set(waiters.map(r => Number(r.user_id)))];
      const vals = users.map(uid => [heistId, uid]);
      await conn.query(
        `INSERT IGNORE INTO heist_participants (heist_id, user_id)
         VALUES ${vals.map(()=>'(?, ?)').join(',')}`,
        vals.flat()
      );

      if (update_waitlist) {
        try {
          await conn.query(
            `UPDATE bids_waitlist SET status='in_progress'
              WHERE product_id=? AND mode='heist' AND status='queued'
                AND user_id IN (${users.map(()=>'?').join(',')})`,
            [productId, ...users]
          );
        } catch (_) { /* ignore if enum/value doesn't exist */ }
      }
    }

    await conn.commit();
    return res.status(201).json({
      message: "Heist created successfully from waitlist",
      id: heistId,
      product_id: productId
    });
  } catch (err) {
    await conn.rollback();
    console.error("POST /admin/heists/from-waitlist error:", err);
    return res.status(500).json({ error: "Error creating heist from waitlist.", details: err.message });
  } finally {
    conn.release();
  }
});
// POST /api/admin/waitlist/cancel
router.post('/waitlist/cancel', authenticateToken, authenticateAdmin, async (req, res) => {
  const productId = Number(req.body.product_id);
  const mode = String(req.body.mode || '').toLowerCase();

  if (!Number.isFinite(productId)) {
    return res.status(400).json({ message: 'product_id is required (number)' });
  }
  if (!['auction', 'heist'].includes(mode)) {
    return res.status(400).json({ message: "mode must be 'auction' or 'heist'" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock eligible waitlist rows to avoid race conditions
    const [rows] = await conn.query(
      `SELECT id, user_id, bid_locked
         FROM bids_waitlist
        WHERE product_id = ?
          AND mode = ?
          AND status IN ('queued','in_progress')
        FOR UPDATE`,
      [productId, mode]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        message: 'No cancellable waitlist entries found for this product/mode (only queued or in_progress are eligible).',
        product_id: productId,
        mode
      });
    }

    // Aggregate refunds per user
    const perUser = new Map(); // user_id -> sum(bid_locked)
    let totalRefund = 0;

    for (const r of rows) {
      const uid = Number(r.user_id);
      const amt = Number(r.bid_locked) || 0;
      if (!perUser.has(uid)) perUser.set(uid, 0);
      perUser.set(uid, perUser.get(uid) + amt);
      totalRefund += amt;
    }

    // Refund users (lock user rows for update)
    for (const [uid, refund] of perUser.entries()) {
      await conn.query(
        `UPDATE users
            SET bid_points = bid_points + ?
          WHERE id = ?
          LIMIT 1`,
        [refund, uid]
      );
    }

    // Mark the selected waitlist entries as cancelled
    const ids = rows.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');
    await conn.query(
      `UPDATE bids_waitlist
          SET status = 'cancelled'
        WHERE id IN (${placeholders})`,
      ids
    );

    await conn.commit();

    // Build response summary
    const refunds = Array.from(perUser.entries()).map(([user_id, amount]) => ({
      user_id,
      refunded: amount
    }));

    return res.status(200).json({
      message: 'Waitlist cancelled and bid_points refunded.',
      product_id: productId,
      mode,
      cancelled_entries: rows.length,
      total_refunded: totalRefund,
      refunds
    });
  } catch (err) {
    await conn.rollback();
    console.error('POST /admin/waitlist/cancel error:', err);
    return res.status(500).json({ message: 'Failed to cancel waitlist and refund', error: err.message });
  } finally {
    conn.release();
  }
});


// ================== ADMIN: ORDERS ==================
// GET /api/admin/orders?status=&userId=&limit=&offset=
router.get('/orders', authenticateToken, authenticateAdmin, async (req, res) => {
  const status = (req.query.status || '').toString().toLowerCase();
  const userId = req.query.userId ? Number(req.query.userId) : null;

  if (status && !['pending','paid','processing','in_transit','delivered','cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status filter' });
  }

  const limit  = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
  const offset = Math.max(0, Number(req.query.offset || 0));

  try {
    const where = [];
    const params = [];
    if (status) { where.push('o.status = ?'); params.push(status); }
    if (Number.isFinite(userId)) { where.push('o.user_id = ?'); params.push(userId); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT
         o.id, o.user_id, o.customer_name, o.phone_number, o.address, o.notes,
         o.subtotal, o.items_count, o.status,
         o.tracking_number, o.carrier, o.expected_delivery,
         o.created_at, o.updated_at,
         u.username, u.full_name, u.email
       FROM shop_orders o
       JOIN users u ON u.id = o.user_id
       ${whereSql}
       ORDER BY o.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ limit, offset, items: rows });
  } catch (err) {
    console.error('GET /admin/orders error:', err);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});
// GET /api/admin/orders/:id
router.get('/orders/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid order id' });

  try {
    const [[order]] = await pool.query(
      `SELECT
         o.id, o.user_id, o.customer_name, o.phone_number, o.address, o.notes,
         o.subtotal, o.items_count, o.status,
         o.tracking_number, o.carrier, o.expected_delivery,
         o.created_at, o.updated_at,
         u.username, u.full_name, u.email
       FROM shop_orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.id = ?
       LIMIT 1`,
      [id]
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
    console.error('GET /admin/orders/:id error:', err);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});
// PATCH /api/admin/orders/:id/status
router.patch('/orders/:id/status', authenticateToken, authenticateAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid order id' });

  const updates = [];
  const params  = [];

  if (req.body.status !== undefined) {
    const status = String(req.body.status || '').toLowerCase();
    if (!['pending','paid','processing','in_transit','delivered','cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    updates.push('status = ?'); params.push(status);
  }

  if (req.body.tracking_number !== undefined) {
    updates.push('tracking_number = ?'); params.push(String(req.body.tracking_number || '').trim() || null);
  }
  if (req.body.carrier !== undefined) {
    updates.push('carrier = ?'); params.push(String(req.body.carrier || '').trim() || null);
  }
  if (req.body.expected_delivery !== undefined) {
    const ed = String(req.body.expected_delivery || '').trim();
    updates.push('expected_delivery = ?'); params.push(ed || null);
  }

  if (updates.length === 0) return res.status(400).json({ message: 'No valid fields to update' });

  try {
    params.push(id);
    const [result] = await pool.query(
      `UPDATE shop_orders
          SET ${updates.join(', ')}
        WHERE id = ?`,
      params
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Order not found' });

    res.json({ id, message: 'Order updated' });
  } catch (err) {
    console.error('PATCH /admin/orders/:id/status error:', err);
    res.status(500).json({ message: 'Failed to update order' });
  }
});

// GET /api/admin/favorites/summary
router.get('/favorites/summary', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    if (categoryId && !Number.isFinite(categoryId)) {
      return res.status(400).json({ message: 'Invalid categoryId' });
    }
    const limit  = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
    const offset = Math.max(0, Number(req.query.offset || 0));

    const where = [];
    const params = [];

    // If filtered by category, go via product_categories
    const categoryJoin = categoryId
      ? 'JOIN product_categories pc ON pc.product_id = p.id'
      : 'LEFT JOIN product_categories pc ON pc.product_id = p.id';

    if (categoryId) {
      where.push('pc.category_id = ?');
      params.push(categoryId);
    }

    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    const [rows] = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.image_path,
         p.cash_price,
         p.auction_price,
         p.heist_price,
         p.created_at,
         p.is_featured,
         COUNT(pf.id)                      AS favorite_count,
         COUNT(DISTINCT pf.user_id)        AS distinct_users,
         GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') AS categories
       FROM products p
       LEFT JOIN product_favorites pf ON pf.product_id = p.id
       ${categoryJoin}
       LEFT JOIN categories c ON c.id = pc.category_id
       ${whereSql}
       GROUP BY p.id
       ORDER BY favorite_count DESC, p.name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json(
      rows.map(r => ({
        ...r,
        favorite_count: Number(r.favorite_count) || 0,
        distinct_users: Number(r.distinct_users) || 0,
        image_url: absUrl(req, r.image_path),
      }))
    );
  } catch (err) {
    console.error('GET /admin/favorites/summary error:', err);
    res.status(500).json({ message: 'Failed to fetch favorites summary' });
  }
});
// GET /api/admin/products/:productId/favorites
router.get('/products/:productId/favorites', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isFinite(productId)) return res.status(400).json({ message: 'Invalid productId' });

    const limit  = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
    const offset = Math.max(0, Number(req.query.offset || 0));

    // quick aggregate for counts
    const [[agg]] = await pool.query(
      `SELECT COUNT(*) AS favorite_count, COUNT(DISTINCT user_id) AS distinct_users
         FROM product_favorites
        WHERE product_id = ?`,
      [productId]
    );

    // product meta
    const [[p]] = await pool.query(
      `SELECT id, name, image_path FROM products WHERE id = ? LIMIT 1`,
      [productId]
    );
    if (!p) return res.status(404).json({ message: 'Product not found' });

    // paged users who favorited
    const [rows] = await pool.query(
      `SELECT
         pf.id         AS favorite_id,
         pf.created_at AS favorited_at,
         u.id          AS user_id,
         u.full_name   AS user_name,
         u.username    AS user_username,
         u.email       AS user_email
       FROM product_favorites pf
       JOIN users u ON u.id = pf.user_id
       WHERE pf.product_id = ?
       ORDER BY pf.created_at DESC
       LIMIT ? OFFSET ?`,
      [productId, limit, offset]
    );

    res.json({
      product: { id: p.id, name: p.name, image_url: absUrl(req, p.image_path) },
      counts: {
        favorite_count: Number(agg?.favorite_count || 0),
        distinct_users: Number(agg?.distinct_users || 0)
      },
      limit,
      offset,
      items: rows
    });
  } catch (err) {
    console.error('GET /admin/products/:productId/favorites error:', err);
    res.status(500).json({ message: 'Failed to fetch product favorites' });
  }
});

// POST - Create Banner
router.post("/banners",authenticateToken,authenticateAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { action_name, action_url, is_active = 1, sort_order = 0 } = req.body;

      if (!action_name || !action_url) {
        return res.status(400).json({ message: "action_name and action_url required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Image is required" });
      }

      const image_path = req.file.path || req.file.filename;

      const [result] = await pool.query(
        `INSERT INTO banners (action_name, action_url, image_path, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
        [action_name, action_url, image_path, is_active, sort_order]
      );

      return res.status(201).json({
        message: "Banner created",
        banner: {
          id: result.insertId,
          action_name,
          action_url,
          image_url: absUrl(req, image_path),
          is_active,
          sort_order
        }
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Error creating banner" });
    }
  }
);
// GET - All Banners (Admin)
router.get("/banners",authenticateToken,authenticateAdmin,
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT * FROM banners ORDER BY sort_order ASC, id DESC`
      );

      const host = `${req.protocol}://${req.get("host")}`;

      const banners = rows.map((b) => {
        const raw = String(b.image_path || "");

        // If DB already stores "/uploads/xxx.jpg" keep it
        if (raw.startsWith("/uploads/")) {
          return {
            ...b,
            image_path: raw,
            image_url: `${host}${raw}`,
          };
        }

        // If DB stores full path like ".../uploads/xxx.jpg" OR "C:\...\uploads\xxx.jpg"
        const fileName = raw ? path.basename(raw) : "";

        const publicPath = fileName ? `/uploads/${fileName}` : null;

        return {
          ...b,
          image_path: publicPath,              // ✅ now clean
          image_url: publicPath ? `${host}${publicPath}` : null, // ✅ usable in <img src="">
        };
      });

      return res.status(200).json({ banners });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Error fetching banners" });
    }
  }
);
// GET - Banner By ID
router.get("/banners/:id",authenticateToken,authenticateAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const [rows] = await pool.query(
        `SELECT * FROM banners WHERE id = ? LIMIT 1`,
        [id]
      );

      if (!rows.length) {
        return res.status(404).json({ message: "Banner not found" });
      }

      const raw = String(rows[0].image_path || "");

      const host = `${req.protocol}://${req.get("host")}`;

      let publicPath = null;

      if (raw.startsWith("/uploads/")) {
        // Already clean
        publicPath = raw;
      } else if (raw) {
        // Extract filename from full system path
        const fileName = path.basename(raw);
        publicPath = `/uploads/${fileName}`;
      }

      const banner = {
        ...rows[0],
        image_path: publicPath, // ✅ clean path only
        image_url: publicPath ? `${host}${publicPath}` : null, // ✅ full usable URL
      };

      return res.status(200).json({ banner });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Error fetching banner" });
    }
  }
);
// PUT - Update Banner
router.put("/banners/:id",authenticateToken,authenticateAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { action_name, action_url, is_active, sort_order } = req.body;

      const [existing] = await pool.query(
        `SELECT * FROM banners WHERE id = ? LIMIT 1`,
        [id]
      );

      if (!existing.length) {
        return res.status(404).json({ message: "Banner not found" });
      }

      const banner = existing[0];

      const newImagePath = req.file
        ? (req.file.path || req.file.filename)
        : banner.image_path;

      await pool.query(
        `UPDATE banners
         SET action_name = ?, action_url = ?, image_path = ?, is_active = ?, sort_order = ?
         WHERE id = ?`,
        [
          action_name || banner.action_name,
          action_url || banner.action_url,
          newImagePath,
          is_active !== undefined ? is_active : banner.is_active,
          sort_order !== undefined ? sort_order : banner.sort_order,
          id
        ]
      );

      res.status(200).json({
        message: "Banner updated",
        banner: {
          id,
          action_name: action_name || banner.action_name,
          action_url: action_url || banner.action_url,
          image_url: absUrl(req, newImagePath),
          is_active: is_active !== undefined ? is_active : banner.is_active,
          sort_order: sort_order !== undefined ? sort_order : banner.sort_order
        }
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error updating banner" });
    }
  }
);
// DELETE - Banner
router.delete("/banners/:id",authenticateToken,authenticateAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const [result] = await pool.query(
        `DELETE FROM banners WHERE id = ?`,
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Banner not found" });
      }

      res.status(200).json({ message: "Banner deleted" });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error deleting banner" });
    }
  }
);

module.exports = router;
